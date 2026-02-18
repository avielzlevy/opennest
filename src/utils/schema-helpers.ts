// src/utils/schema-helpers.ts
import { OpenAPIV3 } from "openapi-types";
import { isReferenceObject, isArraySchema, getJsonSchema } from "./type-guards";
import { extractRefName, normalizeSchemaName } from "./formatting-helpers";

/**
 * Optional map of named schemas from `components.schemas`.
 * When provided, inline schemas are matched against named schemas so that
 * generators can resolve DTO names even when the spec has no `$ref`s
 * (e.g. after `SwaggerParser.bundle()` fully resolves internal refs).
 */
export type SchemaMap =
  | Record<string, OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject>
  | undefined;

/**
 * Deterministic JSON serialisation (sorted keys) for schema comparison.
 * Ignores `xml` and `example`/`examples` metadata that doesn't affect
 * structural equality.
 */
function stableStringify(obj: unknown): string {
  if (obj === null || obj === undefined) return String(obj);
  if (typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return "[" + obj.map(stableStringify).join(",") + "]";
  }
  const keys = Object.keys(obj as Record<string, unknown>)
    .filter((k) => k !== "xml" && k !== "example" && k !== "examples")
    .sort();
  return (
    "{" +
    keys
      .map(
        (k) =>
          JSON.stringify(k) +
          ":" +
          stableStringify((obj as Record<string, unknown>)[k]),
      )
      .join(",") +
    "}"
  );
}

/**
 * Attempts to match an inline (fully-resolved) schema against the named
 * schemas in `components.schemas`. Returns the normalised schema name on
 * match, or `null` if no match is found.
 */
export function matchInlineSchema(
  schema: OpenAPIV3.SchemaObject,
  schemas: SchemaMap,
): string | null {
  if (!schemas) return null;

  const needle = stableStringify(schema);

  for (const [name, candidate] of Object.entries(schemas)) {
    // Skip $ref entries in the components map (shouldn't happen after
    // bundle(), but be safe).
    if (isReferenceObject(candidate)) continue;

    if (stableStringify(candidate) === needle) {
      return normalizeSchemaName(name);
    }
  }
  return null;
}

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
  body: OpenAPIV3.RequestBodyObject | undefined,
  schemas?: SchemaMap,
): string | null {
  if (!body) {
    return null;
  }

  const schema = getJsonSchema(body.content);
  if (!schema) {
    return null;
  }

  // 1. Handle $ref (ideal path — spec was not dereferenced)
  if (isReferenceObject(schema)) {
    const refName = extractRefName(schema.$ref);
    if (!refName) {
      return null;
    }
    return normalizeSchemaName(refName);
  }

  // 2. Handle array of $ref (e.g. { type: "array", items: { $ref: "..." } })
  if (isArraySchema(schema) && schema.items) {
    if (isReferenceObject(schema.items)) {
      const refName = extractRefName(schema.items.$ref);
      if (refName) {
        return `${normalizeSchemaName(refName)}[]`;
      }
    }
    // Array with inline items — try matching against named schemas
    if (schemas && !isReferenceObject(schema.items)) {
      const match = matchInlineSchema(
        schema.items as OpenAPIV3.SchemaObject,
        schemas,
      );
      if (match) return `${match}[]`;
    }
    // Array with inline items — use title if available
    if (
      "title" in schema.items &&
      typeof (schema.items as any).title === "string"
    ) {
      return `${normalizeSchemaName((schema.items as any).title)}[]`;
    }
    // Array body but can't resolve item type
    return "any";
  }

  // 3. Fallback for resolved/inline schemas (e.g. after SwaggerParser.validate)
  //    Use the schema's `title` if available.
  if ("title" in schema && typeof (schema as any).title === "string") {
    return normalizeSchemaName((schema as any).title);
  }

  // 3b. Match inline schema against components.schemas
  if (schemas) {
    const match = matchInlineSchema(schema, schemas);
    if (match) return match;
  }

  // 4. If it's an object with properties, it's a real body — return a generic
  //    marker so the controller still gets a @Body() parameter.
  if ("properties" in schema || (schema as any).type === "object") {
    return "any";
  }

  return null;
}

/**
 * Extracts the full schema object from a request body.
 *
 * @param body - OpenAPI RequestBodyObject or undefined
 * @returns Schema object or null
 */
export function extractBodySchema(
  body: OpenAPIV3.RequestBodyObject | undefined,
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
  body: OpenAPIV3.RequestBodyObject | undefined,
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
  responses: OpenAPIV3.ResponsesObject | undefined,
): OpenAPIV3.ResponseObject | OpenAPIV3.ReferenceObject | undefined {
  if (!responses) {
    return undefined;
  }

  const success = responses["200"] || responses["201"];
  return success as
    | OpenAPIV3.ResponseObject
    | OpenAPIV3.ReferenceObject
    | undefined;
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
  responses: OpenAPIV3.ResponsesObject | undefined,
  schemas?: SchemaMap,
): string {
  const success = getSuccessResponse(responses);

  if (!success) {
    return "void";
  }

  // Check if it's a ResponseObject (not a reference)
  if (!("content" in success)) {
    return "any";
  }

  const schema = getJsonSchema(success.content);
  if (!schema) {
    return "any";
  }

  // Handle direct reference
  if (isReferenceObject(schema)) {
    const refName = extractRefName(schema.$ref);
    if (!refName) {
      return "any";
    }
    return normalizeSchemaName(refName);
  }

  // Handle array schemas
  if (isArraySchema(schema) && schema.items) {
    // Array of $ref
    if (isReferenceObject(schema.items)) {
      const refName = extractRefName(schema.items.$ref);
      if (!refName) {
        return "any";
      }
      return `${normalizeSchemaName(refName)}[]`;
    }
    // Array of inline items — match against named schemas
    if (schemas && !isReferenceObject(schema.items)) {
      const match = matchInlineSchema(
        schema.items as OpenAPIV3.SchemaObject,
        schemas,
      );
      if (match) return `${match}[]`;
    }
    // Array of resolved/inline items — use title if available
    if (
      "title" in schema.items &&
      typeof (schema.items as any).title === "string"
    ) {
      return `${normalizeSchemaName((schema.items as any).title)}[]`;
    }
  }

  // Resolved/inline object schema — use title if available
  if ("title" in schema && typeof (schema as any).title === "string") {
    return normalizeSchemaName((schema as any).title);
  }

  // Match inline schema against components.schemas
  if (schemas) {
    const match = matchInlineSchema(schema, schemas);
    if (match) return match;
  }

  return "any";
}

/**
 * Extracts the full response schema from a responses object.
 *
 * @param responses - OpenAPI ResponsesObject
 * @returns Response schema or null
 */
export function extractResponseSchema(
  responses: OpenAPIV3.ResponsesObject | undefined,
): OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | null {
  const success = getSuccessResponse(responses);

  if (!success) {
    return null;
  }

  if (!("content" in success)) {
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
  schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | null | undefined,
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
  schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | null | undefined,
): string {
  if (!schema) {
    return "any";
  }

  if (isReferenceObject(schema)) {
    const refName = extractRefName(schema.$ref);
    if (!refName) {
      return "any";
    }
    return normalizeSchemaName(refName);
  }

  if (isArraySchema(schema) && schema.items) {
    const itemType = getSchemaType(schema.items);
    return `${itemType}[]`;
  }

  // Handle primitive types
  if ("type" in schema) {
    switch (schema.type) {
      case "string":
        return "string";
      case "integer":
      case "number":
        return "number";
      case "boolean":
        return "boolean";
      case "object":
        return "object";
      default:
        return "any";
    }
  }

  return "any";
}

/**
 * Gets the item type for array schemas.
 *
 * @param schema - OpenAPI array schema
 * @returns Item type string
 */
export function getArrayItemType(schema: OpenAPIV3.ArraySchemaObject): string {
  if (!schema.items) {
    return "any";
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
  schema: OpenAPIV3.SchemaObject | undefined,
): boolean {
  if (!schema) {
    return false;
  }

  return schema.nullable === true;
}
