// src/utils/naming-convention.ts

import { camelCase } from 'change-case';
import { sanitizeString, ensureValidIdentifier, isValidIdentifier } from './string-sanitizer';

/**
 * Represents the detected naming convention and conversion result
 */
export interface ConventionResult {
  /** The detected convention type */
  convention: 'tag_method' | 'snake_case' | 'camel_case' | 'unknown';

  /** The normalized operation name (camelCase) */
  operationName: string;

  /** Tag part (only populated for Tag_method format) */
  tag?: string;

  /** Method part (only populated for Tag_method format) */
  method?: string;

  /** Whether the input required sanitization */
  wasSanitized: boolean;

  /** Warnings if any (e.g., "contained invalid chars") */
  warnings: string[];
}

/**
 * Detects if a string matches the Tag_method format.
 * Criteria: exactly one underscore, both parts non-empty and valid
 *
 * @param input - Sanitized string to test
 * @returns {tag: string, method: string} if matches, null otherwise
 */
function detectTagMethod(input: string): { tag: string; method: string } | null {
  const underscoreCount = (input.match(/_/g) || []).length;

  if (underscoreCount !== 1) {
    return null;
  }

  const [tag, method] = input.split('_');

  // Both parts must be non-empty and valid identifiers
  if (!tag || !method || !isValidIdentifier(tag) || !isValidIdentifier(method)) {
    return null;
  }

  return { tag, method };
}

/**
 * Detects if a string matches the snake_case format.
 * Criteria: 2+ underscores
 *
 * @param input - Sanitized string to test
 * @returns true if matches snake_case pattern
 */
function detectSnakeCase(input: string): boolean {
  const underscoreCount = (input.match(/_/g) || []).length;
  return underscoreCount >= 2;
}

/**
 * Detects if a string matches the camelCase format.
 * Criteria: starts lowercase, has mixed case, no underscores
 *
 * @param input - Sanitized string to test
 * @returns true if matches camelCase pattern
 */
function detectCamelCase(input: string): boolean {
  // Pattern: lowercase start, optional uppercase letters within
  const pattern = /^[a-z][a-zA-Z0-9]*$/;
  return pattern.test(input);
}

/**
 * Detects if a string matches the PascalCase format.
 * Criteria: starts uppercase, has mixed case, no underscores
 *
 * @param input - Sanitized string to test
 * @returns true if matches PascalCase pattern
 */
function detectPascalCase(input: string): boolean {
  // Pattern: uppercase start, optional uppercase letters within
  const pattern = /^[A-Z][a-zA-Z0-9]*$/;
  return pattern.test(input);
}

/**
 * Main convention detection and normalization function.
 * Applies priority: Tag_method > snake_case > camelCase/PascalCase > unknown
 *
 * @param input - Raw operationId string
 * @returns ConventionResult with detected convention and normalized name
 */
export function detectConvention(input: string): ConventionResult {
  const warnings: string[] = [];

  // Validate input
  if (!input || typeof input !== 'string') {
    return {
      convention: 'unknown',
      operationName: '_',
      wasSanitized: true,
      warnings: ['Input is null, undefined, or not a string'],
    };
  }

  // Sanitize input
  const sanitized = sanitizeString(input);
  const wasSanitized = sanitized !== input;

  if (wasSanitized) {
    warnings.push('Input contained invalid characters and was sanitized');
  }

  if (!sanitized) {
    return {
      convention: 'unknown',
      operationName: '_',
      wasSanitized: true,
      warnings: [...warnings, 'Sanitization resulted in empty string'],
    };
  }

  // Priority 1: Tag_method (exactly one underscore)
  const tagMethod = detectTagMethod(sanitized);
  if (tagMethod) {
    const normalized = camelCase(`${tagMethod.tag}_${tagMethod.method}`);
    return {
      convention: 'tag_method',
      operationName: normalized,
      tag: tagMethod.tag,
      method: tagMethod.method,
      wasSanitized,
      warnings,
    };
  }

  // Priority 2: snake_case (2+ underscores)
  if (detectSnakeCase(sanitized)) {
    const normalized = camelCase(sanitized);
    return {
      convention: 'snake_case',
      operationName: normalized,
      wasSanitized,
      warnings,
    };
  }

  // Priority 3: camelCase (lowercase start)
  if (detectCamelCase(sanitized)) {
    return {
      convention: 'camel_case',
      operationName: sanitized,
      wasSanitized,
      warnings,
    };
  }

  // Priority 3b: PascalCase → convert to camelCase
  if (detectPascalCase(sanitized)) {
    const normalized = camelCase(sanitized);
    return {
      convention: 'camel_case',
      operationName: normalized,
      wasSanitized,
      warnings: [...warnings, 'PascalCase detected and converted to camelCase'],
    };
  }

  // Fallback: treat as single operation name (already sanitized)
  const fallback = ensureValidIdentifier(sanitized);
  return {
    convention: 'unknown',
    operationName: fallback,
    wasSanitized,
    warnings: [...warnings, 'Could not detect convention, treated as single name'],
  };
}

/**
 * Convenience function: detect convention and return just the normalized name
 *
 * @param operationId - Raw operationId string
 * @returns Normalized camelCase operation name
 */
export function normalizeOperationName(operationId: string): string {
  return detectConvention(operationId).operationName;
}
