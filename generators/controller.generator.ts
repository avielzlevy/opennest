import { OpenAPIV3 } from "openapi-types";
import { Project, Scope } from "ts-morph";
import { IGenerator } from "../interfaces/core";

const HTTP_METHODS = ["get", "post", "put", "delete", "patch"] as const;

export class ControllerGenerator implements IGenerator {
  constructor() {}

  public generate(document: OpenAPIV3.Document, project: Project): void {
    if (!document.paths) return;

    const grouped = this.groupOperationsByTag(document.paths);

    for (const [tagName, operations] of Object.entries(grouped)) {
      const resourceName = tagName.replace(/\s+/g, "");
      const className = `${resourceName}Controller`;
      const serviceInterfaceName = `I${resourceName}Service`;

      const sourceFile = project.createSourceFile(
        `src/controllers/${resourceName.toLowerCase()}.controller.ts`,
        "",
        { overwrite: true },
      );

      // --- Imports ---
      // NestJS imports remain for Routing and DI
      sourceFile.addImportDeclaration({
        namedImports: [
          "Controller",
          "Get",
          "Post",
          "Put",
          "Delete",
          "Patch",
          "Body",
          "Param",
          "Query",
          "Headers",
          "Inject",
        ],
        moduleSpecifier: "@nestjs/common",
      });
      // ApiTags stays on the class level (usually preferred there, or move to decorator)
      sourceFile.addImportDeclaration({
        namedImports: ["ApiTags"],
        moduleSpecifier: "@nestjs/swagger",
      });

      // --- Interface ---
      const serviceInterface = sourceFile.addInterface({
        name: serviceInterfaceName,
        isExported: true,
      });

      // --- Class ---
      const controllerClass = sourceFile.addClass({
        name: className,
        isExported: true,
        decorators: [
          { name: "ApiTags", arguments: [`'${tagName}'`] },
          { name: "Controller", arguments: [`'api/${tagName.toLowerCase()}'`] },
        ],
      });

      controllerClass.addConstructor({
        parameters: [
          {
            name: "service",
            type: serviceInterfaceName,
            scope: Scope.Private,
            isReadonly: true,
            decorators: [
              { name: "Inject", arguments: [`'${serviceInterfaceName}'`] },
            ],
          },
        ],
      });

      for (const op of operations) {
        const { method: httpMethod, path, operation } = op;

        let methodName =
          operation.operationId || `${httpMethod}${resourceName}`;
        if (methodName.includes("_")) {
          methodName = methodName.split("_")[1];
        }

        // We calculate DTOs to define the Controller Signature, but we don't decorate with them
        const bodyDto = this.extractBodyDto(
          operation.requestBody as OpenAPIV3.RequestBodyObject,
        );
        const responseDto = this.extractResponseDto(operation.responses);

        // Imports for DTOs (used in TS types)
        if (bodyDto) this.addDtoImport(sourceFile, bodyDto);
        if (responseDto && responseDto !== "any")
          this.addDtoImport(sourceFile, responseDto.replace("[]", ""));

        // 4. Update Interface
        serviceInterface.addMethod({
          name: methodName,
          parameters: [{ name: "...args", type: "any[]" }],
          returnType: `Promise<${responseDto}>`,
        });

        // --- NEW: Generate the Endpoint Decorator Name ---
        const endpointDecoratorName = `${this.capitalize(methodName)}Endpoint`;

        // Import the generated decorator
        sourceFile.addImportDeclaration({
          namedImports: [endpointDecoratorName],
          moduleSpecifier: `../decorators/${resourceName.toLowerCase()}.decorator`,
        });

        // 5. Add Method to Controller
        const methodDecl = controllerClass.addMethod({
          name: methodName,
          isAsync: true,
          returnType: `Promise<${responseDto}>`,
          decorators: [
            {
              name: this.capitalize(httpMethod),
              arguments: [`'${this.cleanPath(path)}'`],
            },
            { name: endpointDecoratorName, arguments: [] }, // <--- THE CLEAN DECORATOR
          ],
        });

        // 6. Parameters (Routing Injection)
        const methodCallArgs: string[] = [];
        const addedParams = new Set<string>();

        if (operation.parameters) {
          for (const param of operation.parameters as OpenAPIV3.ParameterObject[]) {
            const sanitizedParamName = this.sanitizeParamName(param.name);
            if (addedParams.has(sanitizedParamName)) continue;
            addedParams.add(sanitizedParamName);

            let decoratorName = "Query";
            if (param.in === "path") decoratorName = "Param";
            if (param.in === "header") decoratorName = "Headers";

            const paramType =
              (param.schema as OpenAPIV3.SchemaObject).type === "integer"
                ? "number"
                : "string";

            methodDecl.addParameter({
              name: sanitizedParamName,
              type: paramType,
              decorators: [
                { name: decoratorName, arguments: [`'${param.name}'`] },
              ],
            });

            methodCallArgs.push(sanitizedParamName);
          }
        }

        if (bodyDto) {
          if (!addedParams.has("body")) {
            methodDecl.addParameter({
              name: "body",
              type: bodyDto,
              decorators: [{ name: "Body", arguments: [] }],
            });
            methodCallArgs.push("body");
          }
        }

        methodDecl.setBodyText(
          `return this.service.${methodName}(${methodCallArgs.join(", ")});`,
        );
      }

      sourceFile.organizeImports();
    }
  }

  // --- Helpers (Duplicated to allow strict Separation of Concerns) ---

  private groupOperationsByTag(paths: OpenAPIV3.PathsObject) {
    const groups: Record<string, any[]> = {};
    for (const [pathUrl, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue;
      HTTP_METHODS.forEach((method) => {
        const op = pathItem[method];
        if (op) {
          const tag = op.tags?.[0] || "Default";
          if (!groups[tag]) groups[tag] = [];
          groups[tag].push({ method, path: pathUrl, operation: op });
        }
      });
    }
    return groups;
  }

  private cleanPath(path: string): string {
    const parts = path.split("/").filter((p) => p);
    if (parts[0] === "api") parts.shift();
    parts.shift();
    return parts
      .map((p) => (p.startsWith("{") ? `:${p.slice(1, -1)}` : p))
      .join("/");
  }

  private sanitizeParamName(name: string): string {
    return name.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""));
  }

  private extractBodyDto(
    body: OpenAPIV3.RequestBodyObject | undefined,
  ): string | null {
    if (!body?.content?.["application/json"]?.schema) return null;
    const schema = body.content["application/json"]
      .schema as OpenAPIV3.ReferenceObject;
    const ref = schema.$ref ? schema.$ref.split("/").pop()! : null;
    return ref === "Object" ? "ObjectDto" : ref;
  }

  private extractResponseDto(responses: OpenAPIV3.ResponsesObject): string {
    const success = responses["200"] || responses["201"];
    if (!success) return "void";
    if ("content" in success && success.content?.["application/json"]?.schema) {
      const schema = success.content["application/json"].schema as any;
      let refName = "any";
      if (schema.$ref) refName = schema.$ref.split("/").pop()!;
      else if (schema.type === "array" && schema.items.$ref)
        refName = `${schema.items.$ref.split("/").pop()}[]`;
      return refName.replace("Object", "ObjectDto");
    }
    return "any";
  }

  private addDtoImport(sourceFile: any, dtoName: string) {
    if (dtoName === "any" || dtoName === "void") return;
    const cleanName = dtoName.replace("[]", "");
    if (
      !sourceFile.getImportDeclaration((d: any) =>
        d.getModuleSpecifierValue().includes(cleanName),
      )
    ) {
      sourceFile.addImportDeclaration({
        namedImports: [cleanName],
        moduleSpecifier: `../dtos/${cleanName}.dto`,
      });
    }
  }

  private capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
