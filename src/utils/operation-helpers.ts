// src/utils/operation-helpers.ts
import { OpenAPIV3 } from 'openapi-types';
import { camelCase, pascalCase } from 'change-case';

/**
 * Valid HTTP methods for OpenAPI operations
 */
export const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const;
export type HttpMethod = typeof HTTP_METHODS[number];

/**
 * Represents a grouped operation with method, path, and operation object
 */
export interface GroupedOperation {
  method: HttpMethod;
  path: string;
  operation: OpenAPIV3.OperationObject;
}

/**
 * Groups all operations in a paths object by their primary tag.
 * Operations without tags are grouped under 'Default'.
 *
 * @param paths - OpenAPI PathsObject
 * @returns Record mapping tag names to arrays of operations
 *
 * @example
 * const paths = {
 *   '/users': {
 *     get: { tags: ['Users'], responses: {} },
 *     post: { tags: ['Users'], responses: {} }
 *   },
 *   '/orders': {
 *     get: { tags: ['Orders'], responses: {} }
 *   }
 * };
 * groupOperationsByTag(paths) → { Users: [...], Orders: [...] }
 */
export function groupOperationsByTag(
  paths: OpenAPIV3.PathsObject | undefined
): Record<string, GroupedOperation[]> {
  if (!paths) {
    return {};
  }

  const groups: Record<string, GroupedOperation[]> = {};

  for (const [pathUrl, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue;

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;

      const tag = operation.tags?.[0] ?? 'Default';

      if (!groups[tag]) {
        groups[tag] = [];
      }

      groups[tag].push({
        method,
        path: pathUrl,
        operation,
      });
    }
  }

  return groups;
}

/**
 * Extracts the operation name from an operation object.
 * Uses operationId if present, falling back to generated name.
 * Normalizes all operationIds to camelCase for consistency.
 *
 * @param operation - OpenAPI OperationObject
 * @param resourceName - The resource name (tag)
 * @param httpMethod - HTTP method (used for fallback)
 * @returns Operation method name in camelCase
 *
 * @example
 * // With operationId (Tag_Method format)
 * getOperationName({ operationId: 'Users_GetAll', responses: {} }, 'Users') → 'getAll'
 *
 * // With operationId (kebab-case)
 * getOperationName({ operationId: 'create-user', responses: {} }, 'Users') → 'createUser'
 *
 * // With operationId (snake_case)
 * getOperationName({ operationId: 'create_user', responses: {} }, 'Users') → 'createUser'
 *
 * // With special characters
 * getOperationName({ operationId: 'special!@#$%Chars', responses: {} }, 'Users') → 'specialChars'
 *
 * // Without operationId (using HTTP method)
 * getOperationName({ responses: {} }, 'Users', 'get') → 'getUsers'
 */
export function getOperationName(
  operation: OpenAPIV3.OperationObject,
  resourceName: string,
  httpMethod?: HttpMethod
): string {
  if (operation.operationId) {
    // Handle Tag_Method format: extract just the method part
    if (operation.operationId.includes('_')) {
      const parts = operation.operationId.split('_');
      const methodPart = parts[parts.length - 1];
      // Normalize to camelCase to handle any case format
      return camelCase(methodPart);
    }

    // Normalize operationId to camelCase (handles kebab-case, snake_case, special chars)
    return camelCase(operation.operationId);
  }

  // Fallback: use HTTP method + resource name
  if (httpMethod) {
    return camelCase(`${httpMethod} ${resourceName}`);
  }

  return camelCase(`operation ${resourceName}`);
}

/**
 * Parses an operationId that uses Tag_method format.
 *
 * @param operationId - The operationId to parse
 * @returns Object with tag and method, or null if not in Tag_method format
 *
 * @example
 * parseOperationId('Users_GetAll') → { tag: 'Users', method: 'GetAll' }
 * parseOperationId('getUserById') → null
 */
export function parseOperationId(
  operationId: string | undefined
): { tag: string; method: string } | null {
  if (!operationId || !operationId.includes('_')) {
    return null;
  }

  const parts = operationId.split('_');
  if (parts.length !== 2) {
    return null;
  }

  // Ensure both parts are non-empty
  if (!parts[0] || !parts[1]) {
    return null;
  }

  return {
    tag: parts[0],
    method: parts[1],
  };
}

/**
 * Builds the endpoint decorator function name from a method name.
 *
 * @param methodName - The method name in camelCase
 * @returns Decorator function name in PascalCase with 'Endpoint' suffix
 *
 * @example
 * buildEndpointDecoratorName('getAll') → 'GetAllEndpoint'
 * buildEndpointDecoratorName('getUserById') → 'GetUserByIdEndpoint'
 */
export function buildEndpointDecoratorName(methodName: string): string {
  if (typeof methodName !== 'string') {
    throw new Error(`buildEndpointDecoratorName() requires a string, received: ${typeof methodName}`);
  }

  if (methodName.length === 0) {
    return 'Endpoint';
  }

  const pascalCase = methodName.charAt(0).toUpperCase() + methodName.slice(1);
  return `${pascalCase}Endpoint`;
}

/**
 * Normalizes a tag name by removing whitespace and special characters.
 * Converts to PascalCase for use in class names.
 *
 * @param tag - OpenAPI tag
 * @returns Normalized tag name suitable for class/file names in PascalCase
 *
 * @example
 * normalizeTagName('User Management') → 'UserManagement'
 * normalizeTagName('API v2') → 'ApiV2'
 * normalizeTagName('pet-store') → 'PetStore'
 * normalizeTagName('special!@#$%chars') → 'SpecialChars'
 */
export function normalizeTagName(tag: string): string {
  if (typeof tag !== 'string') {
    throw new Error(`normalizeTagName() requires a string, received: ${typeof tag}`);
  }

  return pascalCase(tag);
}

/**
 * Builds a resource name from a tag.
 * Same as normalizeTagName but more semantically descriptive.
 *
 * @param tag - OpenAPI tag
 * @returns Resource name
 */
export function buildResourceName(tag: string): string {
  return normalizeTagName(tag);
}

/**
 * Builds the controller class name from a resource name.
 *
 * @param resourceName - The resource name
 * @returns Controller class name
 *
 * @example
 * buildControllerClassName('Users') → 'UsersController'
 * buildControllerClassName('OrderItems') → 'OrderItemsController'
 */
export function buildControllerClassName(resourceName: string): string {
  if (typeof resourceName !== 'string') {
    throw new Error(`buildControllerClassName() requires a string, received: ${typeof resourceName}`);
  }

  return `${resourceName}Controller`;
}

/**
 * Builds the service interface name from a resource name.
 *
 * @param resourceName - The resource name
 * @returns Service interface name
 *
 * @example
 * buildServiceInterfaceName('Users') → 'IUsersService'
 * buildServiceInterfaceName('OrderItems') → 'IOrderItemsService'
 */
export function buildServiceInterfaceName(resourceName: string): string {
  if (typeof resourceName !== 'string') {
    throw new Error(`buildServiceInterfaceName() requires a string, received: ${typeof resourceName}`);
  }

  return `I${resourceName}Service`;
}
