// src/cli/spec-traverser.ts

import { ParsedApiResource } from '../types/openapi';

/**
 * Valid HTTP methods in OpenAPI specs
 */
export const VALID_HTTP_METHODS = [
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'head',
  'options',
] as const;

export type HttpMethod = typeof VALID_HTTP_METHODS[number];

/**
 * Validates if a string is a valid HTTP method
 *
 * @param method - String to validate
 * @returns true if valid HTTP method
 */
export function isValidHttpMethod(method: string): boolean {
  return VALID_HTTP_METHODS.includes(method as HttpMethod);
}

/**
 * Extracts and validates a single operation from a path item.
 *
 * @param path - The OpenAPI path (e.g., /users/{id})
 * @param method - The HTTP method
 * @param operation - The OpenAPI operation object
 * @returns ParsedApiResource or null if invalid
 */
export function extractOperation(
  path: string,
  method: string,
  operation: any
): ParsedApiResource | null {
  // Validate inputs
  if (!path || typeof path !== 'string') {
    return null;
  }

  if (!isValidHttpMethod(method)) {
    return null;
  }

  if (!operation || typeof operation !== 'object') {
    return null;
  }

  // Extract operation properties
  const tags = Array.isArray(operation.tags) ? operation.tags : [];
  const operationId = typeof operation.operationId === 'string' ? operation.operationId : undefined;

  // Build ParsedApiResource
  return {
    path,
    method: method.toUpperCase() as any,
    operationId,
    summary: operation.summary,
    description: operation.description,
    parameters: operation.parameters || [],
    requestBody: operation.requestBody,
    responses: operation.responses || {},
    tags: tags.length > 0 ? tags : undefined,
    deprecated: operation.deprecated || false,
  };
}

/**
 * Traverses an OpenAPI spec and extracts all operations from the paths object.
 *
 * @param spec - The OpenAPI specification object
 * @returns Array of extracted ParsedApiResource objects
 */
export function traverseSpecOperations(spec: any): ParsedApiResource[] {
  const operations: ParsedApiResource[] = [];

  // Validate spec
  if (!spec || typeof spec !== 'object') {
    return operations;
  }

  const paths = spec.paths;
  if (!paths || typeof paths !== 'object') {
    return operations;
  }

  // Iterate over all paths
  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') {
      continue;
    }

    // Iterate over all HTTP methods in the path
    for (const method of VALID_HTTP_METHODS) {
      const operation = (pathItem as any)[method];

      if (!operation) {
        continue;
      }

      const extracted = extractOperation(path, method, operation);
      if (extracted) {
        operations.push(extracted);
      }
    }
  }

  return operations;
}

/**
 * Extracts the primary tag from an operation.
 * Returns the first tag if multiple tags exist, or undefined if no tags.
 *
 * @param operation - Parsed operation
 * @returns Primary tag or undefined
 */
export function getPrimaryTag(operation: ParsedApiResource): string | undefined {
  return operation.tags && operation.tags.length > 0 ? operation.tags[0] : undefined;
}

/**
 * Groups operations by their primary tag.
 * Operations without tags go into the "Untagged" group.
 *
 * @param operations - Array of parsed operations
 * @returns Map of tag to operations array
 */
export function groupOperationsByTag(
  operations: ParsedApiResource[]
): Map<string, ParsedApiResource[]> {
  const grouped = new Map<string, ParsedApiResource[]>();

  for (const operation of operations) {
    const tag = getPrimaryTag(operation) || 'Untagged';

    if (!grouped.has(tag)) {
      grouped.set(tag, []);
    }

    grouped.get(tag)!.push(operation);
  }

  return grouped;
}

/**
 * Converts a Map to a plain object for serialization.
 *
 * @param map - Map of tag to operations
 * @returns Plain object representation
 */
export function mapToObject(map: Map<string, ParsedApiResource[]>): Record<string, ParsedApiResource[]> {
  const obj: Record<string, ParsedApiResource[]> = {};

  for (const [tag, ops] of map) {
    obj[tag] = ops;
  }

  return obj;
}
