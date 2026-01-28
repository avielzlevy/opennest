import { OpenAPIV3 } from "openapi-types";
import { Project, SourceFile } from "ts-morph";
import { IGenerator } from "../interfaces/core";

// Helper imports
import { groupOperationsByTag, HTTP_METHODS } from "../utils/operation-helpers";
import {
  extractBodyDtoName,
  extractResponseDtoName,
} from "../utils/schema-helpers";
import { capitalize, buildDtoImportPath } from "../utils/formatting-helpers";
import { isParameterObject, isSchemaObject } from "../utils/type-guards";

export class DecoratorGenerator implements IGenerator {
  public generate(
    document: OpenAPIV3.Document,
    project: Project,
    outputPath: string = "./generated",
  ): void {
    if (!document.paths) return;

    const grouped = groupOperationsByTag(document.paths);

    for (const [tagName, operations] of Object.entries(grouped)) {
      const resourceName = tagName.replace(/\s+/g, "");
      const fileName = resourceName.toLowerCase();

      const sourceFile = project.createSourceFile(
        `${outputPath}/decorators/${fileName}.decorator.ts`,
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
        if (baseName.includes("_")) {
          const parts = baseName.split("_");
          baseName = parts[parts.length - 1] || baseName;
        }
        const functionName = `${capitalize(baseName)}Endpoint`;

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
        const responseDto = extractResponseDtoName(operation.responses);
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
        const bodyDto = extractBodyDtoName(
          operation.requestBody as OpenAPIV3.RequestBodyObject | undefined,
        );
        if (bodyDto) {
          this.addDtoImport(sourceFile, bodyDto);
          swaggerImports.add("ApiBody");
          decoratorArgs.push(`ApiBody({ type: ${bodyDto} })`);
        }

        // 5. ApiQuery / ApiParam
        if (operation.parameters) {
          for (const param of operation.parameters) {
            if (!isParameterObject(param)) continue;

            // Determine parameter type
            let paramType = "String";
            if (param.schema && isSchemaObject(param.schema)) {
              paramType =
                param.schema.type === "integer" ||
                param.schema.type === "number"
                  ? "Number"
                  : "String";
            }

            if (param.in === "query") {
              swaggerImports.add("ApiQuery");
              const required = param.required || false;
              decoratorArgs.push(
                `ApiQuery({ name: '${param.name}', required: ${required}, type: ${paramType} })`,
              );
            }
            if (param.in === "path") {
              swaggerImports.add("ApiParam");
              decoratorArgs.push(
                `ApiParam({ name: '${param.name}', type: ${paramType} })`,
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

  /**
   * Adds a DTO import to the source file if not already present.
   *
   * @param sourceFile - The ts-morph source file
   * @param dtoName - The DTO class name to import
   */
  private addDtoImport(sourceFile: SourceFile, dtoName: string): void {
    if (dtoName === "any" || dtoName === "void") return;

    const importPath = buildDtoImportPath(dtoName);

    // Check if import already exists
    const existingImport = sourceFile.getImportDeclaration(
      (d) => d.getModuleSpecifierValue() === importPath,
    );

    if (!existingImport) {
      sourceFile.addImportDeclaration({
        namedImports: [dtoName],
        moduleSpecifier: importPath,
      });
    }
  }
}
