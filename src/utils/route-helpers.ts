// src/utils/route-helpers.ts

import { OpenAPIV3 } from "openapi-types";
import { capitalize } from "./formatting-helpers";
import type { SchemaMap } from "./schema-helpers";

/**
 * Context for enum-aware parameter type inference.
 */
export interface InferParameterTypeContext {
  resourceName: string;
  paramName: string;
  schemas: SchemaMap;
}

/**
 * Transforms an OpenAPI path into a NestJS-compatible route path.
 * Removes /api prefix, removes resource prefix, converts {param} to :param.
 *
 * @param path - OpenAPI path (e.g., /api/users/{id})
 * @returns NestJS route path (e.g., :id)
 * @throws Error if path is not a valid string
 *
 * @example
 * buildHttpRoute('/api/users/{id}') → ':id'
 * buildHttpRoute('/api/users/{userId}/orders/{orderId}') → ':userId/orders/:orderId'
 * buildHttpRoute('/api/users') → ''
 */
export function buildHttpRoute(path: string): string {
  if (typeof path !== 'string') {
    throw new Error(`buildHttpRoute() requires a string path, received: ${typeof path}`);
  }

  const parts = path.split('/').filter(p => p);

  // Remove 'api' prefix if present
  if (parts.length > 0 && parts[0] === 'api') {
    parts.shift();
  }

  // Remove resource prefix (first segment after api)
  if (parts.length > 0) {
    parts.shift();
  }

  // Convert OpenAPI {param} to Express :param
  return parts
    .map(p => p.startsWith('{') && p.endsWith('}') ? `:${p.slice(1, -1)}` : p)
    .join('/');
}

/**
 * Extracts parameter names from an OpenAPI path.
 *
 * @param path - OpenAPI path (e.g., /api/users/{id}/posts/{postId})
 * @returns Array of parameter names (e.g., ['id', 'postId'])
 */
export function extractPathParameters(path: string): string[] {
  if (typeof path !== 'string') {
    throw new Error(`extractPathParameters() requires a string path, received: ${typeof path}`);
  }

  const paramRegex = /\{([^}]+)\}/g;
  const params: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = paramRegex.exec(path)) !== null) {
    params.push(match[1]);
  }

  return params;
}

/**
 * Normalizes a resource name by removing whitespace.
 *
 * @param tag - OpenAPI tag (e.g., 'User Management')
 * @returns Normalized resource name (e.g., 'UserManagement')
 */
export function normalizeResourceName(tag: string): string {
  if (typeof tag !== 'string') {
    throw new Error(`normalizeResourceName() requires a string, received: ${typeof tag}`);
  }

  return tag.replace(/\s+/g, '');
}

/**
 * Builds the base path for a controller from a tag.
 *
 * @param tag - OpenAPI tag (e.g., 'Users')
 * @returns Controller base route (e.g., 'api/users')
 */
export function buildControllerBasePath(tag: string): string {
  if (typeof tag !== 'string') {
    throw new Error(`buildControllerBasePath() requires a string, received: ${typeof tag}`);
  }

  return `api/${tag.toLowerCase()}`;
}

/**
 * Sanitizes a parameter name to a valid TypeScript identifier.
 * Converts hyphenated and snake_case to camelCase.
 *
 * @param name - Parameter name (e.g., 'user-id', 'user_id')
 * @returns Sanitized name (e.g., 'userId')
 */
export function sanitizeParamName(name: string): string {
  if (typeof name !== 'string') {
    throw new Error(`sanitizeParamName() requires a string, received: ${typeof name}`);
  }

  // Replace hyphens, underscores, and spaces followed by a character with uppercase character
  return name.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
}

/**
 * Maps OpenAPI parameter location to NestJS decorator name.
 *
 * @param location - Parameter location ('path', 'query', 'header', 'cookie')
 * @returns NestJS decorator name ('Param', 'Query', 'Headers')
 */
export function mapParameterLocation(location: string): string {
  if (typeof location !== 'string') {
    throw new Error(`mapParameterLocation() requires a string, received: ${typeof location}`);
  }

  const mapping: Record<string, string> = {
    path: 'Param',
    query: 'Query',
    header: 'Headers',
    cookie: 'Headers',  // NestJS doesn't have a @Cookie decorator in common module
  };

  return mapping[location] || 'Query';  // Default to Query for unknown locations
}

/**
 * Infers TypeScript type from OpenAPI schema.
 * Used for parameter type annotations.
 *
 * When a context is provided and the schema has enum values, attempts to find
 * a matching enum type from the DTO schemas. If a schema named `resourceName`
 * has a property with the same name and enum values, returns the DTO enum type
 * name (e.g., `PetStatus`) instead of `string`.
 *
 * @param schema - OpenAPI schema or unknown
 * @param context - Optional context for enum type resolution
 * @returns TypeScript type string ('string', 'number', 'boolean', or an enum type name)
 */
export function inferParameterType(schema: unknown, context?: InferParameterTypeContext): string {
  if (!schema || typeof schema !== 'object') {
    return 'string';  // Default to string
  }

  const schemaObj = schema as { type?: string; enum?: unknown[] };

  if (schemaObj.type === 'integer' || schemaObj.type === 'number') {
    return 'number';
  }

  if (schemaObj.type === 'boolean') {
    return 'boolean';
  }

  // Check for enum type from DTO schemas
  if (schemaObj.enum && context) {
    const { resourceName, paramName, schemas } = context;
    if (schemas) {
      const resourceSchema = schemas[resourceName] as OpenAPIV3.SchemaObject | undefined;
      if (resourceSchema?.properties) {
        const prop = resourceSchema.properties[paramName] as OpenAPIV3.SchemaObject | undefined;
        if (prop?.enum) {
          return `${resourceName}${capitalize(paramName)}`;
        }
      }
    }
  }

  return 'string';  // Default to string for all other cases
}
