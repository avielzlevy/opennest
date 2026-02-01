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

export class DtoGenerator implements IGenerator {
  constructor(private readonly typeMapper: TypeMapper) {}

  public generate(
    document: OpenAPIV3.Document,
    project: Project,
    outputPath: string = "./generated",
  ): void {
    if (!document.components?.schemas) return;

    const schemas = document.components.schemas as Record<
      string,
      OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
    >;

    for (const [name, schema] of Object.entries(schemas)) {
      // Skip references - only process actual schema objects
      if (isReferenceObject(schema)) continue;
      if (!isSchemaObject(schema)) continue;

      // Normalize class name to avoid reserved word collisions
      const className = normalizeSchemaName(name);

      const sourceFile = project.createSourceFile(
        `${outputPath}/dtos/${className}.dto.ts`,
        "",
        { overwrite: true },
      );

      const classDecl = sourceFile.addClass({
        name: className,
        isExported: true,
      });

      this.processProperties(classDecl, schema, className);

      sourceFile.fixMissingImports();
      sourceFile.organizeImports();
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
