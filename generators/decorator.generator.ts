import { OpenAPIV3 } from "openapi-types";
import { Project } from "ts-morph";
import { IGenerator } from "../interfaces/core";

const HTTP_METHODS = ["get", "post", "put", "delete", "patch"] as const;

export class DecoratorGenerator implements IGenerator {
  public generate(document: OpenAPIV3.Document, project: Project): void {
    if (!document.paths) return;

    const grouped = this.groupOperationsByTag(document.paths);

    for (const [tagName, operations] of Object.entries(grouped)) {
      const resourceName = tagName.replace(/\s+/g, "");
      const fileName = resourceName.toLowerCase();

      const sourceFile = project.createSourceFile(
        `src/decorators/${fileName}.decorator.ts`,
        "",
        { overwrite: true },
      );

      // Imports
      sourceFile.addImportDeclaration({
        namedImports: ["applyDecorators"],
        moduleSpecifier: "@nestjs/common",
      });

      // We gather all Swagger imports we need dynamically
      const swaggerImports = new Set(["ApiOperation", "ApiResponse"]);

      // Common Auth Decorators
      sourceFile.addImportDeclaration({
        namedImports: ["JwtDecorator"],
        moduleSpecifier: "../common/decorators/auth/jwt.decorator",
      });
      sourceFile.addImportDeclaration({
        namedImports: ["ApiKeyDecorator"],
        moduleSpecifier: "../common/decorators/auth/apiKey.decorator",
      });

      for (const op of operations) {
        const { operation } = op;

        // Name: "PreviewCouponEndpoint"
        let baseName = operation.operationId || `${op.method}${resourceName}`;
        if (baseName.includes("_")) baseName = baseName.split("_")[1];
        const functionName = `${this.capitalize(baseName)}Endpoint`;

        // -- Build the applyDecorators arguments --
        const decoratorArgs: string[] = [];

        // 1. ApiOperation
        decoratorArgs.push(
          `ApiOperation(${JSON.stringify({
            summary: operation.summary || "",
            description: operation.description || "",
          })})`,
        );

        // 2. Auth Decorators (Custom ones)
        if (operation.security) {
          // FIX: Explicitly type 's' as OpenAPIV3.SecurityRequirementObject
          const hasBearer = operation.security.some(
            (s: OpenAPIV3.SecurityRequirementObject) =>
              s["bearer"] || s["Bearer"] || s["BearerAuth"],
          );
          if (hasBearer) decoratorArgs.push("JwtDecorator()");

          // FIX: Explicitly type 's' as OpenAPIV3.SecurityRequirementObject
          const hasApiKey = operation.security.some(
            (s: OpenAPIV3.SecurityRequirementObject) =>
              s["Api-Key"] || s["ApiKey"] || s["x-api-key"],
          );
          if (hasApiKey) decoratorArgs.push("ApiKeyDecorator()");
        }

        // 3. Responses
        // Note: In a real world, iterate all codes. Here we focus on success.
        const responseDto = this.extractResponseDto(operation.responses);
        if (responseDto !== "any" && responseDto !== "void") {
          const cleanDto = responseDto.replace("[]", "");
          this.addDtoImport(sourceFile, cleanDto);

          // Check if array
          const isArray = responseDto.endsWith("[]");
          decoratorArgs.push(
            `ApiResponse({ status: 200, type: ${cleanDto}, isArray: ${isArray} })`,
          );
        } else {
          decoratorArgs.push(
            `ApiResponse({ status: 200, description: 'Success' })`,
          );
        }

        // 4. ApiBody
        const bodyDto = this.extractBodyDto(
          operation.requestBody as OpenAPIV3.RequestBodyObject,
        );
        if (bodyDto) {
          this.addDtoImport(sourceFile, bodyDto);
          swaggerImports.add("ApiBody");
          decoratorArgs.push(`ApiBody({ type: ${bodyDto} })`);
        }

        // 5. ApiQuery / ApiParam
        if (operation.parameters) {
          for (const param of operation.parameters as OpenAPIV3.ParameterObject[]) {
            if (param.in === "query") {
              swaggerImports.add("ApiQuery");
              const required = param.required || false;
              const type =
                (param.schema as any).type === "integer" ? "Number" : "String";
              decoratorArgs.push(
                `ApiQuery({ name: '${param.name}', required: ${required}, type: ${type} })`,
              );
            }
            if (param.in === "path") {
              swaggerImports.add("ApiParam");
              const type =
                (param.schema as any).type === "integer" ? "Number" : "String";
              decoratorArgs.push(
                `ApiParam({ name: '${param.name}', type: ${type} })`,
              );
            }
          }
        }

        // Add the exported function
        sourceFile.addFunction({
          name: functionName,
          isExported: true,
          statements: `return applyDecorators(\n  ${decoratorArgs.join(",\n  ")}\n);`,
        });
      }

      // Add accumulated Swagger imports
      sourceFile.addImportDeclaration({
        namedImports: Array.from(swaggerImports),
        moduleSpecifier: "@nestjs/swagger",
      });

      sourceFile.organizeImports();
    }
  }

  // --- Reuse Helpers ---

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
    if (
      !sourceFile.getImportDeclaration((d: any) =>
        d.getModuleSpecifierValue().includes(dtoName),
      )
    ) {
      sourceFile.addImportDeclaration({
        namedImports: [dtoName],
        moduleSpecifier: `../dtos/${dtoName}.dto`,
      });
    }
  }

  private capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
