// tests/utils/path-fallback.test.ts

import {
  filterPathParams,
  generateOperationNameFromPath,
  generateFallbackOperationName,
  shouldUseFallback,
} from '../../src/utils/path-fallback';

describe('Path-Based Fallback', () => {
  describe('filterPathParams()', () => {
    it('should remove parameter placeholders', () => {
      expect(filterPathParams(['users', '{id}'])).toEqual(['users']);
      expect(filterPathParams(['users', '{userId}', 'posts'])).toEqual(['users', 'posts']);
    });

    it('should remove empty segments', () => {
      expect(filterPathParams(['users', '', 'posts'])).toEqual(['users', 'posts']);
      expect(filterPathParams(['', 'users'])).toEqual(['users']);
    });

    it('should preserve non-parameter segments', () => {
      expect(filterPathParams(['api', 'v1', 'users'])).toEqual(['api', 'v1', 'users']);
    });

    it('should handle all parameter placeholders', () => {
      expect(
        filterPathParams(['users', '{id}', 'posts', '{postId}', 'comments', '{commentId}'])
      ).toEqual(['users', 'posts', 'comments']);
    });

    it('should handle empty array', () => {
      expect(filterPathParams([])).toEqual([]);
    });
  });

  describe('generateOperationNameFromPath()', () => {
    it('should generate GET operation names', () => {
      expect(generateOperationNameFromPath('/users', 'GET')).toBe('getUsers');
      expect(generateOperationNameFromPath('/users/{id}', 'GET')).toBe('getUsers');
      expect(generateOperationNameFromPath('/api/v1/users', 'GET')).toBe('getApiV1Users');
    });

    it('should generate POST operation names', () => {
      expect(generateOperationNameFromPath('/users', 'POST')).toBe('createUsers');
      expect(generateOperationNameFromPath('/users/roles', 'POST')).toBe('createUsersRoles');
    });

    it('should generate PUT operation names', () => {
      expect(generateOperationNameFromPath('/users/{id}', 'PUT')).toBe('updateUsers');
      expect(generateOperationNameFromPath('/posts/{id}', 'PUT')).toBe('updatePosts');
    });

    it('should generate DELETE operation names', () => {
      expect(generateOperationNameFromPath('/users/{id}', 'DELETE')).toBe('deleteUsers');
      expect(generateOperationNameFromPath('/posts/{id}', 'DELETE')).toBe('deletePosts');
    });

    it('should generate PATCH operation names', () => {
      expect(generateOperationNameFromPath('/users/{id}', 'PATCH')).toBe('updateUsers');
    });

    it('should handle complex paths with multiple parameters', () => {
      expect(generateOperationNameFromPath('/organizations/{orgId}/members/{memberId}', 'DELETE'))
        .toBe('deleteOrganizationsMembers');

      expect(generateOperationNameFromPath('/api/v1/users/{userId}/posts/{postId}/comments', 'GET'))
        .toBe('getApiV1UsersPostsComments');
    });

    it('should handle edge cases', () => {
      expect(() => generateOperationNameFromPath('', 'GET')).not.toThrow();
      expect(() => generateOperationNameFromPath(null as any, 'GET')).not.toThrow();
      expect(() => generateOperationNameFromPath('/users', '')).not.toThrow();
    });

    it('should return method name when path is empty', () => {
      expect(generateOperationNameFromPath('', 'GET')).toBe('get');
      expect(generateOperationNameFromPath(null as any, 'POST')).toBe('post');
    });

    it('should normalize method names to lowercase', () => {
      expect(generateOperationNameFromPath('/users', 'get')).toBe('getUsers');
      expect(generateOperationNameFromPath('/users', 'GET')).toBe('getUsers');
      expect(generateOperationNameFromPath('/users', 'Get')).toBe('getUsers');
    });
  });

  describe('shouldUseFallback()', () => {
    it('should return true for null and undefined', () => {
      expect(shouldUseFallback(null)).toBe(true);
      expect(shouldUseFallback(undefined)).toBe(true);
    });

    it('should return true for empty or whitespace-only strings', () => {
      expect(shouldUseFallback('')).toBe(true);
      expect(shouldUseFallback('   ')).toBe(true);
      expect(shouldUseFallback('\t')).toBe(true);
      expect(shouldUseFallback('\n')).toBe(true);
    });

    it('should return false for valid operationIds', () => {
      expect(shouldUseFallback('getUser')).toBe(false);
      expect(shouldUseFallback('User_GetById')).toBe(false);
      expect(shouldUseFallback('get_users_by_id')).toBe(false);
    });

    it('should return true for non-string types', () => {
      expect(shouldUseFallback(123)).toBe(true);
      expect(shouldUseFallback({})).toBe(true);
      expect(shouldUseFallback([])).toBe(true);
    });
  });

  describe('generateFallbackOperationName()', () => {
    it('should return success result with generated name', () => {
      const result = generateFallbackOperationName('/users/{id}', 'GET', 'operationId was missing');

      expect(result.success).toBe(true);
      expect(result.operationName).toBe('getUsers');
      expect(result.reason).toBe('operationId was missing');
      expect(result.error).toBeUndefined();
    });

    it('should include path and method in result', () => {
      const result = generateFallbackOperationName('/api/posts', 'POST', 'operationId was empty');

      expect(result.path).toBe('/api/posts');
      expect(result.method).toBe('POST');
    });

    it('should handle generation errors gracefully', () => {
      // Even with edge cases, should return success (uses fallback verb only)
      const result = generateFallbackOperationName('', 'INVALID_METHOD', 'test');

      expect(result.operationName).toBeDefined();
      expect(result.operationName.length).toBeGreaterThan(0);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle Petstore API paths', () => {
      expect(generateOperationNameFromPath('/pets', 'GET')).toBe('getPets');
      expect(generateOperationNameFromPath('/pets', 'POST')).toBe('createPets');
      expect(generateOperationNameFromPath('/pets/{petId}', 'GET')).toBe('getPets');
      expect(generateOperationNameFromPath('/pets/{petId}', 'DELETE')).toBe('deletePets');
    });

    it('should handle complex REST paths', () => {
      // Complex path from real-world API
      expect(generateOperationNameFromPath('/v1/organizations/{orgId}/teams/{teamId}/members', 'GET'))
        .toBe('getV1OrganizationsTeamsMembers');

      expect(generateOperationNameFromPath('/api/v2/users/{userId}/data/export', 'POST'))
        .toBe('createApiV2UsersDataExport');
    });

    it('should handle normalized path formats', () => {
      // Paths starting with /
      expect(generateOperationNameFromPath('/users', 'GET')).toBe('getUsers');

      // Paths without leading /
      expect(generateOperationNameFromPath('users', 'GET')).toBe('getUsers');
    });
  });
});
