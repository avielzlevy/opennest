// tests/utils/route-helpers.spec.ts
import {
  buildHttpRoute,
  extractPathParameters,
  normalizeResourceName,
  buildControllerBasePath,
  sanitizeParamName,
  mapParameterLocation,
  inferParameterType,
} from '../../src/utils/route-helpers';

describe('Route Helpers', () => {
  describe('buildHttpRoute', () => {
    it('should convert OpenAPI path to NestJS route', () => {
      expect(buildHttpRoute('/api/users/{id}')).toBe(':id');
    });

    it('should handle nested paths', () => {
      expect(buildHttpRoute('/api/users/{userId}/orders/{orderId}')).toBe(':userId/orders/:orderId');
    });

    it('should handle root resource path', () => {
      expect(buildHttpRoute('/api/users')).toBe('');
    });

    it('should handle path without /api prefix', () => {
      expect(buildHttpRoute('/users/{id}')).toBe(':id');
    });

    it('should handle multiple path segments', () => {
      expect(buildHttpRoute('/api/users/{id}/profile')).toBe(':id/profile');
    });

    it('should handle static paths after resource', () => {
      expect(buildHttpRoute('/api/users/active')).toBe('active');
    });

    it('should handle mixed static and parameter paths', () => {
      expect(buildHttpRoute('/api/users/{id}/posts/{postId}/comments')).toBe(':id/posts/:postId/comments');
    });

    it('should handle paths with trailing slash', () => {
      expect(buildHttpRoute('/api/users/{id}/')).toBe(':id');
    });

    it('should handle paths with leading slash', () => {
      expect(buildHttpRoute('/users/{id}')).toBe(':id');
    });

    it('should throw for invalid input', () => {
      expect(() => buildHttpRoute(null as any)).toThrow('buildHttpRoute() requires a string path');
      expect(() => buildHttpRoute(undefined as any)).toThrow('buildHttpRoute() requires a string path');
      expect(() => buildHttpRoute(123 as any)).toThrow('buildHttpRoute() requires a string path');
    });
  });

  describe('extractPathParameters', () => {
    it('should extract single parameter', () => {
      expect(extractPathParameters('/api/users/{id}')).toEqual(['id']);
    });

    it('should extract multiple parameters', () => {
      expect(extractPathParameters('/api/users/{userId}/orders/{orderId}')).toEqual(['userId', 'orderId']);
    });

    it('should return empty array for paths without parameters', () => {
      expect(extractPathParameters('/api/users')).toEqual([]);
    });

    it('should handle parameters with hyphens', () => {
      expect(extractPathParameters('/api/users/{user-id}')).toEqual(['user-id']);
    });

    it('should handle parameters with underscores', () => {
      expect(extractPathParameters('/api/users/{user_id}')).toEqual(['user_id']);
    });

    it('should extract all parameters in complex path', () => {
      expect(extractPathParameters('/api/{version}/users/{userId}/posts/{postId}/comments/{commentId}'))
        .toEqual(['version', 'userId', 'postId', 'commentId']);
    });

    it('should throw for invalid input', () => {
      expect(() => extractPathParameters(null as any)).toThrow('extractPathParameters() requires a string path');
      expect(() => extractPathParameters(undefined as any)).toThrow('extractPathParameters() requires a string path');
    });
  });

  describe('normalizeResourceName', () => {
    it('should remove whitespace from tag', () => {
      expect(normalizeResourceName('User Management')).toBe('UserManagement');
    });

    it('should handle multiple spaces', () => {
      expect(normalizeResourceName('User  Management  System')).toBe('UserManagementSystem');
    });

    it('should handle tag without spaces', () => {
      expect(normalizeResourceName('Users')).toBe('Users');
    });

    it('should handle empty string', () => {
      expect(normalizeResourceName('')).toBe('');
    });

    it('should handle tabs and newlines', () => {
      expect(normalizeResourceName('User\tManagement\n')).toBe('UserManagement');
    });

    it('should throw for invalid input', () => {
      expect(() => normalizeResourceName(null as any)).toThrow('normalizeResourceName() requires a string');
      expect(() => normalizeResourceName(undefined as any)).toThrow('normalizeResourceName() requires a string');
    });
  });

  describe('buildControllerBasePath', () => {
    it('should build base path from tag', () => {
      expect(buildControllerBasePath('Users')).toBe('api/users');
    });

    it('should lowercase tag', () => {
      expect(buildControllerBasePath('UserManagement')).toBe('api/usermanagement');
    });

    it('should handle single character tag', () => {
      expect(buildControllerBasePath('V')).toBe('api/v');
    });

    it('should throw for invalid input', () => {
      expect(() => buildControllerBasePath(null as any)).toThrow('buildControllerBasePath() requires a string');
      expect(() => buildControllerBasePath(undefined as any)).toThrow('buildControllerBasePath() requires a string');
    });
  });

  describe('sanitizeParamName', () => {
    it('should convert hyphenated names to camelCase', () => {
      expect(sanitizeParamName('user-id')).toBe('userId');
      expect(sanitizeParamName('order-item-id')).toBe('orderItemId');
    });

    it('should convert snake_case to camelCase', () => {
      expect(sanitizeParamName('user_id')).toBe('userId');
      expect(sanitizeParamName('order_item_id')).toBe('orderItemId');
    });

    it('should convert space-separated to camelCase', () => {
      expect(sanitizeParamName('user id')).toBe('userId');
    });

    it('should handle already camelCase names', () => {
      expect(sanitizeParamName('userId')).toBe('userId');
    });

    it('should handle single word', () => {
      expect(sanitizeParamName('id')).toBe('id');
    });

    it('should handle mixed separators', () => {
      expect(sanitizeParamName('user-id_name')).toBe('userIdName');
    });

    it('should handle trailing separator', () => {
      expect(sanitizeParamName('user-id-')).toBe('userId');
    });

    it('should handle leading separator', () => {
      expect(sanitizeParamName('-user-id')).toBe('UserId');
    });

    it('should handle multiple consecutive separators', () => {
      expect(sanitizeParamName('user--id')).toBe('userId');
    });

    it('should throw for invalid input', () => {
      expect(() => sanitizeParamName(null as any)).toThrow('sanitizeParamName() requires a string');
      expect(() => sanitizeParamName(undefined as any)).toThrow('sanitizeParamName() requires a string');
    });
  });

  describe('mapParameterLocation', () => {
    it('should map path to Param', () => {
      expect(mapParameterLocation('path')).toBe('Param');
    });

    it('should map query to Query', () => {
      expect(mapParameterLocation('query')).toBe('Query');
    });

    it('should map header to Headers', () => {
      expect(mapParameterLocation('header')).toBe('Headers');
    });

    it('should map cookie to Headers', () => {
      expect(mapParameterLocation('cookie')).toBe('Headers');
    });

    it('should default to Query for unknown locations', () => {
      expect(mapParameterLocation('body')).toBe('Query');
      expect(mapParameterLocation('unknown')).toBe('Query');
    });

    it('should throw for invalid input', () => {
      expect(() => mapParameterLocation(null as any)).toThrow('mapParameterLocation() requires a string');
      expect(() => mapParameterLocation(undefined as any)).toThrow('mapParameterLocation() requires a string');
    });
  });

  describe('inferParameterType', () => {
    it('should infer number for integer type', () => {
      expect(inferParameterType({ type: 'integer' })).toBe('number');
    });

    it('should infer number for number type', () => {
      expect(inferParameterType({ type: 'number' })).toBe('number');
    });

    it('should infer boolean for boolean type', () => {
      expect(inferParameterType({ type: 'boolean' })).toBe('boolean');
    });

    it('should infer string for string type', () => {
      expect(inferParameterType({ type: 'string' })).toBe('string');
    });

    it('should default to string for object type', () => {
      expect(inferParameterType({ type: 'object' })).toBe('string');
    });

    it('should default to string for array type', () => {
      expect(inferParameterType({ type: 'array' })).toBe('string');
    });

    it('should default to string for undefined schema', () => {
      expect(inferParameterType(undefined)).toBe('string');
    });

    it('should default to string for null schema', () => {
      expect(inferParameterType(null)).toBe('string');
    });

    it('should default to string for non-object schema', () => {
      expect(inferParameterType('string')).toBe('string');
      expect(inferParameterType(123)).toBe('string');
    });

    it('should default to string for empty object', () => {
      expect(inferParameterType({})).toBe('string');
    });
  });
});
