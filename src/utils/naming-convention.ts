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
 * Detects naming convention and normalizes operationId to camelCase.
 *
 * This function analyzes an operationId string and determines which naming convention
 * it follows, then normalizes it to a consistent camelCase format suitable for
 * TypeScript method names. The function never throws - it always returns a valid result.
 *
 * Naming Convention Priority:
 * 1. Tag_method: Exactly one underscore (e.g., User_GetById → userGetById)
 * 2. snake_case: 2+ underscores (e.g., get_users_by_id → getUsersById)
 * 3. camelCase: Lowercase start (e.g., getUser → getUser)
 * 4. PascalCase: Uppercase start → converted to camelCase (e.g., GetUser → getUser)
 * 5. Unknown: Treated as single name with sanitization (e.g., invalid!chars → invalidchars)
 *
 * @param input - Raw operationId string from OpenAPI specification
 * @returns ConventionResult with detected convention, normalized name, and metadata
 *
 * @example
 * // Tag_method format (Azure style)
 * const result = detectConvention('User_GetById');
 * // → { convention: 'tag_method', operationName: 'userGetById', tag: 'User', method: 'GetById' }
 *
 * @example
 * // snake_case format (Python style)
 * detectConvention('get_users_by_id');
 * // → { convention: 'snake_case', operationName: 'getUsersById' }
 *
 * @example
 * // Graceful handling of invalid input
 * detectConvention(null);
 * // → { convention: 'unknown', operationName: '_', wasSanitized: true, warnings: [...] }
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
 * Convenience function to quickly normalize an operationId to camelCase.
 *
 * This is a simplified version of detectConvention that returns only the
 * normalized operation name without additional metadata. Use this when you
 * only need the final camelCase result and don't care about the convention
 * type, warnings, or tag/method extraction.
 *
 * @param operationId - Raw operationId string from OpenAPI specification
 * @returns Normalized camelCase operation name suitable for TypeScript methods
 *
 * @example
 * normalizeOperationName('User_GetById');    // → 'userGetById'
 * normalizeOperationName('get_users_by_id'); // → 'getUsersById'
 * normalizeOperationName('GetUser');         // → 'getUser'
 */
export function normalizeOperationName(operationId: string): string {
  return detectConvention(operationId).operationName;
}
