/**
 * Output Structure Manager
 * Handles path resolution for different output structure patterns
 */

import { join } from 'path';

/**
 * Configuration for output structure pattern
 * - type-based: Files organized by type (dtos/, controllers/, decorators/)
 * - domain-based: Files organized by domain/resource (pet/dtos/, pet/controllers/, store/dtos/, etc.)
 */
export interface OutputStructureConfig {
  structure: 'type-based' | 'domain-based';
}

/**
 * Resolves the output path for a generated file based on the structure configuration
 *
 * @param baseOutputPath - Base output directory (e.g., './generated')
 * @param fileType - Type of file being generated ('dtos' | 'controllers' | 'decorators' | 'common')
 * @param resourceName - Name of the resource/domain (e.g., 'pet', 'store', 'user')
 * @param config - Output structure configuration
 * @returns Resolved file path
 *
 * @example
 * // Type-based structure (default)
 * resolveOutputPath('./generated', 'dtos', 'pet', { structure: 'type-based' })
 * // Returns: './generated/dtos/pet.dto.ts'
 *
 * resolveOutputPath('./generated', 'controllers', 'user', { structure: 'type-based' })
 * // Returns: './generated/controllers/user.controller.ts'
 *
 * @example
 * // Domain-based structure
 * resolveOutputPath('./generated', 'dtos', 'pet', { structure: 'domain-based' })
 * // Returns: './generated/pet/dtos/pet.dto.ts'
 *
 * resolveOutputPath('./generated', 'controllers', 'user', { structure: 'domain-based' })
 * // Returns: './generated/user/controllers/user.controller.ts'
 */
export function resolveOutputPath(
  baseOutputPath: string,
  fileType: string,
  resourceName: string,
  config: OutputStructureConfig
): string {
  const fileName = getFileNameForType(fileType, resourceName);

  if (config.structure === 'domain-based') {
    // Domain-based: ${baseOutputPath}/${resourceName}/${fileType}/${fileName}
    return join(baseOutputPath, resourceName, fileType, fileName);
  } else {
    // Type-based (default): ${baseOutputPath}/${fileType}/${fileName}
    return join(baseOutputPath, fileType, fileName);
  }
}

/**
 * Generates the appropriate file name based on file type and resource name
 *
 * @param fileType - Type of file ('dtos' | 'controllers' | 'decorators' | 'common')
 * @param resourceName - Name of the resource
 * @returns File name with appropriate suffix
 *
 * @example
 * getFileNameForType('dtos', 'pet') // Returns: 'pet.dto.ts'
 * getFileNameForType('controllers', 'user') // Returns: 'user.controller.ts'
 * getFileNameForType('decorators', 'store') // Returns: 'store.decorator.ts'
 */
function getFileNameForType(fileType: string, resourceName: string): string {
  switch (fileType) {
    case 'dtos':
      return `${resourceName}.dto.ts`;
    case 'controllers':
      return `${resourceName}.controller.ts`;
    case 'decorators':
      return `${resourceName}.decorator.ts`;
    case 'common':
      return `${resourceName}.ts`;
    default:
      return `${resourceName}.ts`;
  }
}

/**
 * Extracts a domain/resource name from an OpenAPI tag or controller name
 * Converts PascalCase tags to lowercase domain names
 *
 * @param tag - OpenAPI tag or controller name (e.g., 'PetController', 'UserStore', 'pet')
 * @returns Lowercase domain name (e.g., 'pet', 'user-store', 'pet')
 *
 * @example
 * extractResourceNameFromTag('PetController') // Returns: 'pet'
 * extractResourceNameFromTag('UserStore') // Returns: 'user-store'
 * extractResourceNameFromTag('pet') // Returns: 'pet'
 * extractResourceNameFromTag('StoreInventory') // Returns: 'store-inventory'
 */
export function extractResourceNameFromTag(tag: string): string {
  // Remove common suffixes like 'Controller', 'Service', 'Api'
  const cleaned = tag
    .replace(/Controller$/i, '')
    .replace(/Service$/i, '')
    .replace(/Api$/i, '');

  // Convert PascalCase to kebab-case
  const kebabCase = cleaned
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');

  return kebabCase;
}

/**
 * Gets the directory path for a given file type and structure
 * This is useful for creating directories before writing files
 *
 * @param baseOutputPath - Base output directory
 * @param fileType - Type of file being generated
 * @param resourceName - Name of the resource (only used for domain-based structure)
 * @param config - Output structure configuration
 * @returns Directory path where files should be written
 *
 * @example
 * // Type-based structure
 * getDirectoryPath('./generated', 'dtos', 'pet', { structure: 'type-based' })
 * // Returns: './generated/dtos'
 *
 * // Domain-based structure
 * getDirectoryPath('./generated', 'dtos', 'pet', { structure: 'domain-based' })
 * // Returns: './generated/pet/dtos'
 */
export function getDirectoryPath(
  baseOutputPath: string,
  fileType: string,
  resourceName: string,
  config: OutputStructureConfig
): string {
  if (config.structure === 'domain-based') {
    return join(baseOutputPath, resourceName, fileType);
  } else {
    return join(baseOutputPath, fileType);
  }
}
