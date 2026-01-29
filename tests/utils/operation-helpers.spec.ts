// tests/utils/operation-helpers.spec.ts
import { OpenAPIV3 } from 'openapi-types';
import {
  HTTP_METHODS,
  groupOperationsByTag,
  getOperationName,
  parseOperationId,
  buildEndpointDecoratorName,
  normalizeTagName,
  buildResourceName,
  buildControllerClassName,
  buildServiceInterfaceName,
} from '../../src/utils/operation-helpers';

describe('Operation Helpers', () => {
  describe('HTTP_METHODS', () => {
    it('should contain all standard HTTP methods', () => {
      expect(HTTP_METHODS).toEqual(['get', 'post', 'put', 'delete', 'patch']);
    });
  });

  describe('groupOperationsByTag', () => {
    it('should group operations by their primary tag', () => {
      const paths: OpenAPIV3.PathsObject = {
        '/users': {
          get: { tags: ['Users'], responses: {} },
          post: { tags: ['Users'], responses: {} },
        },
        '/orders': {
          get: { tags: ['Orders'], responses: {} },
        },
      };

      const grouped = groupOperationsByTag(paths);

      expect(Object.keys(grouped)).toEqual(['Users', 'Orders']);
      expect(grouped['Users']).toHaveLength(2);
      expect(grouped['Orders']).toHaveLength(1);
    });

    it('should use Default tag for untagged operations', () => {
      const paths: OpenAPIV3.PathsObject = {
        '/health': {
          get: { responses: {} }, // No tags
        },
      };

      const grouped = groupOperationsByTag(paths);

      expect(grouped['Default']).toHaveLength(1);
      expect(grouped['Default'][0].method).toBe('get');
      expect(grouped['Default'][0].path).toBe('/health');
    });

    it('should handle undefined paths', () => {
      expect(groupOperationsByTag(undefined)).toEqual({});
    });

    it('should skip null/undefined path items', () => {
      const paths = {
        '/users': {
          get: { tags: ['Users'], responses: {} },
        },
        '/invalid': null,
      } as any;

      const grouped = groupOperationsByTag(paths);

      expect(grouped['Users']).toHaveLength(1);
      expect(grouped['invalid']).toBeUndefined();
    });

    it('should handle multiple operations on same path', () => {
      const paths: OpenAPIV3.PathsObject = {
        '/users': {
          get: { tags: ['Users'], responses: {} },
          post: { tags: ['Users'], responses: {} },
          put: { tags: ['Users'], responses: {} },
          delete: { tags: ['Users'], responses: {} },
          patch: { tags: ['Users'], responses: {} },
        },
      };

      const grouped = groupOperationsByTag(paths);

      expect(grouped['Users']).toHaveLength(5);
    });

    it('should include operation details in grouped result', () => {
      const paths: OpenAPIV3.PathsObject = {
        '/users/{id}': {
          get: {
            tags: ['Users'],
            operationId: 'Users_GetById',
            summary: 'Get user by ID',
            responses: {},
          },
        },
      };

      const grouped = groupOperationsByTag(paths);

      expect(grouped['Users'][0]).toEqual({
        method: 'get',
        path: '/users/{id}',
        operation: expect.objectContaining({
          operationId: 'Users_GetById',
          summary: 'Get user by ID',
        }),
      });
    });
  });

  describe('getOperationName', () => {
    it('should use operationId when present', () => {
      const operation: OpenAPIV3.OperationObject = {
        operationId: 'getAll',
        responses: {},
      };
      expect(getOperationName(operation, 'Users')).toBe('getAll');
    });

    it('should extract method from Tag_Method format and normalize to camelCase', () => {
      const operation: OpenAPIV3.OperationObject = {
        operationId: 'Users_GetAll',
        responses: {},
      };
      expect(getOperationName(operation, 'Users')).toBe('getAll');
    });

    it('should handle Tag_Method with multiple underscores and normalize to camelCase', () => {
      const operation: OpenAPIV3.OperationObject = {
        operationId: 'User_Management_GetAll',
        responses: {},
      };
      expect(getOperationName(operation, 'UserManagement')).toBe('getAll');
    });

    it('should generate fallback name from HTTP method', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
      };
      expect(getOperationName(operation, 'Users', 'get')).toBe('getUsers');
    });

    it('should use generic fallback when no operationId or httpMethod', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
      };
      expect(getOperationName(operation, 'Users')).toBe('operationUsers');
    });
  });

  describe('parseOperationId', () => {
    it('should parse Tag_Method format', () => {
      expect(parseOperationId('Users_GetAll')).toEqual({
        tag: 'Users',
        method: 'GetAll',
      });
    });

    it('should parse different tag and method', () => {
      expect(parseOperationId('Orders_CreateOrder')).toEqual({
        tag: 'Orders',
        method: 'CreateOrder',
      });
    });

    it('should return null for operationId without underscore', () => {
      expect(parseOperationId('getUserById')).toBeNull();
    });

    it('should return null for undefined operationId', () => {
      expect(parseOperationId(undefined)).toBeNull();
    });

    it('should return null for operationId with more than one underscore', () => {
      expect(parseOperationId('User_Management_GetAll')).toBeNull();
    });

    it('should return null for operationId with only underscore', () => {
      expect(parseOperationId('_')).toBeNull();
    });
  });

  describe('buildEndpointDecoratorName', () => {
    it('should build decorator name from camelCase method', () => {
      expect(buildEndpointDecoratorName('getAll')).toBe('GetAllEndpoint');
    });

    it('should build decorator name from complex method', () => {
      expect(buildEndpointDecoratorName('getUserById')).toBe('GetUserByIdEndpoint');
    });

    it('should handle PascalCase input', () => {
      expect(buildEndpointDecoratorName('GetAll')).toBe('GetAllEndpoint');
    });

    it('should handle single word', () => {
      expect(buildEndpointDecoratorName('get')).toBe('GetEndpoint');
    });

    it('should handle empty string', () => {
      expect(buildEndpointDecoratorName('')).toBe('Endpoint');
    });

    it('should throw for non-string input', () => {
      expect(() => buildEndpointDecoratorName(null as any)).toThrow('buildEndpointDecoratorName() requires a string');
      expect(() => buildEndpointDecoratorName(undefined as any)).toThrow('buildEndpointDecoratorName() requires a string');
    });
  });

  describe('normalizeTagName', () => {
    it('should remove whitespace from tag', () => {
      expect(normalizeTagName('User Management')).toBe('UserManagement');
    });

    it('should handle multiple spaces', () => {
      expect(normalizeTagName('User  Management  System')).toBe('UserManagementSystem');
    });

    it('should handle tag without spaces', () => {
      expect(normalizeTagName('Users')).toBe('Users');
    });

    it('should handle empty string', () => {
      expect(normalizeTagName('')).toBe('');
    });

    it('should handle tabs and newlines', () => {
      expect(normalizeTagName('User\tManagement\n')).toBe('UserManagement');
    });

    it('should throw for non-string input', () => {
      expect(() => normalizeTagName(null as any)).toThrow('normalizeTagName() requires a string');
      expect(() => normalizeTagName(undefined as any)).toThrow('normalizeTagName() requires a string');
    });
  });

  describe('buildResourceName', () => {
    it('should build resource name from tag', () => {
      expect(buildResourceName('Users')).toBe('Users');
    });

    it('should remove whitespace', () => {
      expect(buildResourceName('User Management')).toBe('UserManagement');
    });

    it('should be same as normalizeTagName', () => {
      const tag = 'API v2 Users';
      expect(buildResourceName(tag)).toBe(normalizeTagName(tag));
    });
  });

  describe('buildControllerClassName', () => {
    it('should build controller class name', () => {
      expect(buildControllerClassName('Users')).toBe('UsersController');
    });

    it('should handle complex resource names', () => {
      expect(buildControllerClassName('OrderItems')).toBe('OrderItemsController');
    });

    it('should handle single character', () => {
      expect(buildControllerClassName('V')).toBe('VController');
    });

    it('should throw for non-string input', () => {
      expect(() => buildControllerClassName(null as any)).toThrow('buildControllerClassName() requires a string');
      expect(() => buildControllerClassName(undefined as any)).toThrow('buildControllerClassName() requires a string');
    });
  });

  describe('buildServiceInterfaceName', () => {
    it('should build service interface name', () => {
      expect(buildServiceInterfaceName('Users')).toBe('IUsersService');
    });

    it('should handle complex resource names', () => {
      expect(buildServiceInterfaceName('OrderItems')).toBe('IOrderItemsService');
    });

    it('should handle single character', () => {
      expect(buildServiceInterfaceName('V')).toBe('IVService');
    });

    it('should throw for non-string input', () => {
      expect(() => buildServiceInterfaceName(null as any)).toThrow('buildServiceInterfaceName() requires a string');
      expect(() => buildServiceInterfaceName(undefined as any)).toThrow('buildServiceInterfaceName() requires a string');
    });
  });
});
