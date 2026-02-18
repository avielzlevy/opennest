import { OpenAPIV3 } from "openapi-types";
import { Project, SourceFile } from "ts-morph";
import { IGenerator } from "../interfaces/core";

// Import extracted helpers
import {
  groupOperationsByTag,
  getOperationName,
  buildResourceName,
  buildServiceInterfaceName,
  HttpMethod,
} from "../utils/operation-helpers";
import { sanitizeParamName, inferParameterType } from "../utils/route-helpers";
import {
  extractBodyDtoName,
  extractResponseDtoName,
  type SchemaMap,
} from "../utils/schema-helpers";
import { buildDtoImportPath } from "../utils/formatting-helpers";
import {
  isParameterObject,
  isMultipartFormContent,
  isBinaryResponse,
  isImpliedFileUpload,
} from "../utils/type-guards";
import {
  OutputStructureConfig,
  resolveOutputPath,
} from "../utils/output-structure-manager";

export class ServiceGenerator implements IGenerator {
  constructor() {}

  /**
   * Generates service classes from OpenAPI document
   *
   * @param document OpenAPI document to generate from
   * @param project ts-morph Project for code generation
   * @param outputPath Output directory path
   * @param config Optional output structure configuration
   */
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
      const className = `${resourceName}Service`;
      const serviceInterfaceName = buildServiceInterfaceName(resourceName);

      // Resolve output path based on structure configuration
      const servicePath = resolveOutputPath(
        outputPath || "generated",
        "services",
        resourceName.toLowerCase(),
        config || { structure: "type-based" },
      );

      const sourceFile = project.createSourceFile(servicePath, "", {
        overwrite: true,
      });

      // --- Imports ---
      sourceFile.addImportDeclaration({
        namedImports: ["Injectable"],
        moduleSpecifier: "@nestjs/common",
      });

      // Check for binary responses for express import
      let hasBinaryResponse = false;
      for (const op of operations) {
        if (isBinaryResponse(op.operation.responses)) {
          hasBinaryResponse = true;
          break;
        }
      }

      if (hasBinaryResponse) {
        sourceFile.addImportDeclaration({
          namedImports: ["Response"],
          moduleSpecifier: "express",
        });
      }

      // Collect DTOs to import
      const dtosToImport = new Set<string>();

      // First pass: collect all DTOs
      for (const op of operations) {
        const { method: httpMethod, operation } = op;

        const bodyDto = extractBodyDtoName(
          operation.requestBody as OpenAPIV3.RequestBodyObject | undefined,
          schemas,
        );
        const responseDto = extractResponseDtoName(
          operation.responses,
          schemas,
        );

        if (bodyDto) {
          dtosToImport.add(bodyDto);
        }
        if (responseDto && responseDto !== "any" && responseDto !== "void") {
          const cleanDto = responseDto.replace("[]", "");
          dtosToImport.add(cleanDto);
        }
      }

      // Add DTO imports
      for (const dtoName of dtosToImport) {
        this.addDtoImport(sourceFile, dtoName);
      }

      // Import service interface from controller file
      sourceFile.addImportDeclaration({
        namedImports: [serviceInterfaceName],
        moduleSpecifier: `../controllers/${resourceName.toLowerCase()}.controller`,
      });

      // --- Class ---
      const serviceClass = sourceFile.addClass({
        name: className,
        isExported: true,
        decorators: [{ name: "Injectable", arguments: [] }],
        implements: [serviceInterfaceName],
      });

      // Add class-level JSDoc
      serviceClass.addJsDoc({
        description:
          `@ai_service ${className}\n` +
          `@ai_context Stub implementation for the ${resourceName} resource.\n` +
          `AI agents should implement the business logic for each method below.\n` +
          `Each method corresponds to an endpoint in the ${resourceName}Controller.\n` +
          `Use PrismaService (injected via constructor) for database operations.\n\n` +
          `CRITICAL FOR PRISMA IMPLEMENTATION:\n` +
          `1. MAPPING: OpenAPI DTOs use nested objects (e.g., 'category: { id, name }'), Prisma models use foreign keys (e.g., 'categoryId'). You must translate between them.\n` +
          `2. RELATIONS — READS: EVERY query whose result is mapped to a DTO that contains nested objects MUST use 'include'. If you omit 'include', TypeScript will error because the relation fields are missing.\n` +
          `   Example: const pet = await prisma.pet.findUnique({ where: { id }, include: { category: true, tags: { include: { tag: true } } } });\n` +
          `3. RELATIONS — WRITES: Use Prisma's 'connect' syntax to set relations by id.\n` +
          `   Example: category: body.category?.id ? { connect: { id: body.category.id } } : undefined\n` +
          `            tags: body.tags ? { set: [], connectOrCreate: body.tags.map(t => ({ where: { id: t.id ?? 0 }, create: { tag: { connectOrCreate: { where: { id: t.id ?? 0 }, create: { name: t.name } } } } })) } : undefined\n` +
          `4. ID IN UPDATE — CRITICAL: Prisma's UpdateInput is a discriminated union. The 'id' field MUST be completely absent from the 'data' object (not just undefined). ALWAYS build 'data' explicitly without 'id':\n` +
          `   WRONG: const { id, ...data } = body; prisma.pet.update({ where: { id }, data }); // 'id' still present as optional — TS error\n` +
          `   RIGHT: const data = { name: body.name, photoUrls: body.photoUrls, status: body.status, category: ..., tags: ... }; // build data explicitly, never spread the full DTO\n` +
          `5. TYPE CASTING: Prisma returns 'null' for missing DB values; DTOs expect 'undefined'. Use '?? undefined' when mapping Prisma results back to DTOs.\n` +
          `6. STRICT TYPING: Provide explicit types in map() callbacks to avoid implicit-any errors (e.g., 'tags.map((t: { tag: { id: number; name: string | null } }) => ...)').\n\n` +
          `COMPLETE EXAMPLE (updatePet):\n` +
          `const data = {\n` +
          `  name: body.name,\n` +
          `  photoUrls: body.photoUrls,\n` +
          `  status: body.status as PetStatus,\n` +
          `  category: body.category?.id ? { connect: { id: body.category.id } } : undefined,\n` +
          `  tags: body.tags ? { set: [], connectOrCreate: body.tags.map(t => ({ where: { id: t.id ?? 0 }, create: { tag: { connectOrCreate: { where: { id: t.id ?? 0 }, create: { name: t.name } } } } })) } : undefined,\n` +
          `};\n` +
          `const updated = await this.prisma.pet.update({ where: { id: body.id! }, data, include: { category: true, tags: { include: { tag: true } } } });\n` +
          `return { ...updated, status: updated.status ?? undefined, category: updated.category ?? undefined, tags: updated.tags.map((t: { tag: { id: number; name: string | null } }) => ({ id: t.tag.id, name: t.tag.name ?? undefined })) } as Pet;`,
      });

      // --- Methods ---
      for (const op of operations) {
        const { method: httpMethod, path, operation } = op;

        const methodName = getOperationName(
          operation,
          resourceName,
          httpMethod,
        );

        const bodyDto = extractBodyDtoName(
          operation.requestBody as OpenAPIV3.RequestBodyObject | undefined,
          schemas,
        );
        const responseDto = extractResponseDtoName(
          operation.responses,
          schemas,
        );

        // Build method parameters
        const methodParams: Array<{
          name: string;
          type: string;
          hasQuestionToken?: boolean;
          description?: string;
        }> = [];

        if (operation.parameters) {
          for (const param of operation.parameters) {
            if (!isParameterObject(param)) continue;
            const sanitized = sanitizeParamName(param.name);
            const paramType = inferParameterType(param.schema);
            const isOptional =
              (param.in === "query" || param.in === "header") &&
              !param.required;
            methodParams.push({
              name: sanitized,
              type: paramType,
              hasQuestionToken: isOptional,
              description: param.description,
            });
          }
        }

        if (bodyDto) {
          methodParams.push({
            name: "body",
            type: bodyDto,
            description: "The data for the resource",
          });
        }

        const isMultipart =
          isMultipartFormContent(
            (operation.requestBody as OpenAPIV3.RequestBodyObject)?.content,
          ) || isImpliedFileUpload(operation);
        const isBinary = isBinaryResponse(operation.responses);

        if (isMultipart) {
          methodParams.push({
            name: "file",
            type: "any",
            description: "The uploaded file",
          });
        }

        if (isBinary) {
          methodParams.push({
            name: "res",
            type: "Response",
            description: "The express response object for binary streaming",
          });
        }

        // Sort: required params first, optional params last (TS requires this)
        methodParams.sort((a, b) => {
          const aOpt = a.hasQuestionToken ? 1 : 0;
          const bOpt = b.hasQuestionToken ? 1 : 0;
          return aOpt - bOpt;
        });

        // Build JSDoc tags
        const jsDocLines: string[] = [];

        // Add OpenAPI summary and description if present
        if (operation.summary) {
          jsDocLines.push(`@summary ${operation.summary}`);
        }
        if (operation.description) {
          jsDocLines.push(`@description ${operation.description}`);
        }

        // @ai_action tag based on HTTP method
        const actionMap: Record<string, string> = {
          get: `Retrieve ${this.isListOperation(methodName, httpMethod) ? "all" : "a"} ${resourceName} resource${this.isListOperation(methodName, httpMethod) ? "s" : ""}`,
          post: `Create a new ${resourceName} resource`,
          put: `Update an existing ${resourceName} resource`,
          patch: `Partially update an existing ${resourceName} resource`,
          delete: `Delete a ${resourceName} resource`,
        };
        jsDocLines.push(
          `@ai_action ${actionMap[httpMethod] || `Perform ${httpMethod.toUpperCase()} operation on ${resourceName}`}`,
        );

        // @ai_hint tag based on HTTP method
        const hintMap: Record<string, string> = {
          get: `${httpMethod.toUpperCase()} operation - should query the database and return ${this.isListOperation(methodName, httpMethod) ? "a list" : "the resource"}`,
          post: `${httpMethod.toUpperCase()} operation - should validate input, create in database, return created entity`,
          put: `${httpMethod.toUpperCase()} operation - should validate input, update in database, return updated entity`,
          patch: `${httpMethod.toUpperCase()} operation - should validate input, partially update in database, return updated entity`,
          delete: `${httpMethod.toUpperCase()} operation - should remove from database, return confirmation or deleted entity`,
        };
        jsDocLines.push(
          `@ai_hint ${hintMap[httpMethod] || `Implement ${httpMethod.toUpperCase()} operation`}`,
        );

        // @param tags
        if (methodParams.length > 0) {
          for (const param of methodParams) {
            const description =
              param.description ||
              this.getParamDescription(param.name, param.type);
            jsDocLines.push(
              `@param {${param.type}} ${param.name} - ${description}`,
            );
          }
        } else {
          jsDocLines.push(`@param {unknown} [data] - Optional parameters`);
        }

        // @returns tag
        jsDocLines.push(
          `@returns {Promise<${isBinary ? "any" : responseDto}>} ${this.getReturnDescription(httpMethod, responseDto, resourceName)}`,
        );

        // @ai_implements tag
        jsDocLines.push(
          `@ai_implements ${httpMethod.toUpperCase()} ${path} -> ${resourceName}Controller.${methodName}`,
        );

        // @throws tags based on HTTP method
        const throwsMap: Record<string, string[]> = {
          get: ["@throws {NotFoundException} If resource not found"],
          post: [
            "@throws {BadRequestException} If validation fails",
            "@throws {ConflictException} If resource already exists",
          ],
          put: [
            "@throws {NotFoundException} If resource not found",
            "@throws {BadRequestException} If validation fails",
          ],
          patch: [
            "@throws {NotFoundException} If resource not found",
            "@throws {BadRequestException} If validation fails",
          ],
          delete: ["@throws {NotFoundException} If resource not found"],
        };
        if (throwsMap[httpMethod]) {
          throwsMap[httpMethod].forEach((t) => jsDocLines.push(t));
        }

        // Add method with JSDoc
        const method = serviceClass.addMethod({
          name: methodName,
          isAsync: true,
          returnType: `Promise<${isBinary ? "any" : responseDto}>`,
          parameters:
            methodParams.length > 0
              ? methodParams
              : [{ name: "data", type: "unknown", hasQuestionToken: true }],
        });

        // Add JSDoc to method
        method.addJsDoc({
          description: jsDocLines.join("\n"),
        });

        // Method body
        method.setBodyText(
          `// TODO: Implement - ${actionMap[httpMethod] || `perform ${httpMethod} operation`}\nthrow new Error('${methodName} not implemented');`,
        );
      }

      sourceFile.organizeImports();
    }
  }

  /**
   * Helper to add DTO imports
   */
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

  /**
   * Determines if an operation is a list operation (returns array)
   */
  private isListOperation(methodName: string, httpMethod: string): boolean {
    if (httpMethod !== "get") return false;
    const listKeywords = ["list", "getAll", "findAll", "search", "query"];
    return listKeywords.some((keyword) =>
      methodName.toLowerCase().includes(keyword.toLowerCase()),
    );
  }

  /**
   * Gets a description for a parameter
   */
  private getParamDescription(paramName: string, paramType: string): string {
    if (paramName === "body") {
      return "The data for the resource";
    }
    if (paramName.toLowerCase().includes("id")) {
      return `The ${paramName} identifier`;
    }
    return `The ${paramName} parameter`;
  }

  /**
   * Gets a description for the return value
   */
  private getReturnDescription(
    httpMethod: string,
    responseDto: string,
    resourceName: string,
  ): string {
    const isArray = responseDto.includes("[]");

    switch (httpMethod) {
      case "get":
        return isArray
          ? `Array of ${resourceName} resources`
          : `The ${resourceName} resource`;
      case "post":
        return `The newly created ${resourceName}`;
      case "put":
      case "patch":
        return `The updated ${resourceName}`;
      case "delete":
        return `Confirmation or deleted ${resourceName}`;
      default:
        return "Response data";
    }
  }
}
