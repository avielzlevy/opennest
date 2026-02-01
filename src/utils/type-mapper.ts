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

      return this.applyOptionality(result, isRequired);
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
      return this.applyOptionality(result, isRequired);
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
      if (schema.example) apiPropObj.example = schema.example;
      if (!isRequired) apiPropObj.required = false;
      // Point Swagger to the enum
      apiPropObj.enum = schema.enum;
      apiPropObj.enumName = enumName; // Helps Swagger UI

      result.decorators.push({
        name: "ApiProperty",
        arguments: [JSON.stringify(apiPropObj)],
        moduleSpecifier: "@nestjs/swagger",
      });

      return this.applyOptionality(result, isRequired);
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
          result.tsType = "object";
        }
        break;
    }

    // 5. ApiProperty Decorator (Generic)
    // Only add if we haven't already added it (e.g. in the enum block)
    if (!result.decorators.some((d) => d.name === "ApiProperty")) {
      interface ApiPropertyOptions {
        description?: string;
        example?: unknown;
        required?: boolean;
      }
      const apiPropObj: ApiPropertyOptions = {};
      if (schema.description) apiPropObj.description = schema.description;
      if (schema.example) apiPropObj.example = schema.example;
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

    return this.applyOptionality(result, isRequired);
  }

  private applyOptionality(
    result: TypeMappingResult,
    isRequired: boolean,
  ): TypeMappingResult {
    if (!isRequired) {
      result.decorators.push({
        name: "IsOptional",
        arguments: [],
        moduleSpecifier: "class-validator",
      });
      result.tsType = `${result.tsType} | undefined`;
    } else {
      result.decorators.push({
        name: "IsNotEmpty",
        arguments: [],
        moduleSpecifier: "class-validator",
      });
    }
    return result;
  }
}
