// tests/utils/naming-convention.integration.test.ts

import { detectConvention } from '../../src/utils/naming-convention';

describe('Naming Convention - Integration Tests', () => {
  describe('Real-world operationId patterns', () => {
    it('should handle Petstore API style operationIds', () => {
      // Petstore uses camelCase
      expect(detectConvention('listPets').operationName).toBe('listPets');
      expect(detectConvention('createPets').operationName).toBe('createPets');
    });

    it('should handle Tag_method style operationIds', () => {
      // Azure API style
      expect(detectConvention('Users_GetById').operationName).toBe('usersGetById');
      expect(detectConvention('Posts_CreateNew').operationName).toBe('postsCreateNew');
    });

    it('should handle snake_case style operationIds', () => {
      // Python-style APIs
      expect(detectConvention('list_all_users').operationName).toBe('listAllUsers');
      expect(detectConvention('create_new_post').operationName).toBe('createNewPost');
    });

    it('should handle mixed real-world operationIds', () => {
      const ids = [
        'getUser',
        'User_GetById',
        'get_users_by_status',
        'CreateNewPost',
        'post_list_comments',
      ];

      const normalized = ids.map(id => detectConvention(id).operationName);

      // All should be valid identifiers and lowercase start
      normalized.forEach(name => {
        expect(/^[a-z_$]/.test(name)).toBe(true);
        expect(/[^a-zA-Z0-9_$]/.test(name)).toBe(false);
      });
    });
  });

  describe('Malformed operationIds', () => {
    it('should not crash on empty or null operationIds', () => {
      const malformed = ['', null, undefined, '   ', '!!!'];

      malformed.forEach(id => {
        expect(() => detectConvention(id as any)).not.toThrow();
      });
    });

    it('should gracefully handle special characters', () => {
      expect(() => detectConvention('get-user-by-id')).not.toThrow();
      expect(() => detectConvention('get/user/by/id')).not.toThrow();
      expect(() => detectConvention('get@user#by$id')).not.toThrow();
    });
  });

  describe('Convention consistency', () => {
    it('should consistently normalize the same operationId', () => {
      const operationId = 'User_GetById';
      const result1 = detectConvention(operationId).operationName;
      const result2 = detectConvention(operationId).operationName;

      expect(result1).toBe(result2);
    });

    it('should normalize different formats to same camelCase', () => {
      const operationIds = [
        'getUser',
        'get_user',
        'Get_user',
        'GetUser',
      ];

      const normalized = operationIds.map(id => detectConvention(id).operationName);

      // All should normalize to the same camelCase result
      const unique = new Set(normalized);
      expect(unique.size).toBe(1); // All normalize to 'getUser'
      expect(normalized[0]).toBe('getUser');
    });
  });
});
