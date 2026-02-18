// tests/utils/type-guards.spec.ts
import { OpenAPIV3 } from 'openapi-types';
import {
  isReferenceObject,
  isSchemaObject,
  isArraySchema,
  isObjectSchema,
  hasProperties,
  isOperationObject,
  isPathItemObject,
  isParameterObject,
  isRequestBodyObject,
  isResponseObject,
  hasJsonContent,
  hasSchema,
  getJsonSchema,
} from '../../src/utils/type-guards';

describe('Type Guards', () => {
  describe('isReferenceObject', () => {
    it('should return true for $ref objects', () => {
      const ref: OpenAPIV3.ReferenceObject = { $ref: '#/components/schemas/User' };
      expect(isReferenceObject(ref)).toBe(true);
    });

    it('should return false for schema objects', () => {
      const schema: OpenAPIV3.SchemaObject = { type: 'string' };
      expect(isReferenceObject(schema)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isReferenceObject(null as any)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isReferenceObject(undefined)).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isReferenceObject('string' as any)).toBe(false);
      expect(isReferenceObject(123 as any)).toBe(false);
    });
  });

  describe('isSchemaObject', () => {
    it('should return true for schema objects', () => {
      const schema: OpenAPIV3.SchemaObject = { type: 'string' };
      expect(isSchemaObject(schema)).toBe(true);
    });

    it('should return false for $ref objects', () => {
      const ref: OpenAPIV3.ReferenceObject = { $ref: '#/components/schemas/User' };
      expect(isSchemaObject(ref)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isSchemaObject(null as any)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isSchemaObject(undefined)).toBe(false);
    });
  });

  describe('isArraySchema', () => {
    it('should return true for array schema with items', () => {
      const schema: OpenAPIV3.ArraySchemaObject = {
        type: 'array',
        items: { type: 'string' }
      };
      expect(isArraySchema(schema)).toBe(true);
    });

    it('should return true for array schema without items (edge case)', () => {
      const schema: OpenAPIV3.ArraySchemaObject = {
        type: 'array',
        items: {}
      };
      expect(isArraySchema(schema)).toBe(true);
    });

    it('should return false for non-array schema', () => {
      const schema: OpenAPIV3.SchemaObject = { type: 'string' };
      expect(isArraySchema(schema)).toBe(false);
    });

    it('should return false for $ref objects', () => {
      const ref: OpenAPIV3.ReferenceObject = { $ref: '#/components/schemas/User' };
      expect(isArraySchema(ref)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isArraySchema(undefined)).toBe(false);
    });
  });

  describe('isObjectSchema', () => {
    it('should return true for object schema', () => {
      const schema: OpenAPIV3.NonArraySchemaObject = { type: 'object' };
      expect(isObjectSchema(schema)).toBe(true);
    });

    it('should return false for array schema', () => {
      const schema: OpenAPIV3.ArraySchemaObject = {
        type: 'array',
        items: { type: 'string' }
      };
      expect(isObjectSchema(schema)).toBe(false);
    });

    it('should return false for primitive schema', () => {
      const schema: OpenAPIV3.SchemaObject = { type: 'string' };
      expect(isObjectSchema(schema)).toBe(false);
    });

    it('should return false for $ref', () => {
      const ref: OpenAPIV3.ReferenceObject = { $ref: '#/components/schemas/User' };
      expect(isObjectSchema(ref)).toBe(false);
    });
  });

  describe('hasProperties', () => {
    it('should return true for schema with properties', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        }
      };
      expect(hasProperties(schema)).toBe(true);
    });

    it('should return false for schema without properties', () => {
      const schema: OpenAPIV3.SchemaObject = { type: 'object' };
      expect(hasProperties(schema)).toBe(false);
    });

    it('should return false for $ref', () => {
      const ref: OpenAPIV3.ReferenceObject = { $ref: '#/components/schemas/User' };
      expect(hasProperties(ref)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(hasProperties(undefined)).toBe(false);
    });
  });

  describe('isOperationObject', () => {
    it('should return true for valid operation', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {
          '200': { description: 'Success' }
        }
      };
      expect(isOperationObject(operation)).toBe(true);
    });

    it('should return false for objects without responses', () => {
      const notOperation = { summary: 'Test' };
      expect(isOperationObject(notOperation)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isOperationObject(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isOperationObject(undefined)).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isOperationObject('string')).toBe(false);
      expect(isOperationObject(123)).toBe(false);
    });
  });

  describe('isPathItemObject', () => {
    it('should return true for valid path item', () => {
      const pathItem: OpenAPIV3.PathItemObject = {
        get: { responses: {} }
      };
      expect(isPathItemObject(pathItem)).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isPathItemObject({})).toBe(true);
    });

    it('should return false for null', () => {
      expect(isPathItemObject(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isPathItemObject(undefined)).toBe(false);
    });
  });

  describe('isParameterObject', () => {
    it('should return true for parameter object', () => {
      const param: OpenAPIV3.ParameterObject = {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      };
      expect(isParameterObject(param)).toBe(true);
    });

    it('should return false for $ref', () => {
      const ref: OpenAPIV3.ReferenceObject = { $ref: '#/components/parameters/Id' };
      expect(isParameterObject(ref)).toBe(false);
    });

    it('should return false for objects without "in" property', () => {
      const notParam = { name: 'test' };
      expect(isParameterObject(notParam as any)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isParameterObject(null as any)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isParameterObject(undefined)).toBe(false);
    });
  });

  describe('isRequestBodyObject', () => {
    it('should return true for request body object', () => {
      const body: OpenAPIV3.RequestBodyObject = {
        content: {
          'application/json': {
            schema: { type: 'object' }
          }
        }
      };
      expect(isRequestBodyObject(body)).toBe(true);
    });

    it('should return false for $ref', () => {
      const ref: OpenAPIV3.ReferenceObject = { $ref: '#/components/requestBodies/User' };
      expect(isRequestBodyObject(ref)).toBe(false);
    });

    it('should return false for objects without content', () => {
      const notBody = { description: 'Test' };
      expect(isRequestBodyObject(notBody as any)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isRequestBodyObject(undefined)).toBe(false);
    });
  });

  describe('isResponseObject', () => {
    it('should return true for response object', () => {
      const response: OpenAPIV3.ResponseObject = {
        description: 'Success',
        content: {
          'application/json': {
            schema: { type: 'object' }
          }
        }
      };
      expect(isResponseObject(response)).toBe(true);
    });

    it('should return false for $ref', () => {
      const ref: OpenAPIV3.ReferenceObject = { $ref: '#/components/responses/Success' };
      expect(isResponseObject(ref)).toBe(false);
    });

    it('should return false for objects without description', () => {
      const notResponse = { content: {} };
      expect(isResponseObject(notResponse as any)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isResponseObject(undefined)).toBe(false);
    });
  });

  describe('hasJsonContent', () => {
    it('should return true for content with application/json', () => {
      const content = {
        'application/json': {
          schema: { type: 'object' as const }
        }
      };
      expect(hasJsonContent(content)).toBe(true);
    });

    it('should return false for content without application/json', () => {
      const content = {
        'text/plain': {
          schema: { type: 'string' as const }
        }
      };
      expect(hasJsonContent(content)).toBe(false);
    });

    it('should return false for empty content', () => {
      expect(hasJsonContent({})).toBe(false);
    });

    it('should return false for null', () => {
      expect(hasJsonContent(null as any)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(hasJsonContent(undefined)).toBe(false);
    });
  });

  describe('hasSchema', () => {
    it('should return true for media type with schema', () => {
      const mediaType: OpenAPIV3.MediaTypeObject = {
        schema: { type: 'object' as const }
      };
      expect(hasSchema(mediaType)).toBe(true);
    });

    it('should return false for media type without schema', () => {
      const mediaType: OpenAPIV3.MediaTypeObject = {
        example: { test: 'value' }
      };
      expect(hasSchema(mediaType)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(hasSchema(undefined)).toBe(false);
    });
  });

  describe('getJsonSchema', () => {
    it('should extract schema from application/json content', () => {
      const content = {
        'application/json': {
          schema: { type: 'object' as const, properties: { name: { type: 'string' as const } } }
        }
      };
      const schema = getJsonSchema(content);
      expect(schema).toBeDefined();
      expect(schema).toHaveProperty('type', 'object');
    });

    it('should extract $ref from application/json content', () => {
      const content = {
        'application/json': {
          schema: { $ref: '#/components/schemas/User' }
        }
      };
      const schema = getJsonSchema(content);
      expect(schema).toBeDefined();
      expect(schema).toHaveProperty('$ref', '#/components/schemas/User');
    });

    it('should return null for content without application/json', () => {
      const content = {
        'text/plain': {
          schema: { type: 'string' as const }
        }
      };
      expect(getJsonSchema(content)).toBeNull();
    });

    it('should return null for application/json without schema', () => {
      const content = {
        'application/json': {
          example: { test: 'value' }
        }
      };
      expect(getJsonSchema(content)).toBeNull();
    });

    it('should return null for undefined content', () => {
      expect(getJsonSchema(undefined)).toBeNull();
    });

    it('should return null for empty content', () => {
      expect(getJsonSchema({})).toBeNull();
    });
  });
});
