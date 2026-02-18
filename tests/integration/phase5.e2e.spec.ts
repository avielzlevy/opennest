/**
 * End-to-end tests for Phase 5: Validation & Error Handling
 *
 * Tests the complete flow:
 * 1. Specification validation with SpecValidator
 * 2. Error reporting with user-friendly messages
 * 3. Generator error handling with recovery strategies
 * 4. Identifier validation and name conflict resolution
 */

import { OpenAPIV3 } from 'openapi-types';
import { SpecValidator } from '../../src/validation/spec-validator';
import {
  isValidIdentifier,
  hasNestJsConflict,
  sanitizeIdentifier,
  resolveNestJsConflict,
} from '../../src/validation/identifier-validator';

describe('Phase 5: Validation & Error Handling - E2E Tests', () => {
  describe('Scenario 1: Valid, well-formed specification', () => {
    it('should validate and report successful validation', () => {
      const validator = new SpecValidator();
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Pet Store', version: '1.0.0' },
        paths: {
          '/pets': {
            get: {
              operationId: 'listPets',
              responses: {
                '200': { description: 'Pet list' },
              },
            } as OpenAPIV3.OperationObject,
          },
        },
        components: {
          schemas: {
            Pet: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
              required: ['id', 'name'],
            } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.summary.schemasValidated).toBe(1);
      expect(result.summary.operationsValidated).toBe(1);
    });
  });

  describe('Scenario 2: Specification with warnings (missing type field)', () => {
    it('should warn but allow generation in non-strict mode', () => {
      const validator = new SpecValidator({ strict: false });
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {},
        components: {
          schemas: {
            User: {
              properties: {
                id: { type: 'string' },
              },
            } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);
    });

    it('should fail in strict mode with missing type field', () => {
      const validator = new SpecValidator({ strict: true });
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {},
        components: {
          schemas: {
            User: {
              properties: {
                id: { type: 'string' },
              },
            } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBe(0);
    });
  });

  describe('Scenario 3: Identifier validation and conflict resolution', () => {
    it('should detect valid identifiers', () => {
      expect(isValidIdentifier('User')).toBe(true);
      expect(isValidIdentifier('_PrivateClass')).toBe(true);
      expect(isValidIdentifier('$SpecialName')).toBe(true);
      expect(isValidIdentifier('camelCaseDto')).toBe(true);
    });

    it('should reject invalid identifiers', () => {
      expect(isValidIdentifier('123Invalid')).toBe(false);
      expect(isValidIdentifier('invalid-name')).toBe(false);
      expect(isValidIdentifier('invalid name')).toBe(false);
      expect(isValidIdentifier('class')).toBe(false);
      expect(isValidIdentifier('function')).toBe(false);
    });

    it('should detect NestJS conflicts', () => {
      expect(hasNestJsConflict('ApiResponse')).toBe(true);
      expect(hasNestJsConflict('Controller')).toBe(true);
      expect(hasNestJsConflict('Injectable')).toBe(true);
      expect(hasNestJsConflict('User')).toBe(false);
    });

    it('should resolve NestJS conflicts', () => {
      expect(resolveNestJsConflict('ApiResponse')).toBe('ApiResponseDto');
      expect(resolveNestJsConflict('Controller')).toBe('ControllerDto');
      expect(resolveNestJsConflict('User')).toBe('User');
    });

    it('should sanitize invalid identifiers', () => {
      expect(sanitizeIdentifier('invalid-name')).toBe('invalid_name');
      expect(sanitizeIdentifier('invalid name')).toBe('invalid_name');
      const result = sanitizeIdentifier('123start');
      expect(/^[a-zA-Z_$]/.test(result)).toBe(true);
    });
  });

  describe('Scenario 4: Complex spec with multiple validation issues', () => {
    it('should identify all validation issues in single pass', () => {
      const validator = new SpecValidator({ strict: false });
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Complex API', version: '1.0' },
        paths: {
          'users': {
            get: {
              operationId: 'get-users',
              responses: {
                '200': { description: 'OK' },
              },
            } as OpenAPIV3.OperationObject,
          },
        },
        components: {
          schemas: {
            ApiResponse: {
              properties: {
                code: { type: 'number' },
              },
            } as OpenAPIV3.SchemaObject,
            'invalid-schema': {
              type: 'object',
              properties: {
                id: { type: 'string' },
              },
            } as OpenAPIV3.SchemaObject,
            UserList: {
              type: 'array',
              // Missing items
            } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = validator.validate(spec);

      // Should report all issues
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);

      // Specific issues should be detected
      const pathWarning = result.warnings.some((w) =>
        w.message.includes('not start with slash')
      );
      const conflictWarning = result.warnings.some((w) =>
        w.code === 'NESTJS_CONFLICT'
      );
      const invalidIdWarning = result.warnings.some((w) =>
        w.code === 'INVALID_IDENTIFIER'
      );
      const missingTypeWarning = result.warnings.some((w) =>
        w.message.includes('type')
      );
      const missingItemsError = result.errors.some((e) =>
        e.message.includes('items')
      );

      expect(pathWarning).toBe(true);
      expect(conflictWarning).toBe(true);
      expect(invalidIdWarning).toBe(true);
      expect(missingTypeWarning).toBe(true);
      expect(missingItemsError).toBe(true);
    });
  });

  describe('Scenario 5: Reference validation', () => {
    it('should detect broken references', () => {
      const validator = new SpecValidator();
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {},
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                profile: { $ref: '#/components/schemas/Profile' },
              },
            } as OpenAPIV3.SchemaObject,
            // Profile is missing!
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.errors.some((e) => e.code === 'UNDEFINED_SCHEMA_REF')).toBe(true);
    });

    it('should validate correct references', () => {
      const validator = new SpecValidator();
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {},
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                profile: { $ref: '#/components/schemas/Profile' },
              },
            } as OpenAPIV3.SchemaObject,
            Profile: {
              type: 'object',
              properties: {
                bio: { type: 'string' },
              },
            } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.errors.filter((e) => e.code === 'UNDEFINED_SCHEMA_REF').length).toBe(0);
    });
  });

  describe('Scenario 6: Operation validation with parameters', () => {
    it('should validate operations with parameters', () => {
      const validator = new SpecValidator();
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {
          '/users/{id}': {
            get: {
              operationId: 'getUserById',
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                } as OpenAPIV3.ParameterObject,
              ],
              responses: {
                '200': { description: 'User found' },
              },
            } as OpenAPIV3.OperationObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.errors.length).toBe(0);
      expect(result.summary.operationsValidated).toBe(1);
    });
  });

  describe('Scenario 7: Enum value validation', () => {
    it('should detect empty enums', () => {
      const validator = new SpecValidator();
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {},
        components: {
          schemas: {
            Status: {
              type: 'string',
              enum: [],
            } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.errors.some((e) => e.message.includes('Enum'))).toBe(true);
    });

    it('should accept valid enums', () => {
      const validator = new SpecValidator();
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {},
        components: {
          schemas: {
            Status: {
              type: 'string',
              enum: ['active', 'inactive', 'pending'],
            } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.errors.filter((e) => e.message.includes('Enum')).length).toBe(0);
    });
  });

  describe('Scenario 8: Complete E2E validation flow', () => {
    it('should handle real-world API spec with validation and recovery', () => {
      const validator = new SpecValidator({ strict: false });

      // Real-world-like spec with various potential issues
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'E-Commerce API',
          version: '2.1.0',
          description: 'Production-ready API',
        },
        paths: {
          '/products': {
            get: {
              operationId: 'getProducts',
              tags: ['Products'],
              parameters: [
                {
                  name: 'page',
                  in: 'query',
                  schema: { type: 'integer' },
                } as OpenAPIV3.ParameterObject,
              ],
              responses: {
                '200': {
                  description: 'Product list',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Product' },
                      },
                    },
                  },
                },
              },
            } as OpenAPIV3.OperationObject,
            post: {
              operationId: 'createProduct',
              tags: ['Products'],
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/CreateProductDto' },
                  },
                },
              },
              responses: {
                '201': {
                  description: 'Product created',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/Product' },
                    },
                  },
                },
              },
            } as OpenAPIV3.OperationObject,
          },
          '/orders/{orderId}': {
            get: {
              operationId: 'getOrder',
              tags: ['Orders'],
              parameters: [
                {
                  name: 'orderId',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                } as OpenAPIV3.ParameterObject,
              ],
              responses: {
                '200': {
                  description: 'Order details',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/Order' },
                    },
                  },
                },
                '404': {
                  description: 'Order not found',
                },
              },
            } as OpenAPIV3.OperationObject,
          },
        },
        components: {
          schemas: {
            Product: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                price: { type: 'number' },
                status: { type: 'string', enum: ['available', 'discontinued'] },
              },
              required: ['id', 'name', 'price'],
            } as OpenAPIV3.SchemaObject,
            CreateProductDto: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                price: { type: 'number' },
              },
              required: ['name', 'price'],
            } as OpenAPIV3.SchemaObject,
            Order: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                productId: { $ref: '#/components/schemas/Product' },
                quantity: { type: 'integer' },
              },
              required: ['id', 'productId', 'quantity'],
            } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = validator.validate(spec);

      // Should be valid overall
      expect(result.valid).toBe(true);

      // Should validate all schemas
      expect(result.summary.schemasValidated).toBe(3);

      // Should validate all operations
      expect(result.summary.operationsValidated).toBe(3);

      // No critical errors
      expect(result.errors.length).toBe(0);
    });
  });
});
