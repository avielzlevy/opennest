// src/utils/path-fallback.ts

import { camelCase } from 'change-case';
import { ensureValidIdentifier } from './string-sanitizer';

/**
 * HTTP method to verb prefix mapping
 */
const METHOD_VERB_MAP: Record<string, string> = {
  'GET': 'get',
  'POST': 'create',
  'PUT': 'update',
  'DELETE': 'delete',
  'PATCH': 'update',
  'HEAD': 'head',
  'OPTIONS': 'options',
};

/**
 * Filters out path parameters (e.g., {id}, {userId}) from path segments
 *
 * @param segments - Path segments split by /
 * @returns Segments with parameter placeholders removed
 */
export function filterPathParams(segments: string[]): string[] {
  return segments.filter(segment => {
    // Remove empty segments and parameter placeholders
    if (!segment || /^\{.*\}$/.test(segment)) {
      return false;
    }
    return true;
  });
}

/**
 * Generates an operation name from an HTTP path and method.
 * Path: /users/{id} + GET → getUsers
 * Path: /api/users/roles + POST → createApiUsersRoles
 *
 * @param path - HTTP path (e.g., /users/{id})
 * @param method - HTTP method (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
 * @returns Generated operation name in camelCase
 */
export function generateOperationNameFromPath(
  path: string,
  method: string
): string {
  try {
    // Normalize path
    if (!path || typeof path !== 'string') {
      return method.toLowerCase();
    }

    // Split path into segments
    const segments = path
      .split('/')
      .filter(segment => segment.length > 0);

    // Filter out version and parameter segments
    const filteredSegments = filterPathParams(segments);

    if (filteredSegments.length === 0) {
      // Fallback: just use method
      return method.toLowerCase();
    }

    // Join segments with underscores and convert to camelCase
    const pathName = camelCase(filteredSegments.join('_'));

    // Get HTTP method verb
    const verb = METHOD_VERB_MAP[method.toUpperCase()] || method.toLowerCase();

    // Combine verb + path name
    const combined = camelCase(`${verb}_${pathName}`);

    return ensureValidIdentifier(combined);
  } catch (error) {
    // Fallback: return method
    return method.toLowerCase();
  }
}

/**
 * Represents a generation attempt and result
 */
export interface FallbackGenerationResult {
  /** Path that was processed */
  path: string;

  /** HTTP method */
  method: string;

  /** Generated operation name */
  operationName: string;

  /** Reason for generation (e.g., "operationId was empty") */
  reason: string;

  /** Whether generation succeeded */
  success: boolean;

  /** Error message if generation failed */
  error?: string;
}

/**
 * Generates an operation name with detailed result tracking.
 * Used when operationId is missing, null, empty, or invalid.
 *
 * @param path - HTTP path
 * @param method - HTTP method
 * @param reason - Why fallback was needed
 * @returns FallbackGenerationResult with operation name and metadata
 */
export function generateFallbackOperationName(
  path: string,
  method: string,
  reason: string
): FallbackGenerationResult {
  try {
    const operationName = generateOperationNameFromPath(path, method);

    return {
      path,
      method,
      operationName,
      reason,
      success: true,
    };
  } catch (error) {
    const operationName = method.toLowerCase();

    return {
      path,
      method,
      operationName,
      reason,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Determines if an operationId should trigger fallback generation.
 * Returns true if operationId is: null, undefined, empty string, or whitespace-only
 *
 * @param operationId - The operationId from OpenAPI spec
 * @returns true if operationId should be replaced with path-based name
 */
export function shouldUseFallback(operationId: any): boolean {
  if (operationId === null || operationId === undefined) {
    return true;
  }

  if (typeof operationId !== 'string') {
    return true;
  }

  if (operationId.trim().length === 0) {
    return true;
  }

  return false;
}
