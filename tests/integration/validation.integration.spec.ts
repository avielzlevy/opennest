import { OpenAPIV3 } from 'openapi-types';
import { SpecValidator } from '../../src/validation/spec-validator';
import { formatValidationReport } from '../../src/validation/error-formatter';

describe('Validation Integration Tests', () => {
  let validator: SpecValidator;

  beforeEach(() => {
    validator = new SpecValidator();
  });

  describe('Well-formed specification', () => {
    it('should validate a complete, well-formed spec', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'User API',
          version: '1.0.0',
        },
        paths: {
          '/users': {
            get: {
              operationId: 'listUsers',
              responses: {
                '200': {
                  description: 'List of users',
                  content: {
                    'application/json': {
                      schema: {
                        $ref: '#/components/schemas/User',
                      },
                    },
                  },
                },
              },
            },
            post: {
              operationId: 'createUser',
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/CreateUserDto',
                    },
                  },
                },
              },
              responses: {
                '201': {
                  description: 'User created',
                  content: {
                    'application/json': {
                      schema: {
                        $ref: '#/components/schemas/User',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string', format: 'email' },
                role: {
                  type: 'string',
                  enum: ['admin', 'user', 'guest'],
                },
              },
              required: ['id', 'name', 'email'],
            } as OpenAPIV3.SchemaObject,
            CreateUserDto: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string' },
              },
              required: ['name', 'email'],
            } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.summary.schemasValidated).toBe(2);
      expect(result.summary.operationsValidated).toBe(2);
    });
  });

  describe('Malformed specification - missing required fields', () => {
    it('should detect missing openapi version', () => {
      const spec = {
        info: { title: 'API', version: '1.0' },
        paths: {},
      } as unknown as OpenAPIV3.Document;

      const result = validator.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toMatch(/openapi/i);
    });

    it('should detect missing info', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {},
      } as unknown as OpenAPIV3.Document;

      const result = validator.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('info'))).toBe(true);
    });
  });

  describe('Schema validation - missing type field', () => {
    it('should warn when schema missing type field', () => {
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

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.message.includes('type'))).toBe(true);
    });

    it('should error on missing type in strict mode', () => {
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
    });
  });

  describe('Array schema validation', () => {
    it('should error when array schema missing items', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {},
        components: {
          schemas: {
            UserList: {
              type: 'array',
            } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.errors.some((e) => e.message.includes('items'))).toBe(true);
    });

    it('should validate array with items', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {},
        components: {
          schemas: {
            UserList: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/User',
              },
            } as OpenAPIV3.SchemaObject,
            User: {
              type: 'object',
              properties: {
                id: { type: 'string' },
              },
            } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.errors.filter((e) => e.message.includes('items')).length).toBe(0);
    });
  });

  describe('Reference validation', () => {
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

    it('should validate defined schema references', () => {
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

  describe('Operation validation', () => {
    it('should validate operations with proper responses', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {
          '/users/{id}': {
            get: {
              operationId: 'getUser',
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                } as OpenAPIV3.ParameterObject,
              ],
              responses: {
                '200': {
                  description: 'User found',
                },
              },
            } as OpenAPIV3.OperationObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.summary.operationsValidated).toBe(1);
      expect(result.errors.filter((e) => e.message.includes('responses')).length).toBe(0);
    });
  });

  describe('NestJS conflict detection', () => {
    it('should warn on conflicting NestJS decorator names', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0' },
        paths: {},
        components: {
          schemas: {
            ApiResponse: {
              type: 'object',
              properties: {
                code: { type: 'number' },
              },
            } as OpenAPIV3.SchemaObject,
            Controller: {
              type: 'object',
              properties: {
                id: { type: 'string' },
              },
            } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = validator.validate(spec);

      const conflictWarnings = result.warnings.filter((w) => w.code === 'NESTJS_CONFLICT');
      expect(conflictWarnings.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Validation reporting', () => {
    it('should format validation report with all sections', () => {
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
      const report = formatValidationReport(result);

      expect(report).toContain('Validation Summary');
      expect(report).toContain('Schemas validated');
      expect(report).toContain('Operations validated');
    });
  });

  describe('Complex specification validation', () => {
    it('should validate spec with multiple schemas, operations, and potential issues', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Complex API',
          version: '2.0.0',
        },
        paths: {
          '/users': {
            get: {
              operationId: 'listUsers',
              tags: ['Users'],
              responses: {
                '200': {
                  description: 'User list',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/User' },
                      },
                    },
                  },
                },
              },
            } as OpenAPIV3.OperationObject,
            post: {
              operationId: 'createUser',
              tags: ['Users'],
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/CreateUserDto' },
                  },
                },
              },
              responses: {
                '201': {
                  description: 'User created',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            } as OpenAPIV3.OperationObject,
          },
          '/products': {
            get: {
              operationId: 'listProducts',
              tags: ['Products'],
              responses: {
                '200': {
                  description: 'Product list',
                },
              },
            } as OpenAPIV3.OperationObject,
          },
        },
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                email: { type: 'string', format: 'email' },
                role: { type: 'string', enum: ['admin', 'user'] },
              },
              required: ['id', 'name', 'email'],
            } as OpenAPIV3.SchemaObject,
            CreateUserDto: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string' },
              },
              required: ['name', 'email'],
            } as OpenAPIV3.SchemaObject,
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.summary.schemasValidated).toBe(2);
      expect(result.summary.operationsValidated).toBe(3);
      expect(result.errors.length).toBe(0);
      expect(result.valid).toBe(true);
    });
  });
});
