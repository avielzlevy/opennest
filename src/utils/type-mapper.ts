// utils/type-mapper.ts
import { OpenAPIV3 } from "openapi-types";
import { TypeMappingResult } from "../interfaces/core";
import {
  isReferenceObject,
  isArraySchema,
  isSchemaObject,
} from "./type-guards";
import {
  capitalize,
  toConstantCase,
  extractRefName,
  normalizeSchemaName,
} from "./formatting-helpers";

export class TypeMapper {
  public mapSchemaToType(
    schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
    isRequired: boolean = true,
    context?: { className: string; propName: string }, // NEW: Context for naming enums
  ): TypeMappingResult {
    const result: TypeMappingResult = {
      tsType: "any",
      imports: [],
      decorators: [],
      isArray: false,
    };

    // 1. Handle References ($ref)
    if (isReferenceObject(schema)) {
      const refName = extractRefName(schema.$ref);
      if (!refName) {
        result.tsType = "Unknown";
        return result;
      }

      const normalizedName = normalizeSchemaName(refName);
      result.tsType = normalizedName;
      result.imports.push({
        named: normalizedName,
        moduleSpecifier: `../dtos/${normalizedName}.dto`,
      });

      result.decorators.push({
        name: "ValidateNested",
        arguments: [],
        moduleSpecifier: "class-validator",
      });
      result.decorators.push({
        name: "Type",
        arguments: [`() => ${normalizedName}`],
        moduleSpecifier: "class-transformer",
      });

      // ApiProperty for nested object references
      const refApiProps: Record<string, unknown> = {
        type: () => normalizedName,
      };
      if (!isRequired) refApiProps.required = false;
      result.decorators.push({
        name: "ApiProperty",
        arguments: [
          `{ type: () => ${normalizedName}${!isRequired ? ", required: false" : ""} }`,
        ],
        moduleSpecifier: "@nestjs/swagger",
      });

      return this.applyOptionality(result, isRequired, schema);
    }

    // 2. Handle Arrays
    if (isArraySchema(schema)) {
      result.isArray = true;
      result.decorators.push({
        name: "IsArray",
        arguments: [],
        moduleSpecifier: "class-validator",
      });

      if (schema.items) {
        const itemMap = this.mapSchemaToType(schema.items, true);
        result.tsType = `${itemMap.tsType}[]`;
        result.imports.push(...itemMap.imports);

        if (itemMap.decorators.some((d) => d.name === "ValidateNested")) {
          result.decorators.push({
            name: "ValidateNested",
            arguments: [],
            moduleSpecifier: "class-validator",
          });
          result.decorators.push({
            name: "Type",
            arguments: itemMap.decorators.find((d) => d.name === "Type")
              ?.arguments,
            moduleSpecifier: "class-transformer",
          });
        }
      } else {
        result.tsType = "any[]";
      }

      // ApiProperty for arrays — tell Swagger about the item type.
      // NestJS Swagger needs the array item type to generate correct schemas:
      //   - Object items ($ref):   @ApiProperty({ type: () => [ClassName] })
      //   - Primitive items:       @ApiProperty({ type: [String] })
      //   - Unknown items:         @ApiProperty({ type: 'array' })
      // Array constraint validation decorators
      if (typeof schema.minItems === "number") {
        result.decorators.push({
          name: "ArrayMinSize",
          arguments: [String(schema.minItems)],
          moduleSpecifier: "class-validator",
        });
      }
      if (typeof schema.maxItems === "number") {
        result.decorators.push({
          name: "ArrayMaxSize",
          arguments: [String(schema.maxItems)],
          moduleSpecifier: "class-validator",
        });
      }

      const extraProps: string[] = [];
      if (schema.description)
        extraProps.push(`description: ${JSON.stringify(schema.description)}`);
      if (schema.example !== undefined)
        extraProps.push(`example: ${JSON.stringify(schema.example)}`);
      if (!isRequired) extraProps.push("required: false");
      if (typeof schema.minItems === "number")
        extraProps.push(`minItems: ${schema.minItems}`);
      if (typeof schema.maxItems === "number")
        extraProps.push(`maxItems: ${schema.maxItems}`);
      const extraStr = extraProps.length ? ", " + extraProps.join(", ") : "";

      // Determine the item type reference for Swagger
      let arrayTypeExpr: string;
      if (schema.items && isReferenceObject(schema.items)) {
        // Array of objects — lazy reference so Swagger discovers the schema
        const itemRef = normalizeSchemaName(
          extractRefName(schema.items.$ref) ?? "any",
        );
        arrayTypeExpr = `type: () => [${itemRef}]`;
      } else if (schema.items && isSchemaObject(schema.items)) {
        // Array of primitives
        const itemType = schema.items.type;
        if (itemType === "string") arrayTypeExpr = "type: [String]";
        else if (itemType === "integer" || itemType === "number")
          arrayTypeExpr = "type: [Number]";
        else if (itemType === "boolean") arrayTypeExpr = "type: [Boolean]";
        else arrayTypeExpr = 'type: "array"';
      } else {
        arrayTypeExpr = 'type: "array"';
      }

      result.decorators.push({
        name: "ApiProperty",
        arguments: [`{ ${arrayTypeExpr}${extraStr} }`],
        moduleSpecifier: "@nestjs/swagger",
      });

      return this.applyOptionality(result, isRequired, schema);
    }

    // 3. Handle Enums (Strings)
    if (isSchemaObject(schema) && schema.enum && context) {
      const { className, propName } = context;
      // Heuristic: ClientResponseDto + status -> ClientResponseDtoStatus
      // Or if you want a cleaner name you might strip 'Dto' or 'Response'.
      // For safety/uniqueness, we use the full class name prefix.
      const baseName = `${className}${capitalize(propName)}`;
      const enumName = baseName;
      const constName = toConstantCase(baseName); // CLIENT_RESPONSE_DTO_STATUS

      result.tsType = enumName;
      result.enumDefinition = {
        name: enumName,
        constName: constName,
        values: schema.enum as string[],
      };

      // Validator: @IsIn(Object.values(CONST))
      result.decorators.push({
        name: "IsIn",
        arguments: [`Object.values(${constName})`],
        moduleSpecifier: "class-validator",
      });

      // Add ApiProperty explicitly here to ensure it uses the enum
      // We skip the generic ApiProperty addition later to avoid duplication/conflict
      interface ApiPropertyOptions {
        description?: string;
        example?: unknown;
        required?: boolean;
        enum?: unknown[];
        enumName?: string;
      }
      const apiPropObj: ApiPropertyOptions = {};
      if (schema.description) apiPropObj.description = schema.description;
      if (schema.example) {
        apiPropObj.example = schema.example;
      } else if (schema.enum && schema.enum.length > 0) {
        apiPropObj.example = schema.enum[0];
      }
      if (!isRequired) apiPropObj.required = false;
      // Point Swagger to the enum
      apiPropObj.enum = schema.enum;
      apiPropObj.enumName = enumName; // Helps Swagger UI

      result.decorators.push({
        name: "ApiProperty",
        arguments: [JSON.stringify(apiPropObj)],
        moduleSpecifier: "@nestjs/swagger",
      });

      return this.applyOptionality(result, isRequired, schema);
    } else if (isSchemaObject(schema) && schema.enum) {
      // Fallback for no context (e.g. array items where we didn't pass context down yet)
      const unionType = schema.enum.map((e) => `'${e}'`).join(" | ");
      result.tsType = unionType;
      result.decorators.push({
        name: "IsIn",
        arguments: [`[${schema.enum.map((e) => `'${e}'`).join(",")}]`],
        moduleSpecifier: "class-validator",
      });
    }

    // 4. Handle Primitives & Objects
    if (!isSchemaObject(schema)) {
      // If we reach here with a reference, something went wrong
      return result;
    }

    switch (schema.type) {
      case "string":
        // Only apply IsString if it wasn't an enum (enums are usually strings but handled above)
        if (!schema.enum) {
          result.tsType = "string";
          result.decorators.push({
            name: "IsString",
            arguments: [],
            moduleSpecifier: "class-validator",
          });

          // Constraint validation decorators for strings
          if (typeof schema.minLength === "number") {
            result.decorators.push({
              name: "MinLength",
              arguments: [String(schema.minLength)],
              moduleSpecifier: "class-validator",
            });
          }
          if (typeof schema.maxLength === "number") {
            result.decorators.push({
              name: "MaxLength",
              arguments: [String(schema.maxLength)],
              moduleSpecifier: "class-validator",
            });
          }
          if (schema.pattern) {
            result.decorators.push({
              name: "Matches",
              arguments: [`/${schema.pattern}/`],
              moduleSpecifier: "class-validator",
            });
          }

          // Format-specific validators
          if (schema.format === "email") {
            result.decorators.push({
              name: "IsEmail",
              arguments: [],
              moduleSpecifier: "class-validator",
            });
          } else if (schema.format === "uuid") {
            result.decorators.push({
              name: "IsUUID",
              arguments: [],
              moduleSpecifier: "class-validator",
            });
          } else if (schema.format === "uri" || schema.format === "url") {
            result.decorators.push({
              name: "IsUrl",
              arguments: [],
              moduleSpecifier: "class-validator",
            });
          } else if (schema.format === "date-time") {
            result.decorators.push({
              name: "IsDateString",
              arguments: [],
              moduleSpecifier: "class-validator",
            });
          }
        }
        break;
      case "integer":
      case "number":
        result.tsType = "number";
        result.decorators.push({
          name: "IsNumber",
          arguments: [],
          moduleSpecifier: "class-validator",
        });

        // Constraint validation decorators for numbers
        if (typeof schema.minimum === "number") {
          result.decorators.push({
            name: "Min",
            arguments: [String(schema.minimum)],
            moduleSpecifier: "class-validator",
          });
        }
        if (typeof schema.maximum === "number") {
          result.decorators.push({
            name: "Max",
            arguments: [String(schema.maximum)],
            moduleSpecifier: "class-validator",
          });
        }
        break;
      case "boolean":
        result.tsType = "boolean";
        result.decorators.push({
          name: "IsBoolean",
          arguments: [],
          moduleSpecifier: "class-validator",
        });
        break;
      case "object":
        if (!schema.properties) {
          result.tsType = "Record<string, any>";
          result.decorators.push({
            name: "IsObject",
            arguments: [],
            moduleSpecifier: "class-validator",
          });
        } else {
          // If it has properties but no $ref, it's an inline object.
          // Using 'any' is better than 'object' because 'object' identifies
          // only the data type but doesn't allow property access in TS.
          result.tsType = "any";
          result.decorators.push({
            name: "IsObject",
            arguments: [],
            moduleSpecifier: "class-validator",
          });
        }
        break;
    }

    // 5. ApiProperty Decorator (Generic)
    // Only add if we haven't already added it (e.g. in the enum block)
    if (!result.decorators.some((d) => d.name === "ApiProperty")) {
      interface ApiPropertyOptions {
        type?: string;
        format?: string;
        description?: string;
        example?: unknown;
        required?: boolean;
        minimum?: number;
        maximum?: number;
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        default?: unknown;
        deprecated?: boolean;
      }
      const apiPropObj: ApiPropertyOptions = {};

      // Always include type so Swagger knows the data type.
      // Skip "object" — in @nestjs/swagger v11 SchemaObjectMetadata, type: 'object'
      // triggers a union branch where `required` must be string[] (not boolean).
      // Swagger infers object types from class metadata, so omitting is safe.
      if (schema.type && schema.type !== "object") {
        apiPropObj.type = schema.type === "integer" ? "number" : schema.type;
      }
      if (schema.format) apiPropObj.format = schema.format;
      if (schema.description) apiPropObj.description = schema.description;

      // Constraints — show validation rules in Swagger UI
      if (typeof schema.minimum === "number") apiPropObj.minimum = schema.minimum;
      if (typeof schema.maximum === "number") apiPropObj.maximum = schema.maximum;
      if (typeof schema.minLength === "number") apiPropObj.minLength = schema.minLength;
      if (typeof schema.maxLength === "number") apiPropObj.maxLength = schema.maxLength;
      if (schema.pattern) apiPropObj.pattern = schema.pattern;
      if (schema.default !== undefined) apiPropObj.default = schema.default;
      if ((schema as any).deprecated === true) apiPropObj.deprecated = true;

      // Example: use schema value if present, otherwise generate a sensible default
      if (schema.example !== undefined) {
        apiPropObj.example = schema.example;
      } else if (schema.default !== undefined) {
        apiPropObj.example = schema.default;
      } else {
        // Generate a default example based on type + format
        switch (schema.type) {
          case "string":
            if (schema.format === "date-time")
              apiPropObj.example = "2025-01-01T00:00:00.000Z";
            else if (schema.format === "date")
              apiPropObj.example = "2025-01-01";
            else if (schema.format === "email")
              apiPropObj.example = "user@example.com";
            else if (schema.format === "uri" || schema.format === "url")
              apiPropObj.example = "https://example.com";
            else if (schema.format === "uuid")
              apiPropObj.example = "550e8400-e29b-41d4-a716-446655440000";
            else if (context?.propName) apiPropObj.example = context.propName;
            else apiPropObj.example = "string";
            break;
          case "integer":
            apiPropObj.example = schema.minimum ?? 1;
            break;
          case "number":
            apiPropObj.example = schema.minimum ?? 1.0;
            break;
          case "boolean":
            apiPropObj.example = true;
            break;
        }
      }

      if (!isRequired) apiPropObj.required = false;

      result.decorators.push({
        name: "ApiProperty",
        arguments:
          Object.keys(apiPropObj).length > 0
            ? [JSON.stringify(apiPropObj)]
            : [],
        moduleSpecifier: "@nestjs/swagger",
      });
    }

    return this.applyOptionality(result, isRequired, schema);
  }

  private applyOptionality(
    result: TypeMappingResult,
    isRequired: boolean,
    schema?: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  ): TypeMappingResult {
    // Check if the schema explicitly allows null (Swagger 3.0 nullable: true)
    const isNullable =
      isSchemaObject(schema) && (schema as any).nullable === true;

    if (!isRequired) {
      result.decorators.push({
        name: "IsOptional",
        arguments: [],
        moduleSpecifier: "class-validator",
      });
      // If optional, we allow undefined. If explicitly nullable, we also allow null.
      if (isNullable) {
        result.tsType = `${result.tsType} | null | undefined`;
      } else {
        result.tsType = `${result.tsType} | undefined`;
      }
    } else {
      if (isNullable) {
        result.tsType = `${result.tsType} | null`;
      } else {
        // Only add @IsNotEmpty for non-string types, or strings with explicit minLength > 0.
        // OpenAPI "required" means the field must be present, not that it can't be empty string.
        const isStringType =
          isSchemaObject(schema) && schema.type === "string";
        const hasMinLength =
          isSchemaObject(schema) &&
          typeof (schema as any).minLength === "number" &&
          (schema as any).minLength > 0;

        if (!isStringType || hasMinLength) {
          result.decorators.push({
            name: "IsNotEmpty",
            arguments: [],
            moduleSpecifier: "class-validator",
          });
        }
      }
    }
    return result;
  }
}
