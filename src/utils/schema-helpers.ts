// src/utils/schema-helpers.ts
import { OpenAPIV3 } from 'openapi-types';
import {
  isReferenceObject,
  isArraySchema,
  getJsonSchema,
} from './type-guards';
import { extractRefName, normalizeSchemaName } from './formatting-helpers';

/**
 * Extracts the DTO name from a request body object.
 * Returns null if no JSON schema is present or schema is not a reference.
 *
 * @param body - OpenAPI RequestBodyObject or undefined
 * @returns DTO name or null
 *
 * @example
 * const body = {
 *   content: {
 *     'application/json': {
 *       schema: { $ref: '#/components/schemas/CreateUserDto' }
 *     }
 *   }
 * };
 * extractBodyDtoName(body) → 'CreateUserDto'
 */
export function extractBodyDtoName(
  body: OpenAPIV3.RequestBodyObject | undefined
): string | null {
  if (!body) {
    return null;
  }

  const schema = getJsonSchema(body.content);
  if (!schema) {
    return null;
  }

  if (!isReferenceObject(schema)) {
    return null;
  }

  const refName = extractRefName(schema.$ref);
  if (!refName) {
    return null;
  }

  return normalizeSchemaName(refName);
}

/**
 * Extracts the full schema object from a request body.
 *
 * @param body - OpenAPI RequestBodyObject or undefined
 * @returns Schema object or null
 */
export function extractBodySchema(
  body: OpenAPIV3.RequestBodyObject | undefined
): OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | null {
  if (!body) {
    return null;
  }

  return getJsonSchema(body.content);
}

/**
 * Checks if a request body is marked as required.
 *
 * @param body - OpenAPI RequestBodyObject or undefined
 * @returns True if body is required, false otherwise
 */
export function isBodyRequired(
  body: OpenAPIV3.RequestBodyObject | undefined
): boolean {
  return body?.required === true;
}

/**
 * Gets the first success response (200 or 201) from responses object.
 *
 * @param responses - OpenAPI ResponsesObject
 * @returns Success response or undefined
 */
export function getSuccessResponse(
  responses: OpenAPIV3.ResponsesObject | undefined
): OpenAPIV3.ResponseObject | OpenAPIV3.ReferenceObject | undefined {
  if (!responses) {
    return undefined;
  }

  const success = responses['200'] || responses['201'];
  return success as OpenAPIV3.ResponseObject | OpenAPIV3.ReferenceObject | undefined;
}

/**
 * Extracts the DTO name from a responses object.
 * Handles both single DTOs and array responses.
 *
 * @param responses - OpenAPI ResponsesObject
 * @returns DTO name (with [] suffix for arrays), 'void', or 'any'
 *
 * @example
 * // Single DTO
 * extractResponseDtoName({ '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/UserDto' } } } } })
 * → 'UserDto'
 *
 * // Array of DTOs
 * extractResponseDtoName({ '200': { content: { 'application/json': { schema: { type: 'array', items: { $ref: '...' } } } } } })
 * → 'UserDto[]'
 */
export function extractResponseDtoName(
  responses: OpenAPIV3.ResponsesObject | undefined
): string {
  const success = getSuccessResponse(responses);

  if (!success) {
    return 'void';
  }

  // Check if it's a ResponseObject (not a reference)
  if (!('content' in success)) {
    return 'any';
  }

  const schema = getJsonSchema(success.content);
  if (!schema) {
    return 'any';
  }

  // Handle direct reference
  if (isReferenceObject(schema)) {
    const refName = extractRefName(schema.$ref);
    if (!refName) {
      return 'any';
    }
    return normalizeSchemaName(refName);
  }

  // Handle array of references
  if (isArraySchema(schema) && schema.items) {
    if (isReferenceObject(schema.items)) {
      const refName = extractRefName(schema.items.$ref);
      if (!refName) {
        return 'any';
      }
      return `${normalizeSchemaName(refName)}[]`;
    }
  }

  return 'any';
}

/**
 * Extracts the full response schema from a responses object.
 *
 * @param responses - OpenAPI ResponsesObject
 * @returns Response schema or null
 */
export function extractResponseSchema(
  responses: OpenAPIV3.ResponsesObject | undefined
): OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | null {
  const success = getSuccessResponse(responses);

  if (!success) {
    return null;
  }

  if (!('content' in success)) {
    return null;
  }

  return getJsonSchema(success.content);
}

/**
 * Checks if a schema represents an array response.
 *
 * @param schema - OpenAPI schema or undefined
 * @returns True if schema is an array type
 */
export function isArrayResponse(
  schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | null | undefined
): boolean {
  if (!schema) {
    return false;
  }

  return isArraySchema(schema);
}

/**
 * Gets the TypeScript type string for a schema.
 * Used for method return types and parameter types.
 *
 * @param schema - OpenAPI schema or undefined
 * @returns TypeScript type string
 */
export function getSchemaType(
  schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | null | undefined
): string {
  if (!schema) {
    return 'any';
  }

  if (isReferenceObject(schema)) {
    const refName = extractRefName(schema.$ref);
    if (!refName) {
      return 'any';
    }
    return normalizeSchemaName(refName);
  }

  if (isArraySchema(schema) && schema.items) {
    const itemType = getSchemaType(schema.items);
    return `${itemType}[]`;
  }

  // Handle primitive types
  if ('type' in schema) {
    switch (schema.type) {
      case 'string':
        return 'string';
      case 'integer':
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'object':
        return 'object';
      default:
        return 'any';
    }
  }

  return 'any';
}

/**
 * Gets the item type for array schemas.
 *
 * @param schema - OpenAPI array schema
 * @returns Item type string
 */
export function getArrayItemType(
  schema: OpenAPIV3.ArraySchemaObject
): string {
  if (!schema.items) {
    return 'any';
  }

  return getSchemaType(schema.items);
}

/**
 * Checks if a schema allows null values.
 *
 * @param schema - OpenAPI schema
 * @returns True if schema is nullable
 */
export function isNullableSchema(
  schema: OpenAPIV3.SchemaObject | undefined
): boolean {
  if (!schema) {
    return false;
  }

  return schema.nullable === true;
}
