// tests/cli/spec-traverser.test.ts

import {
  isValidHttpMethod,
  extractOperation,
  traverseSpecOperations,
  getPrimaryTag,
  groupOperationsByTag,
  mapToObject,
  VALID_HTTP_METHODS,
} from '../../src/cli/spec-traverser';

describe('Spec Traverser', () => {
  describe('isValidHttpMethod()', () => {
    it('should validate valid HTTP methods', () => {
      expect(isValidHttpMethod('get')).toBe(true);
      expect(isValidHttpMethod('post')).toBe(true);
      expect(isValidHttpMethod('put')).toBe(true);
      expect(isValidHttpMethod('delete')).toBe(true);
      expect(isValidHttpMethod('patch')).toBe(true);
      expect(isValidHttpMethod('head')).toBe(true);
      expect(isValidHttpMethod('options')).toBe(true);
    });

    it('should reject invalid HTTP methods', () => {
      expect(isValidHttpMethod('INVALID')).toBe(false);
      expect(isValidHttpMethod('trace')).toBe(false);
      expect(isValidHttpMethod('')).toBe(false);
    });
  });

  describe('extractOperation()', () => {
    it('should extract valid operation', () => {
      const operation = {
        operationId: 'getUser',
        tags: ['users'],
        summary: 'Get a user',
        parameters: [],
        responses: {},
      };

      const result = extractOperation('/users/{id}', 'get', operation);

      expect(result).not.toBeNull();
      expect(result?.operationId).toBe('getUser');
      expect(result?.path).toBe('/users/{id}');
      expect(result?.method).toBe('GET');
      expect(result?.tags).toEqual(['users']);
    });

    it('should return null for invalid path', () => {
      const operation = { operationId: 'test' };

      expect(extractOperation('', 'get', operation)).toBeNull();
      expect(extractOperation(null as any, 'get', operation)).toBeNull();
    });

    it('should return null for invalid method', () => {
      const operation = { operationId: 'test' };

      expect(extractOperation('/users', 'invalid', operation)).toBeNull();
    });

    it('should handle missing operationId', () => {
      const operation = { tags: ['users'] };

      const result = extractOperation('/users', 'get', operation);

      expect(result).not.toBeNull();
      expect(result?.operationId).toBeUndefined();
    });

    it('should handle missing tags', () => {
      const operation = { operationId: 'getUser' };

      const result = extractOperation('/users', 'get', operation);

      expect(result).not.toBeNull();
      expect(result?.tags).toBeUndefined();
    });
  });

  describe('traverseSpecOperations()', () => {
    it('should extract all operations from spec', () => {
      const spec = {
        paths: {
          '/users': {
            get: { operationId: 'listUsers' },
            post: { operationId: 'createUser' },
          },
          '/users/{id}': {
            get: { operationId: 'getUser' },
            delete: { operationId: 'deleteUser' },
          },
        },
      };

      const operations = traverseSpecOperations(spec);

      expect(operations.length).toBe(4);
      expect(operations.map(op => op.operationId)).toEqual([
        'listUsers',
        'createUser',
        'getUser',
        'deleteUser',
      ]);
    });

    it('should handle empty paths', () => {
      const spec = { paths: {} };

      const operations = traverseSpecOperations(spec);

      expect(operations.length).toBe(0);
    });

    it('should handle missing paths', () => {
      const spec = {};

      const operations = traverseSpecOperations(spec);

      expect(operations.length).toBe(0);
    });

    it('should skip invalid path items', () => {
      const spec = {
        paths: {
          '/users': {
            get: { operationId: 'getUser' },
          },
          '/invalid': null,
        },
      };

      const operations = traverseSpecOperations(spec);

      expect(operations.length).toBe(1);
    });
  });

  describe('getPrimaryTag()', () => {
    it('should return first tag', () => {
      const operation: any = { tags: ['users', 'admin'] };

      expect(getPrimaryTag(operation)).toBe('users');
    });

    it('should return undefined for no tags', () => {
      const operation: any = {};

      expect(getPrimaryTag(operation)).toBeUndefined();
    });

    it('should return undefined for empty tags array', () => {
      const operation: any = { tags: [] };

      expect(getPrimaryTag(operation)).toBeUndefined();
    });
  });

  describe('groupOperationsByTag()', () => {
    it('should group operations by tag', () => {
      const operations: any[] = [
        { path: '/users', tags: ['users'] },
        { path: '/users/{id}', tags: ['users'] },
        { path: '/posts', tags: ['posts'] },
      ];

      const grouped = groupOperationsByTag(operations);

      expect(grouped.get('users')?.length).toBe(2);
      expect(grouped.get('posts')?.length).toBe(1);
    });

    it('should group untagged operations in Untagged', () => {
      const operations: any[] = [
        { path: '/users' },
        { path: '/posts' },
      ];

      const grouped = groupOperationsByTag(operations);

      expect(grouped.get('Untagged')?.length).toBe(2);
    });
  });

  describe('mapToObject()', () => {
    it('should convert Map to plain object', () => {
      const map = new Map<string, any[]>();
      map.set('users', [{ path: '/users' }]);
      map.set('posts', [{ path: '/posts' }]);

      const obj = mapToObject(map);

      expect(obj['users']).toBeDefined();
      expect(obj['posts']).toBeDefined();
      expect(Object.keys(obj).length).toBe(2);
    });
  });
});
