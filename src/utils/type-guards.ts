// src/utils/type-guards.ts
import { OpenAPIV3 } from 'openapi-types';

/**
 * Type guard for OpenAPI ReferenceObject ($ref)
 *
 * @param schema - The schema to check
 * @returns True if schema is a ReferenceObject
 */
export function isReferenceObject(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined
): schema is OpenAPIV3.ReferenceObject {
  return schema !== null &&
         schema !== undefined &&
         typeof schema === 'object' &&
         '$ref' in schema;
}

/**
 * Type guard for OpenAPI SchemaObject
 *
 * @param schema - The schema to check
 * @returns True if schema is a SchemaObject (not a reference)
 */
export function isSchemaObject(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined
): schema is OpenAPIV3.SchemaObject {
  return schema !== null &&
         schema !== undefined &&
         typeof schema === 'object' &&
         !('$ref' in schema);
}

/**
 * Type guard for array schema
 *
 * @param schema - The schema to check
 * @returns True if schema is an array type with items
 */
export function isArraySchema(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined
): schema is OpenAPIV3.ArraySchemaObject {
  return isSchemaObject(schema) &&
         schema.type === 'array';
}

/**
 * Type guard for object schema
 *
 * @param schema - The schema to check
 * @returns True if schema is an object type
 */
export function isObjectSchema(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined
): schema is OpenAPIV3.NonArraySchemaObject {
  return isSchemaObject(schema) &&
         schema.type === 'object';
}

/**
 * Type guard for schema with properties
 *
 * @param schema - The schema to check
 * @returns True if schema has properties object
 */
export function hasProperties(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined
): schema is OpenAPIV3.SchemaObject & { properties: Record<string, OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject> } {
  return isSchemaObject(schema) &&
         'properties' in schema &&
         schema.properties !== undefined &&
         typeof schema.properties === 'object';
}

/**
 * Type guard for OpenAPI OperationObject
 *
 * @param operation - The operation to check
 * @returns True if operation is a valid OperationObject
 */
export function isOperationObject(
  operation: unknown
): operation is OpenAPIV3.OperationObject {
  return operation !== null &&
         operation !== undefined &&
         typeof operation === 'object' &&
         'responses' in operation;
}

/**
 * Type guard for OpenAPI PathItemObject
 *
 * @param pathItem - The path item to check
 * @returns True if pathItem is a valid PathItemObject
 */
export function isPathItemObject(
  pathItem: unknown
): pathItem is OpenAPIV3.PathItemObject {
  return pathItem !== null &&
         pathItem !== undefined &&
         typeof pathItem === 'object';
}

/**
 * Type guard for OpenAPI ParameterObject (not a reference)
 *
 * @param param - The parameter to check
 * @returns True if param is a ParameterObject
 */
export function isParameterObject(
  param: OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject | undefined
): param is OpenAPIV3.ParameterObject {
  return param !== null &&
         param !== undefined &&
         typeof param === 'object' &&
         !('$ref' in param) &&
         'in' in param;
}

/**
 * Type guard for OpenAPI RequestBodyObject (not a reference)
 *
 * @param body - The request body to check
 * @returns True if body is a RequestBodyObject
 */
export function isRequestBodyObject(
  body: OpenAPIV3.ReferenceObject | OpenAPIV3.RequestBodyObject | undefined
): body is OpenAPIV3.RequestBodyObject {
  return body !== null &&
         body !== undefined &&
         typeof body === 'object' &&
         !('$ref' in body) &&
         'content' in body;
}

/**
 * Type guard for OpenAPI ResponseObject (not a reference)
 *
 * @param response - The response to check
 * @returns True if response is a ResponseObject
 */
export function isResponseObject(
  response: OpenAPIV3.ReferenceObject | OpenAPIV3.ResponseObject | undefined
): response is OpenAPIV3.ResponseObject {
  return response !== null &&
         response !== undefined &&
         typeof response === 'object' &&
         !('$ref' in response) &&
         'description' in response;
}

/**
 * Checks if content object has application/json media type
 *
 * @param content - The content object to check
 * @returns True if content has application/json
 */
export function hasJsonContent(
  content: { [media: string]: OpenAPIV3.MediaTypeObject } | undefined
): content is { 'application/json': OpenAPIV3.MediaTypeObject } {
  return content !== null &&
         content !== undefined &&
         typeof content === 'object' &&
         'application/json' in content;
}

/**
 * Checks if media type object has a schema
 *
 * @param mediaType - The media type object to check
 * @returns True if mediaType has schema property
 */
export function hasSchema(
  mediaType: OpenAPIV3.MediaTypeObject | undefined
): mediaType is OpenAPIV3.MediaTypeObject & { schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject } {
  return mediaType !== null &&
         mediaType !== undefined &&
         typeof mediaType === 'object' &&
         'schema' in mediaType &&
         mediaType.schema !== undefined;
}

/**
 * Safely extracts JSON schema from content object
 *
 * @param content - The content object
 * @returns The schema or null if not found
 */
export function getJsonSchema(
  content: { [media: string]: OpenAPIV3.MediaTypeObject } | undefined
): OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | null {
  if (!hasJsonContent(content)) {
    return null;
  }

  const mediaType = content['application/json'];
  if (!hasSchema(mediaType)) {
    return null;
  }

  return mediaType.schema;
}
