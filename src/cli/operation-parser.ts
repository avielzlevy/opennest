// src/cli/operation-parser.ts

import { ParsedApiResource } from '../types/openapi';
import { detectConvention } from '../utils/naming-convention';
import {
  shouldUseFallback,
  generateFallbackOperationName,
  type FallbackGenerationResult,
} from '../utils/path-fallback';
import {
  traverseSpecOperations,
  groupOperationsByTag,
  mapToObject,
  type HttpMethod,
} from './spec-traverser';

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

/**
 * Parses all operations from an OpenAPI spec.
 * Applies naming convention detection and fallback generation to each operation.
 * Groups results by tag/resource.
 *
 * @param spec - The OpenAPI specification from Phase 1 loader
 * @param verbose - Enable detailed logging/warnings
 * @returns ParseSpecOperationsResult with all operations, skipped, and warnings
 */
export function parseSpecOperations(
  spec: Record<string, unknown>,
  verbose: boolean = false
): ParseSpecOperationsResult {
  const operations: OperationNameParseResult[] = [];
  const skipped: SkippedOperation[] = [];
  const warnings: string[] = [];

  try {
    // Extract all operations from spec
    const extractedOps = traverseSpecOperations(spec);

    if (extractedOps.length === 0) {
      warnings.push('No operations found in spec');
    }

    // Parse each operation
    for (const op of extractedOps) {
      try {
        const parseResult = parseOperationName(op);
        operations.push(parseResult);

        if (verbose && parseResult.warnings.length > 0) {
          warnings.push(`Operation ${op.path} ${op.method}: ${parseResult.warnings.join(', ')}`);
        }
      } catch (error) {
        skipped.push({
          path: op.path,
          method: op.method,
          operationId: op.operationId,
          reason: 'Error parsing operation name',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } catch (error) {
    warnings.push(`Error traversing spec: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    operations,
    skipped,
    warnings,
  };
}

/**
 * Groups parsed operations by tag for downstream generators.
 *
 * @param parseResult - Result from parseSpecOperations()
 * @returns Grouped operations indexed by tag
 */
export function groupParsedOperations(
  parseResult: ParseSpecOperationsResult
): Record<string, OperationNameParseResult[]> {
  const grouped: Record<string, OperationNameParseResult[]> = {};

  for (const op of parseResult.operations) {
    const tag = op.tag || 'Untagged';

    if (!grouped[tag]) {
      grouped[tag] = [];
    }

    grouped[tag].push(op);
  }

  return grouped;
}

/**
 * Full parsing pipeline: extract, detect conventions, group by tag.
 *
 * @param spec - The OpenAPI specification
 * @param verbose - Enable detailed warnings
 * @returns Complete parsing result with grouped operations
 */
export interface FullParsingResult extends ParseSpecOperationsResult {
  /** Operations grouped by tag */
  grouped: Record<string, OperationNameParseResult[]>;
}

export function parseOperationsFromSpec(
  spec: Record<string, unknown>,
  verbose: boolean = false
): FullParsingResult {
  const parseResult = parseSpecOperations(spec, verbose);

  return {
    ...parseResult,
    grouped: groupParsedOperations(parseResult),
  };
}
