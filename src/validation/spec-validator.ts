/**
 * Main validation orchestrator for OpenAPI specifications
 */

import { OpenAPIV3 } from 'openapi-types';
import {
  createValidationResult,
  ValidationResult,
  ValidationSeverity,
  addIssue,
} from './validation-result';
import {
  validateSchema,
  validateOperation,
  validateOperationId,
  validateReferencesInSchema,
} from './schema-validators';
import {
  isValidIdentifier,
  hasNestJsConflict,
} from './identifier-validator';

/**
 * Specification validator configuration
 */
export interface SpecValidatorConfig {
  checkOperationIds?: boolean;
  checkReferences?: boolean;
  checkNameConflicts?: boolean;
  strict?: boolean; // Treat warnings as errors
}

/**
 * Main validation orchestrator
 */
export class SpecValidator {
  constructor(private readonly config: SpecValidatorConfig = {}) {}

  /**
   * Validate a complete OpenAPI specification
   *
   * @param document - The OpenAPI document to validate
   * @returns Validation result with all issues found
   */
  public validate(document: OpenAPIV3.Document): ValidationResult {
    const result = createValidationResult();

    // Validate required OpenAPI fields
    this.validateRequiredFields(document, result);

    if (!document.components?.schemas && !document.paths) {
      // Still valid, just empty spec
      return result;
    }

    // Validate schemas
    if (document.components?.schemas) {
      this.validateSchemas(
        document.components.schemas as Record<
          string,
          OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
        >,
        document,
        result,
      );
    }

    // Validate operations/paths
    if (document.paths) {
      this.validatePaths(document.paths, document, result);
    }

    // Treat warnings as errors if in strict mode
    if (this.config.strict && result.warnings.length > 0) {
      result.errors.push(
        ...result.warnings.map((w) => ({
          ...w,
          severity: ValidationSeverity.Error,
        })),
      );
      result.warnings = [];
      result.summary.errorsFound += result.summary.warningsFound;
      result.summary.warningsFound = 0;
      result.valid = false;
    }

    return result;
  }

  /**
   * Validate required OpenAPI fields
   */
  private validateRequiredFields(
    document: OpenAPIV3.Document,
    result: ValidationResult,
  ): void {
    // Check openapi version
    if (!document.openapi) {
      addIssue(result, {
        severity: ValidationSeverity.Error,
        message: 'Missing required field: openapi',
        location: 'root',
        suggestion: 'Add openapi: "3.0.0" or later to specification',
      });
    }

    // Check info
    if (!document.info) {
      addIssue(result, {
        severity: ValidationSeverity.Error,
        message: 'Missing required field: info',
        location: 'root',
        suggestion: 'Add info object with title and version',
      });
    } else if (!document.info.title) {
      addIssue(result, {
        severity: ValidationSeverity.Error,
        message: 'Missing required field: info.title',
        location: 'info',
        suggestion: 'Add a title for your API',
      });
    }

    // Check info.version
    if (document.info && !document.info.version) {
      addIssue(result, {
        severity: ValidationSeverity.Error,
        message: 'Missing required field: info.version',
        location: 'info',
        suggestion: 'Add a version number (e.g., "1.0.0")',
      });
    }
  }

  /**
   * Validate all schemas in components
   */
  private validateSchemas(
    schemas: Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject>,
    document: OpenAPIV3.Document,
    result: ValidationResult,
  ): void {
    const schemaNames = new Set<string>();

    for (const [name, schema] of Object.entries(schemas)) {
      result.summary.schemasValidated++;

      // Validate schema structure
      validateSchema(schema, name, result);

      // Validate references in schema
      if (this.config.checkReferences !== false) {
        validateReferencesInSchema(schema, document, result);
      }

      // Check for identifier validity
      if (!isValidIdentifier(name)) {
        addIssue(result, {
          severity: ValidationSeverity.Warning,
          message: `Schema name "${name}" is not a valid TypeScript identifier`,
          location: `components.schemas.${name}`,
          suggestion: `Use valid identifier format (must start with letter, contain only alphanumeric, $, _)`,
          code: 'INVALID_IDENTIFIER',
        });
      }

      // Check for NestJS conflicts
      if (this.config.checkNameConflicts !== false && hasNestJsConflict(name)) {
        addIssue(result, {
          severity: ValidationSeverity.Warning,
          message: `Schema name "${name}" conflicts with NestJS decorator name`,
          location: `components.schemas.${name}`,
          suggestion: `Rename schema to avoid conflict (e.g., "${name}Dto")`,
          code: 'NESTJS_CONFLICT',
        });
      }

      schemaNames.add(name);
    }
  }

  /**
   * Validate all paths and operations
   */
  private validatePaths(
    paths: OpenAPIV3.PathsObject,
    document: OpenAPIV3.Document,
    result: ValidationResult,
  ): void {
    const operationIds = new Map<string, string>();

    for (const [path, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue;

      // Check if path starts with /
      if (!path.startsWith('/')) {
        addIssue(result, {
          severity: ValidationSeverity.Warning,
          message: `Path does not start with slash: "${path}"`,
          location: `paths.${path}`,
          suggestion: `Paths must start with "/" (e.g., "/users")`,
        });
      }

      // Validate operations
      const httpMethods = [
        'get', 'post', 'put', 'patch', 'delete', 'options', 'head',
      ];
      for (const method of httpMethods) {
        const operation = (pathItem as Record<string, unknown>)[method];
        if (!operation) continue;

        result.summary.operationsValidated++;

        const op = operation as OpenAPIV3.OperationObject;
        validateOperation(op, path, method, result);

        // Validate operationId
        if (this.config.checkOperationIds !== false) {
          validateOperationId(op.operationId, path, method, result);

          // Check for duplicate operationIds
          if (op.operationId) {
            if (operationIds.has(op.operationId)) {
              const existingPath = operationIds.get(op.operationId);
              addIssue(result, {
                severity: ValidationSeverity.Error,
                message: `Duplicate operationId: "${op.operationId}"`,
                location: `paths.${path}.${method}`,
                suggestion: `operationId must be unique (also found at ${existingPath})`,
                code: 'DUPLICATE_OPERATION_ID',
              });
            } else {
              operationIds.set(op.operationId, `${path} ${method}`);
            }
          }
        }
      }
    }
  }
}

/**
 * Create a validator with default configuration
 */
export function createSpecValidator(
  config?: SpecValidatorConfig,
): SpecValidator {
  return new SpecValidator(config);
}
