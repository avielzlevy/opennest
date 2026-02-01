import { OpenAPIV3 } from 'openapi-types';
import { SpecValidator } from '../../src/validation/spec-validator';
import { ValidationSeverity } from '../../src/validation/validation-result';

describe('Spec Validator', () => {
  let validator: SpecValidator;

  beforeEach(() => {
    validator = new SpecValidator();
  });

  describe('Required Fields Validation', () => {
    it('should fail if openapi version is missing', () => {
      const spec = {
        info: { title: 'API', version: '1.0' },
        paths: {},
      } as unknown as OpenAPIV3.Document;

      const result = validator.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('openapi'))).toBe(true);
    });

    it('should fail if info is missing', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {},
      } as unknown as OpenAPIV3.Document;

      const result = validator.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('info'))).toBe(true);
    });

    it('should fail if info.title is missing', () => {
      const spec = {
        openapi: '3.0.0',
        info: { version: '1.0' },
        paths: {},
      } as unknown as OpenAPIV3.Document;

      const result = validator.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('info.title'))).toBe(true);
    });

    it('should fail if info.version is missing', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'API' },
        paths: {},
      } as unknown as OpenAPIV3.Document;

      const result = validator.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('info.version'))).toBe(true);
    });

    it('should pass with all required fields', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {},
      };

      const result = validator.validate(spec);

      expect(result.errors.length).toBe(0);
    });
  });

  describe('Schema Validation', () => {
    it('should warn when schema is missing type field', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {},
        components: {
          schemas: {
            User: {
              properties: {
                name: { type: 'string' },
              },
            } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.warnings.some((w) => w.message.includes('type'))).toBe(true);
    });

    it('should error when array schema is missing items', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {},
        components: {
          schemas: {
            Users: {
              type: 'array',
            } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.errors.some((e) => e.message.includes('items'))).toBe(true);
    });

    it('should error on invalid schema type', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {},
        components: {
          schemas: {
            User: {
              type: 'invalid' as unknown as string,
            } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.errors.some((e) => e.message.includes('Invalid schema type'))).toBe(true);
    });

    it('should count validated schemas', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {},
        components: {
          schemas: {
            User: { type: 'object' } as OpenAPIV3.SchemaObject,
            Product: { type: 'object' } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.summary.schemasValidated).toBe(2);
    });

    it('should warn on invalid identifier in schema name', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {},
        components: {
          schemas: {
            'invalid-name': {
              type: 'object',
            } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.warnings.some((w) => w.code === 'INVALID_IDENTIFIER')).toBe(true);
    });

    it('should warn on NestJS decorator conflicts', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {},
        components: {
          schemas: {
            ApiResponse: {
              type: 'object',
            } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.warnings.some((w) => w.code === 'NESTJS_CONFLICT')).toBe(true);
    });
  });

  describe('Operation Validation', () => {
    it('should error when operation is missing responses', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {
          '/users': {
            get: {} as unknown as OpenAPIV3.OperationObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.errors.some((e) => e.message.includes('responses') || e.message.includes('Invalid operation'))).toBe(true);
    });

    it('should count validated operations', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {
          '/users': {
            get: {
              responses: {
                '200': { description: 'OK' },
              },
            } as OpenAPIV3.OperationObject,
            post: {
              responses: {
                '201': { description: 'Created' },
              },
            } as OpenAPIV3.OperationObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.summary.operationsValidated).toBe(2);
    });

    it('should warn on missing operationId', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {
          '/users': {
            get: {
              responses: {
                '200': { description: 'OK' },
              },
            } as OpenAPIV3.OperationObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.info.some((i) => i.code === 'MISSING_OPERATION_ID')).toBe(true);
    });

    it('should warn on invalid operationId format', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {
          '/users': {
            get: {
              operationId: 'get-users',
              responses: {
                '200': { description: 'OK' },
              },
            } as OpenAPIV3.OperationObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.warnings.some((w) => w.code === 'INVALID_OPERATION_ID')).toBe(true);
    });

    it('should error on duplicate operationId', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {
          '/users': {
            get: {
              operationId: 'getUsers',
              responses: {
                '200': { description: 'OK' },
              },
            } as OpenAPIV3.OperationObject,
          },
          '/products': {
            get: {
              operationId: 'getUsers',
              responses: {
                '200': { description: 'OK' },
              },
            } as OpenAPIV3.OperationObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.errors.some((e) => e.code === 'DUPLICATE_OPERATION_ID')).toBe(true);
    });

    it('should warn when path does not start with slash', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {
          'users': {
            get: {
              responses: {
                '200': { description: 'OK' },
              },
            } as OpenAPIV3.OperationObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.warnings.some((w) => w.message.includes('not start with slash'))).toBe(true);
    });
  });

  describe('Strict Mode', () => {
    it('should treat warnings as errors in strict mode', () => {
      const strictValidator = new SpecValidator({ strict: true });
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {},
        components: {
          schemas: {
            User: {
              properties: {
                name: { type: 'string' },
              },
            } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = strictValidator.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBe(0);
    });

    it('should allow warnings in non-strict mode', () => {
      const lenientValidator = new SpecValidator({ strict: false });
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {},
        components: {
          schemas: {
            User: {
              properties: {
                name: { type: 'string' },
              },
            } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = lenientValidator.validate(spec);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Reference Validation', () => {
    it('should error on undefined schema reference', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {},
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                address: { $ref: '#/components/schemas/Address' },
              },
            } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.errors.some((e) => e.code === 'UNDEFINED_SCHEMA_REF')).toBe(true);
    });

    it('should validate valid schema references', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {},
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                address: { $ref: '#/components/schemas/Address' },
              },
            } as OpenAPIV3.SchemaObject,
            Address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
              },
            } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.errors.filter((e) => e.code === 'UNDEFINED_SCHEMA_REF').length).toBe(0);
    });
  });
});
