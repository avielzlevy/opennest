/**
 * Schema-specific validation rules
 */

import { OpenAPIV3 } from 'openapi-types';
import {
  isSchemaObject,
  isReferenceObject,
  isOperationObject,
  isParameterObject,
  isResponseObject,
} from '../utils/type-guards';
import {
  ValidationResult,
  ValidationSeverity,
  addIssue,
} from './validation-result';

/**
 * Validate a schema object has required fields and valid structure
 *
 * @param schema - The schema to validate
 * @param schemaName - The name of the schema (for error reporting)
 * @param result - The validation result to add issues to
 */
export function validateSchema(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined,
  schemaName: string,
  result: ValidationResult,
): void {
  if (!schema) {
    addIssue(result, {
      severity: ValidationSeverity.Error,
      message: `Schema is null or undefined`,
      location: `components.schemas.${schemaName}`,
      suggestion: `Ensure schema definition is not empty`,
    });
    return;
  }

  // References are valid as-is
  if (isReferenceObject(schema)) {
    return;
  }

  if (!isSchemaObject(schema)) {
    addIssue(result, {
      severity: ValidationSeverity.Error,
      message: `Invalid schema object`,
      location: `components.schemas.${schemaName}`,
      suggestion: `Schema must be a valid OpenAPI SchemaObject`,
    });
    return;
  }

  // Check for type field (required for non-ref schemas)
  if (!schema.type) {
    addIssue(result, {
      severity: ValidationSeverity.Warning,
      message: `Schema missing 'type' field`,
      location: `components.schemas.${schemaName}`,
      suggestion: `Add type field (e.g., "type": "object")`,
      code: 'MISSING_TYPE',
    });
  }

  // If type is array, must have items
  if (schema.type === 'array' && !schema.items) {
    addIssue(result, {
      severity: ValidationSeverity.Error,
      message: `Array schema missing 'items' definition`,
      location: `components.schemas.${schemaName}`,
      suggestion: `Array schemas must specify items: { type: "..." }`,
    });
  }

  // Validate type is valid
  const validTypes = [
    'object', 'string', 'number', 'integer', 'boolean', 'array', 'null',
  ];
  if (schema.type && !validTypes.includes(schema.type)) {
    addIssue(result, {
      severity: ValidationSeverity.Error,
      message: `Invalid schema type "${schema.type}"`,
      location: `components.schemas.${schemaName}`,
      suggestion: `Type must be one of: ${validTypes.join(', ')}`,
    });
  }

  // Validate properties if present
  if (schema.properties) {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      validateSchema(
        propSchema as OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
        `${schemaName}.properties.${propName}`,
        result,
      );
    }
  }

  // Validate enum values
  if (schema.enum) {
    if (!Array.isArray(schema.enum) || schema.enum.length === 0) {
      addIssue(result, {
        severity: ValidationSeverity.Error,
        message: `Enum must have at least one value`,
        location: `components.schemas.${schemaName}`,
        suggestion: `Define enum values as an array`,
      });
    }
  }

  // Validate allOf, oneOf, anyOf schemas
  if (schema.allOf) {
    for (let i = 0; i < schema.allOf.length; i++) {
      validateSchema(
        schema.allOf[i],
        `${schemaName}.allOf[${i}]`,
        result,
      );
    }
  }

  if (schema.oneOf) {
    for (let i = 0; i < schema.oneOf.length; i++) {
      validateSchema(
        schema.oneOf[i],
        `${schemaName}.oneOf[${i}]`,
        result,
      );
    }
  }

  if (schema.anyOf) {
    for (let i = 0; i < schema.anyOf.length; i++) {
      validateSchema(
        schema.anyOf[i],
        `${schemaName}.anyOf[${i}]`,
        result,
      );
    }
  }
}

/**
 * Validate an operation object has required fields
 *
 * @param operation - The operation to validate
 * @param path - The path of the operation
 * @param method - The HTTP method
 * @param result - The validation result to add issues to
 */
export function validateOperation(
  operation: OpenAPIV3.OperationObject | undefined,
  path: string,
  method: string,
  result: ValidationResult,
): void {
  if (!operation) {
    addIssue(result, {
      severity: ValidationSeverity.Error,
      message: `Operation is null or undefined`,
      location: `paths.${path}.${method}`,
    });
    return;
  }

  if (!isOperationObject(operation)) {
    addIssue(result, {
      severity: ValidationSeverity.Error,
      message: `Invalid operation object`,
      location: `paths.${path}.${method}`,
      suggestion: `Operation must have 'responses' field`,
    });
    return;
  }

  // Must have at least one response
  if (!operation.responses || Object.keys(operation.responses).length === 0) {
    addIssue(result, {
      severity: ValidationSeverity.Error,
      message: `Operation missing responses`,
      location: `paths.${path}.${method}`,
      suggestion: `Add at least one response definition`,
    });
  }

  // Validate parameters if present
  if (operation.parameters) {
    for (let i = 0; i < operation.parameters.length; i++) {
      const param = operation.parameters[i];
      if (!param) continue;

      // Skip references
      if (isReferenceObject(param as unknown as OpenAPIV3.ReferenceObject)) {
        continue;
      }

      // Check if it's a valid parameter object
      const paramAsParam = param as OpenAPIV3.ParameterObject;
      if (!isParameterObject(paramAsParam)) {
        addIssue(result, {
          severity: ValidationSeverity.Error,
          message: `Invalid parameter at index ${i}`,
          location: `paths.${path}.${method}.parameters[${i}]`,
          suggestion: `Parameter must have 'in' and 'name' fields`,
        });
        continue;
      }

      // Parameter must have schema or content
      if (!paramAsParam.schema && !paramAsParam.content) {
        addIssue(result, {
          severity: ValidationSeverity.Warning,
          message: `Parameter "${paramAsParam.name}" missing schema or content`,
          location: `paths.${path}.${method}.parameters[${i}]`,
        });
      }
    }
  }

  // Validate responses
  if (operation.responses) {
    for (const [statusCode, response] of Object.entries(operation.responses)) {
      if (isReferenceObject(response)) {
        continue; // Skip references
      }
      if (!isResponseObject(response)) {
        addIssue(result, {
          severity: ValidationSeverity.Error,
          message: `Invalid response for status ${statusCode}`,
          location: `paths.${path}.${method}.responses.${statusCode}`,
        });
      }
    }
  }
}

/**
 * Validate operationId is a valid JavaScript identifier
 *
 * @param operationId - The operationId to validate
 * @param path - The path of the operation
 * @param method - The HTTP method
 * @param result - The validation result to add issues to
 */
export function validateOperationId(
  operationId: string | undefined,
  path: string,
  method: string,
  result: ValidationResult,
): void {
  if (!operationId) {
    addIssue(result, {
      severity: ValidationSeverity.Info,
      message: `Operation missing operationId`,
      location: `paths.${path}.${method}`,
      code: 'MISSING_OPERATION_ID',
    });
    return;
  }

  // Check for invalid characters
  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(operationId)) {
    addIssue(result, {
      severity: ValidationSeverity.Warning,
      message: `operationId "${operationId}" is not a valid JavaScript identifier`,
      location: `paths.${path}.${method}`,
      suggestion: `Use camelCase identifier (e.g., getUserById, createUser)`,
      code: 'INVALID_OPERATION_ID',
    });
  }
}

/**
 * Validate reference exists in document
 *
 * @param ref - The reference to validate
 * @param document - The OpenAPI document
 * @param result - The validation result to add issues to
 */
export function validateReference(
  ref: string,
  document: OpenAPIV3.Document,
  result: ValidationResult,
): void {
  if (!ref.startsWith('#/components/schemas/')) {
    addIssue(result, {
      severity: ValidationSeverity.Error,
      message: `Invalid reference format: "${ref}"`,
      suggestion: `Reference must use format: #/components/schemas/SchemaName`,
      code: 'INVALID_REF_FORMAT',
    });
    return;
  }

  const schemaName = ref.replace('#/components/schemas/', '');
  if (!document.components?.schemas?.[schemaName]) {
    addIssue(result, {
      severity: ValidationSeverity.Error,
      message: `Reference to undefined schema: "${schemaName}"`,
      location: ref,
      suggestion: `Ensure schema "${schemaName}" is defined in components.schemas`,
      code: 'UNDEFINED_SCHEMA_REF',
    });
  }
}

/**
 * Validate all references in a schema
 *
 * @param schema - The schema to check
 * @param document - The OpenAPI document
 * @param result - The validation result to add issues to
 */
export function validateReferencesInSchema(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined,
  document: OpenAPIV3.Document,
  result: ValidationResult,
): void {
  if (!schema) return;

  if (isReferenceObject(schema)) {
    validateReference(schema.$ref, document, result);
    return;
  }

  if (!isSchemaObject(schema)) return;

  // Check properties recursively
  if (schema.properties) {
    for (const prop of Object.values(schema.properties)) {
      validateReferencesInSchema(prop, document, result);
    }
  }

  // Check array items
  if ('items' in schema && schema.items) {
    validateReferencesInSchema(schema.items, document, result);
  }

  // Check composite schemas
  if (schema.allOf) {
    for (const s of schema.allOf) {
      validateReferencesInSchema(s, document, result);
    }
  }

  if (schema.oneOf) {
    for (const s of schema.oneOf) {
      validateReferencesInSchema(s, document, result);
    }
  }

  if (schema.anyOf) {
    for (const s of schema.anyOf) {
      validateReferencesInSchema(s, document, result);
    }
  }
}
