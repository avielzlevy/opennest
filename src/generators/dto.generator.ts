// generators/dto.generator.ts
import { OpenAPIV3 } from "openapi-types";
import {
  Project,
  ClassDeclaration,
  Scope,
  ImportDeclaration,
  VariableDeclarationKind,
} from "ts-morph";
import { IGenerator } from "../interfaces/core";
import { TypeMapper } from "../utils/type-mapper";
import { isReferenceObject, isSchemaObject } from "../utils/type-guards";
import { toEnumKey, normalizeSchemaName } from "../utils/formatting-helpers";
import { displayWarningMessage } from "../cli/error-handler";
import {
  isValidIdentifier,
  sanitizeIdentifier,
  resolveNestJsConflict,
  hasNestJsConflict,
} from "../validation/identifier-validator";
import {
  OutputStructureConfig,
  resolveOutputPath,
  extractResourceNameFromTag,
} from "../utils/output-structure-manager";

/**
 * Error recovery strategy for generator
 */
export type GeneratorRecoveryStrategy = "skip" | "fail-fast" | "warn";

export class DtoGenerator implements IGenerator {
  constructor(
    private readonly typeMapper: TypeMapper,
    private readonly recoveryStrategy: GeneratorRecoveryStrategy = "warn",
  ) {}

  public generate(
    document: OpenAPIV3.Document,
    project: Project,
    outputPath: string = "./generated",
    config?: OutputStructureConfig,
  ): void {
    if (!document.components?.schemas) return;

    const schemas = document.components.schemas as Record<
      string,
      OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
    >;

    const errors: Array<{ schema: string; error: string }> = [];
    const warnings: string[] = [];

    for (const [name, schema] of Object.entries(schemas)) {
      try {
        // Skip references - only process actual schema objects
        if (isReferenceObject(schema)) continue;
        if (!isSchemaObject(schema)) {
          const msg = `Schema "${name}" is not a valid SchemaObject`;
          if (this.recoveryStrategy === "fail-fast") {
            throw new Error(msg);
          }
          errors.push({ schema: name, error: msg });
          warnings.push(`Skipped invalid schema: ${name}`);
          continue;
        }

        // Validate schema has properties or is valid without them
        if (!schema.properties && schema.type === "object") {
          const msg = `Schema "${name}" is object type but has no properties`;
          warnings.push(msg);
        }

        // Normalize class name to avoid reserved word collisions
        let className = normalizeSchemaName(name);

        // NOTE: NestJS conflict resolution is detected by validator but not applied
        // in generator to maintain backward compatibility. When implementing conflict
        // resolution, all generators (DTO, Controller, Decorator) must be updated
        // to maintain consistency in import paths.
        if (hasNestJsConflict(className)) {
          // Log for awareness but don't rename to maintain import consistency
          if (this.recoveryStrategy === "warn") {
            warnings.push(
              `Schema name "${className}" may conflict with NestJS decorator`,
            );
          }
        }

        // Validate identifier and sanitize if needed
        if (!isValidIdentifier(className)) {
          const original = className;
          className = sanitizeIdentifier(className, "Dto");
          warnings.push(
            `Schema name "${original}" is not a valid identifier, sanitized to "${className}"`,
          );
        }

        // Resolve output path based on structure configuration
        // Use className as resource name for path generation
        const dtoPath = resolveOutputPath(
          outputPath || "generated",
          "dtos",
          className,
          config || { structure: "type-based" },
        );

        const sourceFile = project.createSourceFile(dtoPath, "", {
          overwrite: true,
        });

        const classDecl = sourceFile.addClass({
          name: className,
          isExported: true,
        });

        if (schema.description) {
          classDecl.addJsDoc({
            description: schema.description,
          });
        }

        this.processProperties(classDecl, schema, className);

        sourceFile.fixMissingImports();
        sourceFile.organizeImports();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const msg = `Failed to generate DTO for schema "${name}": ${errorMsg}`;

        if (this.recoveryStrategy === "fail-fast") {
          throw error;
        }

        errors.push({ schema: name, error: errorMsg });
        warnings.push(`Skipped ${name}: ${errorMsg}`);
      }
    }

    // Report warnings if any
    if (warnings.length > 0 && this.recoveryStrategy === "warn") {
      for (const warning of warnings) {
        displayWarningMessage(`DTO Generator: ${warning}`);
      }
    }
  }

  private processProperties(
    classDecl: ClassDeclaration,
    schema: OpenAPIV3.SchemaObject,
    className: string,
  ) {
    if (!schema.properties) return;

    const requiredFields = new Set(schema.required || []);

    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const isRequired = requiredFields.has(propName);

      const typedPropSchema = propSchema as
        | OpenAPIV3.SchemaObject
        | OpenAPIV3.ReferenceObject;

      const mapping = this.typeMapper.mapSchemaToType(
        typedPropSchema,
        isRequired,
        { className, propName },
      );

      // Handle Enum Generation BEFORE property addition
      // This ensures the Enum is defined ABOVE the class in the file
      if (mapping.enumDefinition) {
        const def = mapping.enumDefinition;
        const sourceFile = classDecl.getSourceFile();

        // FIX: Insert before the class declaration so the decorator can reference it
        // We get the current index of the class.
        // Inserting at this index pushes the class down.
        const insertIndex = classDecl.getChildIndex();

        // 1. export const CLASS_PROP = { ... } as const;
        sourceFile.insertVariableStatement(insertIndex, {
          declarationKind: VariableDeclarationKind.Const,
          isExported: true,
          declarations: [
            {
              name: def.constName,
              initializer: `{
                            ${def.values
                              .map((v) => `${toEnumKey(v)}: '${v}'`)
                              .join(",\n")}
                        } as const`,
            },
          ],
        });

        // 2. export type ClassProp = ...
        // We insert at the NEW class index (which shifted down by 1)
        // so it appears: Const -> Type -> Class
        sourceFile.insertTypeAlias(classDecl.getChildIndex(), {
          name: def.name,
          isExported: true,
          type: `(typeof ${def.constName})[keyof typeof ${def.constName}]`,
        });
      }

      const property = classDecl.addProperty({
        name: propName,
        type: mapping.tsType,
        scope: Scope.Public,
        hasQuestionToken: !isRequired,
        hasExclamationToken: isRequired,
      });

      if (isSchemaObject(typedPropSchema)) {
        const jsDocLines: string[] = [];
        if (typedPropSchema.description) {
          jsDocLines.push(typedPropSchema.description);
        }
        if (typedPropSchema.example !== undefined) {
          jsDocLines.push(
            `@example ${JSON.stringify(typedPropSchema.example)}`,
          );
        }
        if (jsDocLines.length > 0) {
          property.addJsDoc({
            description: jsDocLines.join("\n"),
          });
        }
      }

      mapping.decorators.forEach((dec) => {
        property.addDecorator({
          name: dec.name,
          arguments: dec.arguments,
        });

        classDecl.getSourceFile().addImportDeclaration({
          namedImports: [dec.name],
          moduleSpecifier: dec.moduleSpecifier,
        });
      });

      mapping.imports.forEach((imp) => {
        const file = classDecl.getSourceFile();
        // Check if import already exists with proper typing
        const existingImport = file.getImportDeclaration(
          (d: ImportDeclaration) =>
            d.getModuleSpecifierValue() === imp.moduleSpecifier,
        );

        if (!existingImport) {
          file.addImportDeclaration({
            namedImports: [imp.named],
            moduleSpecifier: imp.moduleSpecifier,
          });
        }
      });
    }
  }
}
