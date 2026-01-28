// tests/cli/operation-parser.test.ts

import {
  parseOperationName,
  parseSpecOperations,
  groupParsedOperations,
  parseOperationsFromSpec,
} from '../../src/cli/operation-parser';
import { ParsedApiResource } from '../../src/types/openapi';

describe('Operation Parser', () => {
  describe('parseOperationName()', () => {
    it('should parse camelCase operationId', () => {
      const resource: ParsedApiResource = {
        path: '/users',
        method: 'GET',
        operationId: 'listUsers',
        parameters: [],
        responses: {},
      };

      const result = parseOperationName(resource);

      expect(result.operationName).toBe('listUsers');
      expect(result.convention).toBe('camel_case');
      expect(result.usedFallback).toBe(false);
    });

    it('should parse Tag_method operationId', () => {
      const resource: ParsedApiResource = {
        path: '/users/{id}',
        method: 'GET',
        operationId: 'User_GetById',
        parameters: [],
        responses: {},
      };

      const result = parseOperationName(resource);

      expect(result.operationName).toBe('userGetById');
      expect(result.convention).toBe('tag_method');
      expect(result.tag).toBe('User');
      expect(result.tagMethod).toBe('GetById');
      expect(result.usedFallback).toBe(false);
    });

    it('should use fallback when operationId is missing', () => {
      const resource: ParsedApiResource = {
        path: '/users/{id}',
        method: 'GET',
        parameters: [],
        responses: {},
      };

      const result = parseOperationName(resource);

      expect(result.operationName).toBe('getUsers');
      expect(result.usedFallback).toBe(true);
      expect(result.fallbackResult).toBeDefined();
    });

    it('should use fallback when operationId is empty string', () => {
      const resource: ParsedApiResource = {
        path: '/users',
        method: 'POST',
        operationId: '',
        parameters: [],
        responses: {},
      };

      const result = parseOperationName(resource);

      expect(result.usedFallback).toBe(true);
    });

    it('should handle complex paths in fallback', () => {
      const resource: ParsedApiResource = {
        path: '/api/v1/organizations/{orgId}/members/{memberId}',
        method: 'DELETE',
        parameters: [],
        responses: {},
      };

      const result = parseOperationName(resource);

      expect(result.operationName).toBe('deleteApiV1OrganizationsMembers');
      expect(result.usedFallback).toBe(true);
    });
  });

  describe('parseSpecOperations()', () => {
    it('should parse multiple operations from spec', () => {
      const spec = {
        paths: {
          '/users': {
            get: {
              operationId: 'listUsers',
              tags: ['users'],
            },
            post: {
              operationId: 'createUser',
              tags: ['users'],
            },
          },
          '/users/{id}': {
            get: {
              operationId: 'getUser',
              tags: ['users'],
            },
            delete: {
              operationId: 'deleteUser',
              tags: ['users'],
            },
          },
        },
      };

      const result = parseSpecOperations(spec);

      expect(result.operations.length).toBe(4);
      expect(result.skipped.length).toBe(0);
    });

    it('should handle missing operationIds with fallback', () => {
      const spec = {
        paths: {
          '/users': {
            get: {
              tags: ['users'],
            },
            post: {
              tags: ['users'],
            },
          },
        },
      };

      const result = parseSpecOperations(spec);

      expect(result.operations.length).toBe(2);
      expect(result.operations.every(op => op.usedFallback)).toBe(true);
    });

    it('should handle empty spec', () => {
      const spec = { paths: {} };

      const result = parseSpecOperations(spec);

      expect(result.operations.length).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('groupParsedOperations()', () => {
    it('should group operations by tag', () => {
      const parseResult = {
        operations: [
          { tag: 'User', operationName: 'getUser' } as any,
          { tag: 'User', operationName: 'createUser' } as any,
          { tag: 'Post', operationName: 'getPost' } as any,
        ],
        skipped: [],
        warnings: [],
      };

      const grouped = groupParsedOperations(parseResult);

      expect(grouped['User'].length).toBe(2);
      expect(grouped['Post'].length).toBe(1);
    });

    it('should put untagged operations in Untagged group', () => {
      const parseResult = {
        operations: [
          { operationName: 'getUser' } as any,
          { operationName: 'createUser' } as any,
        ],
        skipped: [],
        warnings: [],
      };

      const grouped = groupParsedOperations(parseResult);

      expect(grouped['Untagged'].length).toBe(2);
    });
  });

  describe('parseOperationsFromSpec()', () => {
    it('should return full parsing result with grouped operations', () => {
      const spec = {
        paths: {
          '/users': {
            get: {
              operationId: 'listUsers',
              tags: ['users'],
            },
          },
          '/posts': {
            get: {
              operationId: 'listPosts',
              tags: ['posts'],
            },
          },
        },
      };

      const result = parseOperationsFromSpec(spec);

      expect(result.operations.length).toBe(2);
      expect(result.grouped).toBeDefined();
      expect(Object.keys(result.grouped).length).toBeGreaterThan(0);
    });
  });
});
