import { OpenAPIV3 } from "openapi-types";
import { Project, SourceFile } from "ts-morph";
import { IGenerator } from "../interfaces/core";

// Helper imports
import { groupOperationsByTag, HTTP_METHODS, buildResourceName } from "../utils/operation-helpers";
import {
  extractBodyDtoName,
  extractResponseDtoName,
  type SchemaMap,
} from "../utils/schema-helpers";
import { capitalize, buildDtoImportPath } from "../utils/formatting-helpers";
import {
  isParameterObject,
  isSchemaObject,
  isReferenceObject,
  isArraySchema,
  isMultipartFormContent,
  isImpliedFileUpload,
  isBinaryBodyContent,
  hasProperties,
} from "../utils/type-guards";
import {
  OutputStructureConfig,
  resolveOutputPath,
  extractResourceNameFromTag,
} from "../utils/output-structure-manager";

export class DecoratorGenerator implements IGenerator {
  public generate(
    document: OpenAPIV3.Document,
    project: Project,
    outputPath: string = "./generated",
    config?: OutputStructureConfig,
  ): void {
    if (!document.paths) return;

    const grouped = groupOperationsByTag(document.paths);
    const schemas: SchemaMap = document.components?.schemas as SchemaMap;

    for (const [tagName, operations] of Object.entries(grouped)) {
      const resourceName = buildResourceName(tagName);
      const fileName = resourceName.toLowerCase();

      // Resolve output path based on structure configuration
      // Use fileName (lowercase) for backward compatibility in type-based mode
      const decoratorPath = resolveOutputPath(
        outputPath || "generated",
        "decorators",
        fileName,
        config || { structure: "type-based" },
      );

      const sourceFile = project.createSourceFile(decoratorPath, "", {
        overwrite: true,
      });

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
        const apiOpProps: Record<string, unknown> = {
          summary: operation.summary || "",
          description: operation.description || "",
        };
        if (operation.deprecated) {
          apiOpProps.deprecated = true;
        }
        decoratorArgs.push(
          `ApiOperation(${JSON.stringify(apiOpProps)})`,
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

        // 3. Responses — emit all response codes from the spec
        if (operation.responses) {
          for (const [statusCode, responseObj] of Object.entries(
            operation.responses,
          )) {
            const numericStatus =
              statusCode === "default" ? "default" : parseInt(statusCode, 10);
            const response = responseObj as OpenAPIV3.ResponseObject;
            const description = response.description || "";

            // Check if this response has a typed schema (content with $ref, array, or inline object)
            const responseContent = (response as any).content;
            const jsonContent = responseContent?.["application/json"];
            const schema = jsonContent?.schema;

            if (
              schema &&
              (isReferenceObject(schema) ||
                (isArraySchema(schema) && schema.items) ||
                (schema as any).type === "object" ||
                (schema as any).properties)
            ) {
              // Extract DTO from response schema
              const responseDto = extractResponseDtoName(
                {
                  [statusCode]: response,
                } as OpenAPIV3.ResponsesObject,
                schemas,
              );
              if (responseDto !== "any" && responseDto !== "void") {
                const cleanDto = responseDto.replace("[]", "");
                this.addDtoImport(sourceFile, cleanDto);
                const dtoReference = this.getDtoReference(cleanDto);
                const isArray = responseDto.endsWith("[]");
                if (numericStatus === "default") {
                  decoratorArgs.push(
                    `ApiResponse({ description: '${this.escapeQuotes(description)}', type: ${dtoReference}, isArray: ${isArray} })`,
                  );
                } else {
                  decoratorArgs.push(
                    `ApiResponse({ status: ${numericStatus}, description: '${this.escapeQuotes(description)}', type: ${dtoReference}, isArray: ${isArray} })`,
                  );
                }
                continue;
              }
            }

            // No typed schema — emit description-only response
            if (numericStatus === "default") {
              decoratorArgs.push(
                `ApiResponse({ description: '${this.escapeQuotes(description)}' })`,
              );
            } else {
              decoratorArgs.push(
                `ApiResponse({ status: ${numericStatus}, description: '${this.escapeQuotes(description)}' })`,
              );
            }
          }
        }

        // 4. ApiBody
        const requestBodyContent = (operation.requestBody as OpenAPIV3.RequestBodyObject)?.content;
        const binaryMediaType = isBinaryBodyContent(requestBodyContent);
        const isMultipart =
          isMultipartFormContent(requestBodyContent) || isImpliedFileUpload(operation);

        if (binaryMediaType) {
          // Direct binary content (e.g. image/png, application/octet-stream)
          swaggerImports.add("ApiConsumes");
          decoratorArgs.push(`ApiConsumes('${binaryMediaType}')`);

          swaggerImports.add("ApiBody");
          decoratorArgs.push(`ApiBody({ schema: { type: 'string', format: 'binary' } })`);
        } else if (isMultipart) {
          swaggerImports.add("ApiConsumes");
          decoratorArgs.push(`ApiConsumes('multipart/form-data')`);

          swaggerImports.add("ApiBody");

          // Read actual schema properties from the multipart/form-data requestBody
          const multipartSchema = requestBodyContent?.["multipart/form-data"]?.schema;
          if (hasProperties(multipartSchema)) {
            const propEntries: string[] = [];
            for (const [propName, propSchema] of Object.entries(multipartSchema.properties)) {
              if (isSchemaObject(propSchema)) {
                if (propSchema.type === "array" && isSchemaObject(propSchema.items)) {
                  propEntries.push(`${propName}: { type: 'array', items: { type: '${propSchema.items.type || "string"}'${propSchema.items.format ? `, format: '${propSchema.items.format}'` : ""} } }`);
                } else {
                  propEntries.push(`${propName}: { type: '${propSchema.type || "string"}'${propSchema.format ? `, format: '${propSchema.format}'` : ""} }`);
                }
              } else {
                propEntries.push(`${propName}: { type: 'string' }`);
              }
            }
            decoratorArgs.push(`ApiBody({
            schema: {
              type: 'object',
              properties: {
                ${propEntries.join(",\n                ")},
              },
            },
          })`);
          } else {
            // Fallback: generic file upload schema
            decoratorArgs.push(`ApiBody({
            schema: {
              type: 'object',
              properties: {
                file: {
                  type: 'string',
                  format: 'binary',
                },
              },
            },
          })`);
          }
        } else {
          const bodyDto = extractBodyDtoName(
            operation.requestBody as OpenAPIV3.RequestBodyObject | undefined,
            schemas,
          );
          if (bodyDto && bodyDto !== "any") {
            const cleanBodyDto = bodyDto.replace("[]", "");
            this.addDtoImport(sourceFile, cleanBodyDto);
            const bodyDtoReference = this.getDtoReference(cleanBodyDto);
            const isBodyArray = bodyDto.endsWith("[]");
            swaggerImports.add("ApiBody");
            if (isBodyArray) {
              decoratorArgs.push(
                `ApiBody({ type: ${bodyDtoReference}, isArray: true })`,
              );
            } else {
              decoratorArgs.push(`ApiBody({ type: ${bodyDtoReference} })`);
            }
          }
        }

        // 5. ApiQuery / ApiParam / ApiHeader
        if (operation.parameters) {
          for (const param of operation.parameters) {
            if (!isParameterObject(param)) continue;

            // Determine parameter type and extra properties
            let paramType = "String";
            let isArray = false;
            const paramSchema =
              param.schema && isSchemaObject(param.schema)
                ? param.schema
                : null;

            if (paramSchema) {
              if (paramSchema.type === "array") {
                isArray = true;
                // Item type
                const itemSchema =
                  paramSchema.items && isSchemaObject(paramSchema.items)
                    ? paramSchema.items
                    : null;
                paramType =
                  itemSchema?.type === "integer" ||
                  itemSchema?.type === "number"
                    ? "Number"
                    : "String";
              } else {
                paramType =
                  paramSchema.type === "integer" ||
                  paramSchema.type === "number"
                    ? "Number"
                    : "String";
              }
            }

            // Build property bag
            const props: string[] = [`name: '${param.name}'`];

            if (param.in === "query" || param.in === "header") {
              props.push(`required: ${param.required || false}`);
            }

            if (param.description) {
              props.push(
                `description: '${this.escapeQuotes(param.description)}'`,
              );
            }

            // ApiHeader doesn't support 'type' — only add for query/path
            if (param.in !== "header") {
              if (isArray) {
                props.push(`type: ${paramType}`, `isArray: true`);
              } else {
                props.push(`type: ${paramType}`);
              }
            }

            // Enum values
            if (paramSchema?.enum) {
              props.push(`enum: ${JSON.stringify(paramSchema.enum)}`);
            }

            // Default value (do not add for query params)
            if (param.in !== "query" && paramSchema?.default !== undefined) {
              const defaultVal =
                typeof paramSchema.default === "string"
                  ? `'${this.escapeQuotes(paramSchema.default)}'`
                  : JSON.stringify(paramSchema.default);
              props.push(`default: ${defaultVal}`);
            }

            if (param.in === "query") {
              swaggerImports.add("ApiQuery");
              decoratorArgs.push(`ApiQuery({ ${props.join(", ")} })`);
            } else if (param.in === "path") {
              swaggerImports.add("ApiParam");
              decoratorArgs.push(`ApiParam({ ${props.join(", ")} })`);
            } else if (param.in === "header") {
              swaggerImports.add("ApiHeader");
              decoratorArgs.push(`ApiHeader({ ${props.join(", ")} })`);
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
   * Escapes single quotes in strings for safe inclusion in generated code
   */
  private escapeQuotes(value: string): string {
    return value.replace(/'/g, "\\'");
  }

  /**
   * Reserved names that conflict with NestJS decorators
   */
  private readonly NESTJS_RESERVED_NAMES = [
    "ApiResponse",
    "ApiOperation",
    "ApiBody",
    "ApiParam",
    "ApiQuery",
    "ApiHeader",
    "ApiTags",
    "ApiSecurity",
    "ApiBearerAuth",
    "ApiOAuth2",
    "ApiBasicAuth",
    "ApiCookieAuth",
  ];

  /**
   * Get the reference name for a DTO, using alias if it conflicts with NestJS decorators
   * @param dtoName - The DTO class name
   * @returns The name to use in generated code (either original or aliased)
   */
  private getDtoReference(dtoName: string): string {
    return this.NESTJS_RESERVED_NAMES.includes(dtoName)
      ? `${dtoName}Dto`
      : dtoName;
  }

  /**
   * Adds a DTO import to the source file if not already present.
   * Handles naming conflicts with NestJS decorators by using aliases.
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
      // Use alias if DTO name conflicts with NestJS decorator
      if (this.NESTJS_RESERVED_NAMES.includes(dtoName)) {
        sourceFile.addImportDeclaration({
          namedImports: [{ name: dtoName, alias: `${dtoName}Dto` }],
          moduleSpecifier: importPath,
        });
      } else {
        sourceFile.addImportDeclaration({
          namedImports: [dtoName],
          moduleSpecifier: importPath,
        });
      }
    }
  }
}
