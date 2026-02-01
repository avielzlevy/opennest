/**
 * TypeScript/JavaScript identifier validation and sanitization
 */

/**
 * Reserved keywords in JavaScript/TypeScript
 */
const RESERVED_WORDS = new Set([
  // JavaScript keywords
  'abstract', 'arguments', 'await', 'boolean', 'break', 'byte', 'case', 'catch',
  'char', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do',
  'double', 'else', 'enum', 'eval', 'export', 'extends', 'false', 'final',
  'finally', 'float', 'for', 'function', 'goto', 'if', 'implements', 'import',
  'in', 'instanceof', 'int', 'interface', 'let', 'long', 'native', 'new', 'null',
  'package', 'private', 'protected', 'public', 'return', 'short', 'static',
  'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient',
  'true', 'try', 'typeof', 'var', 'void', 'volatile', 'while', 'with', 'yield',
]);

/**
 * NestJS decorator names that may conflict with schema names
 */
const NESTJS_CONFLICTING_NAMES = new Set([
  'ApiResponse', 'ApiParam', 'ApiQuery', 'ApiBody', 'ApiHeader', 'ApiCookie',
  'ApiExcludeEndpoint', 'ApiSecurity', 'ApiOAuth2', 'ApiBearerAuth',
  'ApiBasicAuth', 'ApiKeyAuth', 'ApiOperation', 'ApiProduces', 'ApiConsumes',
  'ApiTags', 'ApiExtraModels', 'ApiImplicitParam', 'ApiImplicitQuery',
  'ApiImplicitBody', 'ApiExtension', 'ApiDefaultResponse', 'ApiDocumentation',
  'Controller', 'Injectable', 'Module', 'Patch', 'Post', 'Put', 'Delete', 'Get',
  'Head', 'Options', 'Param', 'Query', 'Body', 'Headers', 'Req', 'Res',
]);

/**
 * Check if a string is a valid JavaScript identifier
 *
 * A valid identifier must:
 * - Start with a letter, underscore, or dollar sign
 * - Contain only letters, digits, underscores, and dollar signs
 * - Not be a reserved word
 *
 * @param name - The identifier to validate
 * @returns True if valid JavaScript identifier
 */
export function isValidIdentifier(name: string): boolean {
  if (!name || typeof name !== 'string') return false;

  // Check reserved words
  if (RESERVED_WORDS.has(name.toLowerCase())) return false;

  // Check valid start character (letter, underscore, $)
  if (!/^[a-zA-Z_$]/.test(name)) return false;

  // Check valid continuation (letter, digit, underscore, $)
  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) return false;

  return true;
}

/**
 * Check if a name conflicts with NestJS decorator names
 *
 * @param name - The name to check
 * @returns True if name conflicts
 */
export function hasNestJsConflict(name: string): boolean {
  return NESTJS_CONFLICTING_NAMES.has(name);
}

/**
 * Get all reserved words as array
 *
 * @returns Array of reserved words
 */
export function getReservedWords(): string[] {
  return Array.from(RESERVED_WORDS);
}

/**
 * Get all conflicting NestJS decorator names
 *
 * @returns Array of conflicting names
 */
export function getConflictingNames(): string[] {
  return Array.from(NESTJS_CONFLICTING_NAMES);
}

/**
 * Sanitize a string to be a valid JavaScript identifier
 *
 * Removes invalid characters, adds prefix if needed, and handles reserved words.
 *
 * @param name - The name to sanitize
 * @param prefix - Prefix to use if sanitization is needed (default: 'Generated')
 * @returns A valid JavaScript identifier
 */
export function sanitizeIdentifier(name: string, prefix = 'Generated'): string {
  if (!name || typeof name !== 'string') {
    return prefix;
  }

  // Remove leading/trailing whitespace
  let sanitized = name.trim();

  // Replace invalid characters with underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9_$]/g, '_');

  // Remove leading underscores if name starts with digit
  while (sanitized.length > 0 && /^\d/.test(sanitized)) {
    sanitized = sanitized.slice(1);
  }

  // Ensure valid start character
  if (!sanitized || !/^[a-zA-Z_$]/.test(sanitized)) {
    sanitized = prefix + sanitized;
  }

  // Handle reserved words by appending underscore
  if (RESERVED_WORDS.has(sanitized.toLowerCase())) {
    sanitized = sanitized + '_';
  }

  return sanitized;
}

/**
 * Handle NestJS conflicts by appending suffix
 *
 * @param name - The name that conflicts
 * @param suffix - Suffix to append (default: 'Dto')
 * @returns Name with suffix appended
 */
export function resolveNestJsConflict(name: string, suffix = 'Dto'): string {
  if (hasNestJsConflict(name)) {
    return name + suffix;
  }
  return name;
}
