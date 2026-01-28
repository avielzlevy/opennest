// src/utils/string-sanitizer.ts

/**
 * Sanitizes a string by removing invalid characters and validating as TypeScript identifier.
 * Removes: special chars, spaces, hyphens, etc.
 * Preserves: alphanumeric, underscore, dollar sign
 *
 * @param input - Raw operationId or name
 * @returns Sanitized string with invalid chars removed
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove all chars except alphanumeric, underscore, dollar sign
  return input.replace(/[^a-zA-Z0-9_$]/g, '');
}

/**
 * Validates if a string is a valid TypeScript identifier.
 * Pattern: must start with letter, underscore, or dollar sign
 *         followed by any alphanumeric, underscore, or dollar sign
 *
 * @param identifier - String to validate
 * @returns true if valid TypeScript identifier
 */
export function isValidIdentifier(identifier: string): boolean {
  if (!identifier || typeof identifier !== 'string') {
    return false;
  }

  const pattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
  return pattern.test(identifier);
}

/**
 * Ensures a string is a valid TypeScript identifier.
 * If invalid, prepends underscore to make valid.
 *
 * @param input - Raw string
 * @returns Valid TypeScript identifier
 */
export function ensureValidIdentifier(input: string): string {
  const sanitized = sanitizeString(input);

  if (!sanitized) {
    return '_'; // Fallback for completely invalid input
  }

  if (isValidIdentifier(sanitized)) {
    return sanitized;
  }

  // Prepend underscore if starts with number
  return '_' + sanitized;
}
