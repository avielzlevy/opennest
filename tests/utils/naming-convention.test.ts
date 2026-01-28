// tests/utils/naming-convention.test.ts

import { detectConvention, normalizeOperationName, ConventionResult } from '../../src/utils/naming-convention';

describe('Naming Convention Detection', () => {
  describe('Tag_method format', () => {
    it('should detect Tag_method with single underscore', () => {
      const result = detectConvention('User_GetById');
      expect(result.convention).toBe('tag_method');
      expect(result.tag).toBe('User');
      expect(result.method).toBe('GetById');
    });

    it('should normalize Tag_method to camelCase', () => {
      expect(detectConvention('User_GetById').operationName).toBe('userGetById');
      expect(detectConvention('Post_CreateNew').operationName).toBe('postCreateNew');
      expect(detectConvention('api_fetchData').operationName).toBe('apiFetchData');
    });

    it('should reject Tag_method with invalid tag or method parts', () => {
      const result = detectConvention('_GetById'); // empty tag
      expect(result.convention).not.toBe('tag_method');

      const result2 = detectConvention('User_'); // empty method
      expect(result2.convention).not.toBe('tag_method');
    });
  });

  describe('snake_case format', () => {
    it('should detect snake_case with 2+ underscores', () => {
      const result = detectConvention('get_users_by_id');
      expect(result.convention).toBe('snake_case');
    });

    it('should normalize snake_case to camelCase', () => {
      expect(normalizeOperationName('get_users_by_id')).toBe('getUsersById');
      expect(normalizeOperationName('create_new_post')).toBe('createNewPost');
      expect(normalizeOperationName('list_all_users')).toBe('listAllUsers');
    });
  });

  describe('camelCase format', () => {
    it('should detect camelCase', () => {
      const result = detectConvention('getUser');
      expect(result.convention).toBe('camel_case');
    });

    it('should return camelCase as-is', () => {
      expect(normalizeOperationName('getUser')).toBe('getUser');
      expect(normalizeOperationName('createNewPost')).toBe('createNewPost');
      expect(normalizeOperationName('listUsers')).toBe('listUsers');
    });

    it('should convert PascalCase to camelCase', () => {
      const result = detectConvention('GetUser');
      expect(result.convention).toBe('camel_case');
      expect(result.operationName).toBe('getUser');
      expect(result.warnings).toContain('PascalCase detected and converted to camelCase');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle null and undefined gracefully', () => {
      expect(() => detectConvention(null as any)).not.toThrow();
      expect(() => detectConvention(undefined as any)).not.toThrow();
    });

    it('should handle empty string', () => {
      const result = detectConvention('');
      expect(result.operationName).toBe('_');
      expect(result.warnings).toContain('Input is null, undefined, or not a string');
    });

    it('should sanitize invalid characters', () => {
      const result = detectConvention('get-user-by-id');
      expect(result.wasSanitized).toBe(true);
      expect(result.warnings).toContain('Input contained invalid characters and was sanitized');
      // After sanitization: getusersbyid → should normalize properly
      expect(result.operationName).toBeDefined();
    });

    it('should handle special characters', () => {
      expect(() => detectConvention('get@user#by$id')).not.toThrow();
      expect(() => detectConvention('user/get/by/id')).not.toThrow();
    });

    it('should handle numbers in operationId', () => {
      const result = detectConvention('getUser2');
      expect(result.operationName).toBe('getUser2');
    });

    it('should handle leading/trailing underscores after sanitization', () => {
      expect(() => detectConvention('_getUser_')).not.toThrow();
    });
  });

  describe('normalizeOperationName convenience function', () => {
    it('should return normalized name directly', () => {
      expect(normalizeOperationName('User_GetById')).toBe('userGetById');
      expect(normalizeOperationName('get_users_by_id')).toBe('getUsersById');
      expect(normalizeOperationName('getUser')).toBe('getUser');
    });

    it('should not throw on invalid input', () => {
      expect(() => normalizeOperationName(null as any)).not.toThrow();
      expect(() => normalizeOperationName('')).not.toThrow();
    });
  });

  describe('Warnings tracking', () => {
    it('should include sanitization warnings', () => {
      const result = detectConvention('get-user');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should not include warnings for valid input', () => {
      const result = detectConvention('getUser');
      expect(result.warnings.length).toBe(0);
    });
  });
});
