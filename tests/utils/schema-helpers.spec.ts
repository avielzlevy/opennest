// tests/utils/schema-helpers.spec.ts
import { OpenAPIV3 } from 'openapi-types';
import {
  extractBodyDtoName,
  extractBodySchema,
  isBodyRequired,
  getSuccessResponse,
  extractResponseDtoName,
  extractResponseSchema,
  isArrayResponse,
  getSchemaType,
  getArrayItemType,
  isNullableSchema,
} from '../../src/utils/schema-helpers';

describe('Schema Helpers', () => {
  describe('extractBodyDtoName', () => {
    it('should extract DTO name from JSON body', () => {
      const body: OpenAPIV3.RequestBodyObject = {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateUserDto' }
          }
        }
      };
      expect(extractBodyDtoName(body)).toBe('CreateUserDto');
    });

    it('should return null for undefined body', () => {
      expect(extractBodyDtoName(undefined)).toBeNull();
    });

    it('should handle Object -> ObjectDto conversion', () => {
      const body: OpenAPIV3.RequestBodyObject = {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Object' }
          }
        }
      };
      expect(extractBodyDtoName(body)).toBe('ObjectDto');
    });

    it('should return "any" for inline schema (resolved, not a reference)', () => {
      const body: OpenAPIV3.RequestBodyObject = {
        content: {
          'application/json': {
            schema: { type: 'object' as const }
          }
        }
      };
      expect(extractBodyDtoName(body)).toBe('any');
    });

    it('should return null for body without content', () => {
      const body = {} as OpenAPIV3.RequestBodyObject;
      expect(extractBodyDtoName(body)).toBeNull();
    });

    it('should return null for body without application/json', () => {
      const body: OpenAPIV3.RequestBodyObject = {
        content: {
          'text/plain': {
            schema: { type: 'string' as const }
          }
        }
      };
      expect(extractBodyDtoName(body)).toBeNull();
    });
  });

  describe('extractBodySchema', () => {
    it('should extract schema from JSON body', () => {
      const body: OpenAPIV3.RequestBodyObject = {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateUserDto' }
          }
        }
      };
      const schema = extractBodySchema(body);
      expect(schema).toBeDefined();
      expect(schema).toHaveProperty('$ref');
    });

    it('should extract inline schema', () => {
      const body: OpenAPIV3.RequestBodyObject = {
        content: {
          'application/json': {
            schema: { type: 'object' as const, properties: {} }
          }
        }
      };
      const schema = extractBodySchema(body);
      expect(schema).toBeDefined();
      expect(schema).toHaveProperty('type', 'object');
    });

    it('should return null for undefined body', () => {
      expect(extractBodySchema(undefined)).toBeNull();
    });
  });

  describe('isBodyRequired', () => {
    it('should return true for required body', () => {
      const body: OpenAPIV3.RequestBodyObject = {
        required: true,
        content: {}
      };
      expect(isBodyRequired(body)).toBe(true);
    });

    it('should return false for optional body', () => {
      const body: OpenAPIV3.RequestBodyObject = {
        required: false,
        content: {}
      };
      expect(isBodyRequired(body)).toBe(false);
    });

    it('should return false for body without required field', () => {
      const body: OpenAPIV3.RequestBodyObject = {
        content: {}
      };
      expect(isBodyRequired(body)).toBe(false);
    });

    it('should return false for undefined body', () => {
      expect(isBodyRequired(undefined)).toBe(false);
    });
  });

  describe('getSuccessResponse', () => {
    it('should return 200 response', () => {
      const responses: OpenAPIV3.ResponsesObject = {
        '200': {
          description: 'Success'
        }
      };
      expect(getSuccessResponse(responses)).toBeDefined();
    });

    it('should return 201 response if no 200', () => {
      const responses: OpenAPIV3.ResponsesObject = {
        '201': {
          description: 'Created'
        }
      };
      expect(getSuccessResponse(responses)).toBeDefined();
    });

    it('should prefer 200 over 201', () => {
      const responses: OpenAPIV3.ResponsesObject = {
        '200': {
          description: 'Success'
        },
        '201': {
          description: 'Created'
        }
      };
      const success = getSuccessResponse(responses) as OpenAPIV3.ResponseObject;
      expect(success.description).toBe('Success');
    });

    it('should return undefined for responses without 200 or 201', () => {
      const responses: OpenAPIV3.ResponsesObject = {
        '404': {
          description: 'Not Found'
        }
      };
      expect(getSuccessResponse(responses)).toBeUndefined();
    });

    it('should return undefined for undefined responses', () => {
      expect(getSuccessResponse(undefined)).toBeUndefined();
    });
  });

  describe('extractResponseDtoName', () => {
    it('should extract DTO from 200 response', () => {
      const responses: OpenAPIV3.ResponsesObject = {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserDto' }
            }
          }
        }
      };
      expect(extractResponseDtoName(responses)).toBe('UserDto');
    });

    it('should extract DTO from 201 response', () => {
      const responses: OpenAPIV3.ResponsesObject = {
        '201': {
          description: 'Created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserDto' }
            }
          }
        }
      };
      expect(extractResponseDtoName(responses)).toBe('UserDto');
    });

    it('should handle array responses', () => {
      const responses: OpenAPIV3.ResponsesObject = {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                type: 'array' as const,
                items: { $ref: '#/components/schemas/UserDto' }
              }
            }
          }
        }
      };
      expect(extractResponseDtoName(responses)).toBe('UserDto[]');
    });

    it('should handle Object -> ObjectDto conversion', () => {
      const responses: OpenAPIV3.ResponsesObject = {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Object' }
            }
          }
        }
      };
      expect(extractResponseDtoName(responses)).toBe('ObjectDto');
    });

    it('should return void for no success response', () => {
      const responses: OpenAPIV3.ResponsesObject = {
        '404': {
          description: 'Not Found'
        }
      };
      expect(extractResponseDtoName(responses)).toBe('void');
    });

    it('should return any for inline schema', () => {
      const responses: OpenAPIV3.ResponsesObject = {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: { type: 'object' as const }
            }
          }
        }
      };
      expect(extractResponseDtoName(responses)).toBe('any');
    });

    it('should return any for response without content', () => {
      const responses: OpenAPIV3.ResponsesObject = {
        '200': {
          description: 'Success'
        }
      };
      expect(extractResponseDtoName(responses)).toBe('any');
    });

    it('should return void for undefined responses', () => {
      expect(extractResponseDtoName(undefined)).toBe('void');
    });
  });

  describe('extractResponseSchema', () => {
    it('should extract schema from 200 response', () => {
      const responses: OpenAPIV3.ResponsesObject = {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserDto' }
            }
          }
        }
      };
      const schema = extractResponseSchema(responses);
      expect(schema).toBeDefined();
      expect(schema).toHaveProperty('$ref');
    });

    it('should return null for response without content', () => {
      const responses: OpenAPIV3.ResponsesObject = {
        '200': {
          description: 'Success'
        }
      };
      expect(extractResponseSchema(responses)).toBeNull();
    });

    it('should return null for undefined responses', () => {
      expect(extractResponseSchema(undefined)).toBeNull();
    });
  });

  describe('isArrayResponse', () => {
    it('should return true for array schema', () => {
      const schema: OpenAPIV3.ArraySchemaObject = {
        type: 'array',
        items: { type: 'string' as const }
      };
      expect(isArrayResponse(schema)).toBe(true);
    });

    it('should return false for non-array schema', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'object'
      };
      expect(isArrayResponse(schema)).toBe(false);
    });

    it('should return false for reference', () => {
      const schema: OpenAPIV3.ReferenceObject = {
        $ref: '#/components/schemas/UserDto'
      };
      expect(isArrayResponse(schema)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isArrayResponse(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isArrayResponse(undefined)).toBe(false);
    });
  });

  describe('getSchemaType', () => {
    it('should return type for reference', () => {
      const schema: OpenAPIV3.ReferenceObject = {
        $ref: '#/components/schemas/UserDto'
      };
      expect(getSchemaType(schema)).toBe('UserDto');
    });

    it('should return string for string schema', () => {
      const schema: OpenAPIV3.SchemaObject = { type: 'string' };
      expect(getSchemaType(schema)).toBe('string');
    });

    it('should return number for integer schema', () => {
      const schema: OpenAPIV3.SchemaObject = { type: 'integer' };
      expect(getSchemaType(schema)).toBe('number');
    });

    it('should return number for number schema', () => {
      const schema: OpenAPIV3.SchemaObject = { type: 'number' };
      expect(getSchemaType(schema)).toBe('number');
    });

    it('should return boolean for boolean schema', () => {
      const schema: OpenAPIV3.SchemaObject = { type: 'boolean' };
      expect(getSchemaType(schema)).toBe('boolean');
    });

    it('should return object for object schema', () => {
      const schema: OpenAPIV3.SchemaObject = { type: 'object' };
      expect(getSchemaType(schema)).toBe('object');
    });

    it('should return array type for array schema', () => {
      const schema: OpenAPIV3.ArraySchemaObject = {
        type: 'array',
        items: { type: 'string' as const }
      };
      expect(getSchemaType(schema)).toBe('string[]');
    });

    it('should return any for undefined schema', () => {
      expect(getSchemaType(undefined)).toBe('any');
    });

    it('should return any for null schema', () => {
      expect(getSchemaType(null)).toBe('any');
    });
  });

  describe('getArrayItemType', () => {
    it('should return item type for array with string items', () => {
      const schema: OpenAPIV3.ArraySchemaObject = {
        type: 'array',
        items: { type: 'string' as const }
      };
      expect(getArrayItemType(schema)).toBe('string');
    });

    it('should return item type for array with reference items', () => {
      const schema: OpenAPIV3.ArraySchemaObject = {
        type: 'array',
        items: { $ref: '#/components/schemas/UserDto' }
      };
      expect(getArrayItemType(schema)).toBe('UserDto');
    });

    it('should return any for array without items', () => {
      const schema = { type: 'array' } as OpenAPIV3.ArraySchemaObject;
      expect(getArrayItemType(schema)).toBe('any');
    });
  });

  describe('isNullableSchema', () => {
    it('should return true for nullable schema', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        nullable: true
      };
      expect(isNullableSchema(schema)).toBe(true);
    });

    it('should return false for non-nullable schema', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        nullable: false
      };
      expect(isNullableSchema(schema)).toBe(false);
    });

    it('should return false for schema without nullable property', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string'
      };
      expect(isNullableSchema(schema)).toBe(false);
    });

    it('should return false for undefined schema', () => {
      expect(isNullableSchema(undefined)).toBe(false);
    });
  });
});
