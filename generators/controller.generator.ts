import { OpenAPIV3 } from "openapi-types";
import { Project, Scope, SourceFile } from "ts-morph";
import { IGenerator } from "../interfaces/core";

// Import extracted helpers
import {
  groupOperationsByTag,
  getOperationName,
  buildEndpointDecoratorName,
  buildResourceName,
  buildControllerClassName,
  buildServiceInterfaceName,
  HttpMethod,
} from "../src/utils/operation-helpers";
import {
  buildHttpRoute,
  sanitizeParamName,
  mapParameterLocation,
  inferParameterType,
  buildControllerBasePath,
} from "../src/utils/route-helpers";
import {
  extractBodyDtoName,
  extractResponseDtoName,
} from "../src/utils/schema-helpers";
import { capitalize, buildDtoImportPath } from "../src/utils/formatting-helpers";
import { isParameterObject } from "../src/utils/type-guards";

export class ControllerGenerator implements IGenerator {
  constructor() {}

  public generate(document: OpenAPIV3.Document, project: Project): void {
    if (!document.paths) return;

    const grouped = groupOperationsByTag(document.paths);

    for (const [tagName, operations] of Object.entries(grouped)) {
      const resourceName = buildResourceName(tagName);
      const className = buildControllerClassName(resourceName);
      const serviceInterfaceName = buildServiceInterfaceName(resourceName);

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
          {
            name: "Controller",
            arguments: [`'${buildControllerBasePath(tagName)}'`],
          },
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

        const methodName = getOperationName(
          operation,
          resourceName,
          httpMethod,
        );

        // We calculate DTOs to define the Controller Signature, but we don't decorate with them
        const bodyDto = extractBodyDtoName(
          operation.requestBody as OpenAPIV3.RequestBodyObject | undefined,
        );
        const responseDto = extractResponseDtoName(operation.responses);

        // Imports for DTOs (used in TS types)
        if (bodyDto) {
          this.addDtoImport(sourceFile, bodyDto);
        }
        if (responseDto && responseDto !== "any" && responseDto !== "void") {
          const cleanDto = responseDto.replace("[]", "");
          this.addDtoImport(sourceFile, cleanDto);
        }

        // 4. Update Interface
        serviceInterface.addMethod({
          name: methodName,
          parameters: [{ name: "...args", type: "any[]" }],
          returnType: `Promise<${responseDto}>`,
        });

        // --- Generate the Endpoint Decorator Name ---
        const endpointDecoratorName = buildEndpointDecoratorName(methodName);

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
              name: capitalize(httpMethod),
              arguments: [`'${buildHttpRoute(path)}'`],
            },
            { name: endpointDecoratorName, arguments: [] },
          ],
        });

        // 6. Parameters (Routing Injection)
        const methodCallArgs: string[] = [];
        const addedParams = new Set<string>();

        if (operation.parameters) {
          for (const param of operation.parameters) {
            // Use type guard to safely access parameter properties
            if (!isParameterObject(param)) {
              continue;
            }

            const sanitized = sanitizeParamName(param.name);
            if (addedParams.has(sanitized)) continue;
            addedParams.add(sanitized);

            const decoratorName = mapParameterLocation(param.in);
            const paramType = inferParameterType(param.schema);

            methodDecl.addParameter({
              name: sanitized,
              type: paramType,
              decorators: [
                { name: decoratorName, arguments: [`'${param.name}'`] },
              ],
            });

            methodCallArgs.push(sanitized);
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

  // Helper to add DTO imports (inline logic, not complex enough to extract)
  private addDtoImport(sourceFile: SourceFile, dtoName: string): void {
    if (dtoName === "any" || dtoName === "void") return;

    const cleanName = dtoName.replace("[]", "");
    const importPath = buildDtoImportPath(cleanName);

    // Check if import already exists
    const existingImport = sourceFile.getImportDeclaration(
      (d) => d.getModuleSpecifierValue() === importPath,
    );

    if (!existingImport) {
      sourceFile.addImportDeclaration({
        namedImports: [cleanName],
        moduleSpecifier: importPath,
      });
    }
  }
}
