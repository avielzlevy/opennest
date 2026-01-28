// src/cli/operation-parser.ts

import { ParsedApiResource } from '../types/openapi';
import { detectConvention } from '../utils/naming-convention';
import {
  shouldUseFallback,
  generateFallbackOperationName,
  type FallbackGenerationResult,
} from '../utils/path-fallback';

/**
 * Result of parsing an operation's name (operationId or fallback)
 */
export interface OperationNameParseResult {
  /** The original OpenAPI operation path */
  path: string;

  /** The original HTTP method */
  method: string;

  /** The operationId from the spec (if present) */
  originalOperationId?: string;

  /** The final normalized operation name */
  operationName: string;

  /** The detected naming convention */
  convention: 'tag_method' | 'snake_case' | 'camel_case' | 'unknown';

  /** Whether this used fallback generation */
  usedFallback: boolean;

  /** If fallback was used, the fallback result */
  fallbackResult?: FallbackGenerationResult;

  /** Tag extracted (only for Tag_method format) */
  tag?: string;

  /** Method extracted (only for Tag_method format) */
  tagMethod?: string;

  /** Any warnings generated during parsing */
  warnings: string[];
}

/**
 * Parses an operationId from an OpenAPI operation.
 * Detects naming convention, applies case normalization, or generates fallback from path.
 *
 * @param resource - The OpenAPI resource with path, method, operationId
 * @returns OperationNameParseResult with normalized name and metadata
 */
export function parseOperationName(resource: ParsedApiResource): OperationNameParseResult {
  const warnings: string[] = [];

  // Check if operationId should be replaced with fallback
  if (shouldUseFallback(resource.operationId)) {
    const reason = resource.operationId === undefined
      ? 'operationId was not provided in spec'
      : resource.operationId === null
        ? 'operationId was null'
        : 'operationId was empty string';

    const fallbackResult = generateFallbackOperationName(
      resource.path,
      resource.method,
      reason
    );

    if (!fallbackResult.success && fallbackResult.error) {
      warnings.push(`Fallback generation had warning: ${fallbackResult.error}`);
    }

    return {
      path: resource.path,
      method: resource.method,
      operationName: fallbackResult.operationName,
      convention: 'unknown',
      usedFallback: true,
      fallbackResult,
      warnings,
    };
  }

  // operationId is present, detect convention and normalize
  const conventionResult = detectConvention(resource.operationId!);

  return {
    path: resource.path,
    method: resource.method,
    originalOperationId: resource.operationId,
    operationName: conventionResult.operationName,
    convention: conventionResult.convention,
    usedFallback: false,
    tag: conventionResult.tag,
    tagMethod: conventionResult.method,
    warnings: [...warnings, ...conventionResult.warnings],
  };
}

/**
 * Error tracking for operations that couldn't be parsed
 */
export interface SkippedOperation {
  /** The path that was skipped */
  path: string;

  /** The HTTP method */
  method: string;

  /** The operationId (if present) */
  operationId?: string;

  /** Why it was skipped */
  reason: string;

  /** Error details if applicable */
  error?: string;
}

/**
 * Result of parsing all operations from a spec
 */
export interface ParseSpecOperationsResult {
  /** Successfully parsed operations */
  operations: OperationNameParseResult[];

  /** Operations that were skipped due to errors */
  skipped: SkippedOperation[];

  /** General warnings about the parsing process */
  warnings: string[];
}
