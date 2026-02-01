// src/utils/formatting-helpers.ts

/**
 * Capitalizes the first character of a string.
 * Used for generating PascalCase class names and method decorators.
 *
 * @param str - The input string
 * @returns String with first character capitalized
 * @throws Error if str is not a string
 */
export function capitalize(str: string): string {
  if (typeof str !== 'string') {
    throw new Error(`capitalize() requires a string, received: ${typeof str}`);
  }
  if (str.length === 0) {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats an array of strings as decorator arguments.
 * Example: ['arg1', 'arg2'] → "(arg1, arg2)"
 *
 * @param args - Array of argument strings
 * @returns Formatted decorator arguments string
 */
export function formatDecoratorArguments(args: string[]): string {
  if (!Array.isArray(args)) {
    throw new Error(`formatDecoratorArguments() requires an array, received: ${typeof args}`);
  }
  if (args.length === 0) {
    return '()';
  }
  return `(${args.join(', ')})`;
}

/**
 * Formats an import statement.
 * Example: formatImportSpecifier('User', './user') → "import { User } from './user';"
 *
 * @param name - Named import
 * @param path - Module path
 * @returns Formatted import statement
 */
export function formatImportSpecifier(name: string, path: string): string {
  if (typeof name !== 'string' || typeof path !== 'string') {
    throw new Error(`formatImportSpecifier() requires string arguments`);
  }
  return `import { ${name} } from '${path}';`;
}

/**
 * Builds a decorator string with optional arguments.
 * Example: buildDecoratorString('Get', ["'/users'"]) → "@Get('/users')"
 *
 * @param name - Decorator name
 * @param args - Optional array of argument strings
 * @returns Formatted decorator string
 */
export function buildDecoratorString(name: string, args?: string[]): string {
  if (typeof name !== 'string') {
    throw new Error(`buildDecoratorString() requires a string name, received: ${typeof name}`);
  }
  if (!args || args.length === 0) {
    return `@${name}()`;
  }
  return `@${name}(${args.join(', ')})`;
}

/**
 * Extracts the name from an OpenAPI $ref path.
 * Example: '#/components/schemas/UserDto' → 'UserDto'
 *
 * @param ref - The $ref path
 * @returns Extracted name or null if invalid
 */
export function extractRefName(ref: string): string | null {
  if (typeof ref !== 'string') {
    throw new Error(`extractRefName() requires a string, received: ${typeof ref}`);
  }

  const parts = ref.split('/');
  const name = parts[parts.length - 1];

  if (!name || name.length === 0) {
    return null;
  }

  return name;
}

/**
 * Normalizes schema names to avoid reserved word collisions.
 * Specifically handles 'Object' → 'ObjectDto' conversion.
 *
 * Note: For comprehensive identifier validation and NestJS conflict resolution,
 * use the identifier-validator module directly.
 *
 * @param name - The schema name
 * @returns Normalized name
 */
export function normalizeSchemaName(name: string): string {
  if (typeof name !== 'string') {
    throw new Error(`normalizeSchemaName() requires a string, received: ${typeof name}`);
  }

  if (name === 'Object') {
    return 'ObjectDto';
  }

  return name;
}

/**
 * Builds the import path for a DTO file.
 * Example: 'UserDto' → '../dtos/UserDto.dto'
 *
 * @param dtoName - The DTO class name
 * @returns Import path
 */
export function buildDtoImportPath(dtoName: string): string {
  if (typeof dtoName !== 'string') {
    throw new Error(`buildDtoImportPath() requires a string, received: ${typeof dtoName}`);
  }

  return `../dtos/${dtoName}.dto`;
}

/**
 * Converts a string to UPPER_SNAKE_CASE for enum constant names.
 * Example: 'ClientResponseDto' → 'CLIENT_RESPONSE_DTO'
 *
 * @param str - The input string
 * @returns UPPER_SNAKE_CASE string
 */
export function toConstantCase(str: string): string {
  if (typeof str !== 'string') {
    throw new Error(`toConstantCase() requires a string, received: ${typeof str}`);
  }

  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')  // Insert underscore between camelCase
    .replace(/[\s-]+/g, '_')              // Replace spaces and hyphens with underscores
    .toUpperCase();
}

/**
 * Converts an enum value to a valid TypeScript enum key.
 * Handles special characters and ensures valid identifier format.
 *
 * @param value - The enum value
 * @returns Valid enum key or quoted string if invalid identifier
 */
export function toEnumKey(value: string): string {
  if (typeof value !== 'string') {
    throw new Error(`toEnumKey() requires a string, received: ${typeof value}`);
  }

  const upper = value.toUpperCase().replace(/[\s-]/g, '_');

  // Check if it's a valid identifier (starts with letter or underscore, contains only alphanumeric and underscores)
  if (!/^[A-Z_][A-Z0-9_]*$/.test(upper)) {
    return `'${upper}'`;
  }

  return upper;
}
