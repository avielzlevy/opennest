// src/utils/type-guards.ts
import { OpenAPIV3 } from "openapi-types";

/**
 * Type guard for OpenAPI ReferenceObject ($ref)
 *
 * @param schema - The schema to check
 * @returns True if schema is a ReferenceObject
 */
export function isReferenceObject(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined,
): schema is OpenAPIV3.ReferenceObject {
  return (
    schema !== null &&
    schema !== undefined &&
    typeof schema === "object" &&
    "$ref" in schema
  );
}

/**
 * Type guard for OpenAPI SchemaObject
 *
 * @param schema - The schema to check
 * @returns True if schema is a SchemaObject (not a reference)
 */
export function isSchemaObject(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined,
): schema is OpenAPIV3.SchemaObject {
  return (
    schema !== null &&
    schema !== undefined &&
    typeof schema === "object" &&
    !("$ref" in schema)
  );
}

/**
 * Type guard for array schema
 *
 * @param schema - The schema to check
 * @returns True if schema is an array type with items
 */
export function isArraySchema(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined,
): schema is OpenAPIV3.ArraySchemaObject {
  return isSchemaObject(schema) && schema.type === "array";
}

/**
 * Type guard for object schema
 *
 * @param schema - The schema to check
 * @returns True if schema is an object type
 */
export function isObjectSchema(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined,
): schema is OpenAPIV3.NonArraySchemaObject {
  return isSchemaObject(schema) && schema.type === "object";
}

/**
 * Type guard for schema with properties
 *
 * @param schema - The schema to check
 * @returns True if schema has properties object
 */
export function hasProperties(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined,
): schema is OpenAPIV3.SchemaObject & {
  properties: Record<
    string,
    OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject
  >;
} {
  return (
    isSchemaObject(schema) &&
    "properties" in schema &&
    schema.properties !== undefined &&
    typeof schema.properties === "object"
  );
}

/**
 * Type guard for OpenAPI OperationObject
 *
 * @param operation - The operation to check
 * @returns True if operation is a valid OperationObject
 */
export function isOperationObject(
  operation: unknown,
): operation is OpenAPIV3.OperationObject {
  return (
    operation !== null &&
    operation !== undefined &&
    typeof operation === "object" &&
    "responses" in operation
  );
}

/**
 * Type guard for OpenAPI PathItemObject
 *
 * @param pathItem - The path item to check
 * @returns True if pathItem is a valid PathItemObject
 */
export function isPathItemObject(
  pathItem: unknown,
): pathItem is OpenAPIV3.PathItemObject {
  return (
    pathItem !== null && pathItem !== undefined && typeof pathItem === "object"
  );
}

/**
 * Type guard for OpenAPI ParameterObject (not a reference)
 *
 * @param param - The parameter to check
 * @returns True if param is a ParameterObject
 */
export function isParameterObject(
  param: OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject | undefined,
): param is OpenAPIV3.ParameterObject {
  return (
    param !== null &&
    param !== undefined &&
    typeof param === "object" &&
    !("$ref" in param) &&
    "in" in param
  );
}

/**
 * Type guard for OpenAPI RequestBodyObject (not a reference)
 *
 * @param body - The request body to check
 * @returns True if body is a RequestBodyObject
 */
export function isRequestBodyObject(
  body: OpenAPIV3.ReferenceObject | OpenAPIV3.RequestBodyObject | undefined,
): body is OpenAPIV3.RequestBodyObject {
  return (
    body !== null &&
    body !== undefined &&
    typeof body === "object" &&
    !("$ref" in body) &&
    "content" in body
  );
}

/**
 * Type guard for OpenAPI ResponseObject (not a reference)
 *
 * @param response - The response to check
 * @returns True if response is a ResponseObject
 */
export function isResponseObject(
  response: OpenAPIV3.ReferenceObject | OpenAPIV3.ResponseObject | undefined,
): response is OpenAPIV3.ResponseObject {
  return (
    response !== null &&
    response !== undefined &&
    typeof response === "object" &&
    !("$ref" in response) &&
    "description" in response
  );
}

/**
 * Checks if content object has application/json media type
 *
 * @param content - The content object to check
 * @returns True if content has application/json
 */
export function hasJsonContent(
  content: { [media: string]: OpenAPIV3.MediaTypeObject } | undefined,
): content is { "application/json": OpenAPIV3.MediaTypeObject } {
  return (
    content !== null &&
    content !== undefined &&
    typeof content === "object" &&
    "application/json" in content
  );
}

/**
 * Type guard for multipart form content
 *
 * @param content - The content object
 * @returns True if content has multipart/form-data
 */
export function isMultipartFormContent(
  content: { [media: string]: OpenAPIV3.MediaTypeObject } | undefined,
): boolean {
  return (
    content !== null &&
    content !== undefined &&
    typeof content === "object" &&
    "multipart/form-data" in content
  );
}

/**
 * Heuristic check to see if an operation implies a file upload even if the spec is incomplete.
 * Useful for handling underspecified OpenAPI documents.
 *
 * @param operation - The operation object
 * @returns True if description/summary implies file upload
 */
export function isImpliedFileUpload(
  operation: OpenAPIV3.OperationObject,
): boolean {
  // If requestBody is explicitly defined, we should trust it instead of heuristics
  if (operation.requestBody) return false;

  const text = `${operation.summary || ""} ${
    operation.description || ""
  }`.toLowerCase();
  return (
    text.includes("upload") && (text.includes("file") || text.includes("excel"))
  );
}

/**
 * Detects direct binary body content types (e.g. image/png, application/octet-stream).
 * Returns the media type string if found, or null.
 *
 * @param content - The request body content object
 * @returns The binary media type string, or null if not found
 */
export function isBinaryBodyContent(
  content: { [media: string]: OpenAPIV3.MediaTypeObject } | undefined,
): string | null {
  if (!content) return null;

  for (const [mediaType, mediaObj] of Object.entries(content)) {
    // Skip JSON and multipart — those are handled separately
    if (
      mediaType === "application/json" ||
      mediaType.startsWith("multipart/")
    ) {
      continue;
    }

    const schema = mediaObj?.schema;
    if (
      isSchemaObject(schema) &&
      schema.type === "string" &&
      schema.format === "binary"
    ) {
      return mediaType;
    }
  }

  return null;
}

/**
 * Checks if any response in the set is a binary format
 *
 * @param responses - The responses object
 * @returns True if any response is binary
 */
export function isBinaryResponse(
  responses: OpenAPIV3.ResponsesObject | undefined,
): boolean {
  if (!responses) return false;
  for (const response of Object.values(responses)) {
    if (isReferenceObject(response)) continue;
    const content = response.content;
    if (!content) continue;

    const binaryTypes = [
      "application/octet-stream",
      "application/pdf",
      "image/",
      "video/",
      "audio/",
      "application/zip",
      "application/vnd.openxmlformats-officedocument", // Excel, Word, etc.
    ];

    if (
      Object.keys(content).some((type) =>
        binaryTypes.some((bt) => type.startsWith(bt)),
      )
    ) {
      return true;
    }

    // Heuristic: check description if content is missing
    const description = (response.description || "").toLowerCase();
    if (
      description.includes("download") ||
      description.includes("excel") ||
      description.includes("file")
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if media type object has a schema
 *
 * @param mediaType - The media type object to check
 * @returns True if mediaType has schema property
 */
export function hasSchema(
  mediaType: OpenAPIV3.MediaTypeObject | undefined,
): mediaType is OpenAPIV3.MediaTypeObject & {
  schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject;
} {
  return (
    mediaType !== null &&
    mediaType !== undefined &&
    typeof mediaType === "object" &&
    "schema" in mediaType &&
    mediaType.schema !== undefined
  );
}

/**
 * Safely extracts schema from content object, prioritizing JSON then multipart
 *
 * @param content - The content object
 * @returns The schema or null if not found
 */
export function getJsonSchema(
  content: { [media: string]: OpenAPIV3.MediaTypeObject } | undefined,
): OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | null {
  if (!content) return null;

  const jsonContent = content["application/json"];
  if (hasSchema(jsonContent)) {
    return jsonContent.schema!;
  }

  const multipartContent = content["multipart/form-data"];
  if (hasSchema(multipartContent)) {
    return multipartContent.schema!;
  }

  // Fallback to first available schema
  for (const mediaType of Object.values(content)) {
    if (hasSchema(mediaType)) {
      return mediaType.schema!;
    }
  }

  return null;
}
