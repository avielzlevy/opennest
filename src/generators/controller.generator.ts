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
} from "../utils/operation-helpers";
import {
  buildHttpRoute,
  sanitizeParamName,
  mapParameterLocation,
  inferParameterType,
  buildControllerBasePath,
} from "../utils/route-helpers";
import {
  extractBodyDtoName,
  extractResponseDtoName,
  type SchemaMap,
} from "../utils/schema-helpers";
import { capitalize, buildDtoImportPath } from "../utils/formatting-helpers";
import {
  isParameterObject,
  isMultipartFormContent,
  isBinaryResponse,
  isImpliedFileUpload,
  isBinaryBodyContent,
  isSchemaObject,
  hasProperties,
} from "../utils/type-guards";
import {
  OutputStructureConfig,
  resolveOutputPath,
  extractResourceNameFromTag,
} from "../utils/output-structure-manager";
import { ControllerAnnotator } from "./controller-annotator";
import type { RelationshipGraph } from "../analyzers/relationship-types";

export class ControllerGenerator implements IGenerator {
  constructor() {}

  /**
   * Generates controller classes from OpenAPI document
   *
   * @param document OpenAPI document to generate from
   * @param project ts-morph Project for code generation
   * @param outputPath Output directory path
   * @param config Optional output structure configuration
   * @param graph Optional RelationshipGraph for JSDoc annotation
   */
  public generate(
    document: OpenAPIV3.Document,
    project: Project,
    outputPath: string = "./generated",
    config?: OutputStructureConfig,
    graph?: RelationshipGraph,
  ): void {
    if (!document.paths) return;

    // Create annotator if graph provided
    let annotator: ControllerAnnotator | undefined;
    if (graph) {
      annotator = new ControllerAnnotator(graph, document);
    }

    const grouped = groupOperationsByTag(document.paths);
    const schemas: SchemaMap = document.components?.schemas as SchemaMap;

    for (const [tagName, operations] of Object.entries(grouped)) {
      const resourceName = buildResourceName(tagName);
      const className = buildControllerClassName(resourceName);
      const serviceInterfaceName = buildServiceInterfaceName(resourceName);

      // Resolve output path based on structure configuration
      // Use lowercase resourceName for backward compatibility in type-based mode
      const controllerPath = resolveOutputPath(
        outputPath || "generated",
        "controllers",
        resourceName.toLowerCase(),
        config || { structure: "type-based" },
      );

      const sourceFile = project.createSourceFile(controllerPath, "", {
        overwrite: true,
      });

      // --- Imports ---
      // NestJS imports remain for Routing and DI
      const commonImports = [
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
      ];

      // Check for file uploads or binary responses in ANY operation of this controller
      let hasFileUpload = false;
      let hasBinaryResponse = false;
      for (const op of operations) {
        const opContent = (op.operation.requestBody as OpenAPIV3.RequestBodyObject)?.content;
        if (
          isMultipartFormContent(opContent) ||
          isImpliedFileUpload(op.operation) ||
          isBinaryBodyContent(opContent) !== null
        ) {
          hasFileUpload = true;
        }
        if (isBinaryResponse(op.operation.responses)) {
          hasBinaryResponse = true;
        }
      }

      if (hasFileUpload) {
        commonImports.push("UseInterceptors", "UploadedFile");
        sourceFile.addImportDeclaration({
          namedImports: ["FileInterceptor"],
          moduleSpecifier: "@nestjs/platform-express",
        });
      }

      if (hasBinaryResponse) {
        commonImports.push("Res");
        sourceFile.addImportDeclaration({
          namedImports: ["Response"],
          moduleSpecifier: "express",
        });
      }

      sourceFile.addImportDeclaration({
        namedImports: commonImports,
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
          schemas,
        );
        const responseDto = extractResponseDtoName(
          operation.responses,
          schemas,
        );

        // Imports for DTOs (used in TS types)
        if (bodyDto) {
          const cleanBodyDto = bodyDto.replace("[]", "");
          this.addDtoImport(sourceFile, cleanBodyDto);
        }
        if (responseDto && responseDto !== "any" && responseDto !== "void") {
          const cleanDto = responseDto.replace("[]", "");
          this.addDtoImport(sourceFile, cleanDto);
        }

        // 4. Update Interface
        // Build proper parameter types for service interface
        const interfaceParams: Array<{
          name: string;
          type: string;
          hasQuestionToken?: boolean;
        }> = [];

        if (operation.parameters) {
          for (const param of operation.parameters) {
            if (!isParameterObject(param)) continue;
            const sanitized = sanitizeParamName(param.name);
            const paramType = inferParameterType(param.schema, {
              resourceName,
              paramName: param.name,
              schemas,
            });
            const isOptional =
              (param.in === "query" || param.in === "header") &&
              !param.required;

            // If paramType is an enum type (not a primitive), add DTO import
            if (!["string", "number", "boolean"].includes(paramType)) {
              this.addDtoImport(sourceFile, resourceName, paramType);
            }

            interfaceParams.push({
              name: sanitized,
              type: paramType,
              hasQuestionToken: isOptional,
            });
          }
        }

        if (bodyDto) {
          interfaceParams.push({ name: "body", type: bodyDto });
        }

        const opRequestContent = (operation.requestBody as OpenAPIV3.RequestBodyObject)?.content;
        const binaryMediaType = isBinaryBodyContent(opRequestContent);
        const isMultipart =
          isMultipartFormContent(opRequestContent) ||
          isImpliedFileUpload(operation) ||
          binaryMediaType !== null;
        const isBinary = isBinaryResponse(operation.responses);

        // Determine the actual file field name from the multipart schema
        let fileFieldName = "file";
        if (isMultipart && !binaryMediaType) {
          const multipartSchema = opRequestContent?.["multipart/form-data"]?.schema;
          if (hasProperties(multipartSchema)) {
            for (const [propName, propSchema] of Object.entries(multipartSchema.properties)) {
              if (
                isSchemaObject(propSchema) &&
                propSchema.format === "binary"
              ) {
                fileFieldName = propName;
                break;
              }
              // Also check array items with format: binary
              if (
                isSchemaObject(propSchema) &&
                propSchema.type === "array" &&
                isSchemaObject(propSchema.items) &&
                propSchema.items.format === "binary"
              ) {
                fileFieldName = propName;
                break;
              }
            }
          }
        }

        if (isMultipart) {
          interfaceParams.push({ name: "file", type: "any" });
        }

        if (isBinary) {
          interfaceParams.push({ name: "res", type: "Response" });
        }

        // Sort: required params first, optional params last (TS requires this)
        interfaceParams.sort((a, b) => {
          const aOpt = a.hasQuestionToken ? 1 : 0;
          const bOpt = b.hasQuestionToken ? 1 : 0;
          return aOpt - bOpt;
        });

        serviceInterface.addMethod({
          name: methodName,
          parameters:
            interfaceParams.length > 0
              ? interfaceParams
              : [{ name: "data", type: "unknown", hasQuestionToken: true }],
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
        const methodDecorators: any[] = [
          {
            name: capitalize(httpMethod),
            arguments: [`'${buildHttpRoute(path)}'`],
          },
          { name: endpointDecoratorName, arguments: [] },
        ];

        if (isMultipart) {
          methodDecorators.push({
            name: "UseInterceptors",
            arguments: [`FileInterceptor('${fileFieldName}')`],
          });
        }

        const methodDecl = controllerClass.addMethod({
          name: methodName,
          isAsync: true,
          returnType: `Promise<${isBinary ? "any" : responseDto}>`,
          decorators: methodDecorators,
        });

        // Add JSDoc for description and summary
        const controllerJsDoc: string[] = [];
        if (operation.summary) {
          controllerJsDoc.push(`@summary ${operation.summary}`);
        }
        if (operation.description) {
          controllerJsDoc.push(`@description ${operation.description}`);
        }
        if (controllerJsDoc.length > 0) {
          methodDecl.addJsDoc({
            description: controllerJsDoc.join("\n"),
          });
        }

        // 6. Parameters (Routing Injection)
        // Collect all params first, then sort required-before-optional to satisfy TS
        const methodCallArgs: string[] = [];
        const addedParams = new Set<string>();

        interface CollectedParam {
          sanitized: string;
          paramType: string;
          isOptional: boolean;
          decoratorName: string;
          originalName: string;
        }
        const collectedParams: CollectedParam[] = [];

        if (operation.parameters) {
          for (const param of operation.parameters) {
            if (!isParameterObject(param)) {
              continue;
            }

            const sanitized = sanitizeParamName(param.name);
            if (addedParams.has(sanitized)) continue;
            addedParams.add(sanitized);

            const decoratorName = mapParameterLocation(param.in);
            const paramType = inferParameterType(param.schema, {
              resourceName,
              paramName: param.name,
              schemas,
            });
            const isOptional =
              (param.in === "query" || param.in === "header") &&
              !param.required;

            collectedParams.push({
              sanitized,
              paramType,
              isOptional,
              decoratorName,
              originalName: param.name,
            });
          }
        }

        // Sort: required params first, optional params last
        collectedParams.sort((a, b) => {
          const aOpt = a.isOptional ? 1 : 0;
          const bOpt = b.isOptional ? 1 : 0;
          return aOpt - bOpt;
        });

        // Track used param names for the method call to ensure order matches interface
        const sortedCallParams: string[] = [];
        for (const cp of collectedParams) {
          sortedCallParams.push(cp.sanitized);
        }
        if (bodyDto) sortedCallParams.push("body");
        if (isMultipart) sortedCallParams.push("file");
        if (isBinary) sortedCallParams.push("res");

        // Sort based on interface order (required first)
        const finalMethodCallArgs = sortedCallParams.sort((a, b) => {
          const aParam = interfaceParams.find((p) => p.name === a);
          const bParam = interfaceParams.find((p) => p.name === b);
          const aOpt = aParam?.hasQuestionToken ? 1 : 0;
          const bOpt = bParam?.hasQuestionToken ? 1 : 0;
          return aOpt - bOpt;
        });

        for (const cp of collectedParams) {
          methodDecl.addParameter({
            name: cp.sanitized,
            type: cp.paramType,
            hasQuestionToken: cp.isOptional,
            decorators: [
              { name: cp.decoratorName, arguments: [`'${cp.originalName}'`] },
            ],
          });
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

        if (isMultipart) {
          methodDecl.addParameter({
            name: "file",
            type: "any",
            decorators: [{ name: "UploadedFile", arguments: [] }],
          });
          methodCallArgs.push("file");
        }

        if (isBinary) {
          methodDecl.addParameter({
            name: "res",
            type: "Response",
            decorators: [{ name: "Res", arguments: [] }],
          });
        }

        methodDecl.setBodyText(
          `return this.service.${methodName}(${finalMethodCallArgs.join(", ")});`,
        );
      }

      sourceFile.organizeImports();

      // Apply annotations if graph provided and entity is in graph
      if (annotator && graph && graph.entities.has(resourceName)) {
        annotator.annotate(sourceFile, resourceName);
      }
    }
  }

  /**
   * Adds a DTO import to the source file.
   * When called with just dtoName, imports dtoName from its own DTO file.
   * When called with resourceName and namedImport, imports namedImport from the resource's DTO file.
   */
  private addDtoImport(sourceFile: SourceFile, dtoNameOrResource: string, namedImport?: string): void {
    const isEnumImport = namedImport !== undefined;
    const cleanDtoName = isEnumImport ? dtoNameOrResource : dtoNameOrResource.replace("[]", "");
    const importName = isEnumImport ? namedImport : cleanDtoName;

    if (importName === "any" || importName === "void") return;

    const importPath = buildDtoImportPath(cleanDtoName);

    // Check if import already exists for this module
    const existingImport = sourceFile.getImportDeclaration(
      (d) => d.getModuleSpecifierValue() === importPath,
    );

    if (existingImport) {
      // Add the named import if not already present
      const existingNames = existingImport.getNamedImports().map(n => n.getName());
      if (!existingNames.includes(importName)) {
        existingImport.addNamedImport(importName);
      }
    } else {
      sourceFile.addImportDeclaration({
        namedImports: [importName],
        moduleSpecifier: importPath,
      });
    }
  }
}
