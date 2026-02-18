import { Project } from 'ts-morph';
import { CommonGenerator, openApiPathToRegex } from '../../src/generators/common.generator';
import { OpenAPIV3 } from 'openapi-types';

describe('CommonGenerator', () => {
  let project: Project;
  let generator: CommonGenerator;

  beforeEach(() => {
    project = new Project({ useInMemoryFileSystem: true });
    generator = new CommonGenerator();
  });

  describe('openApiPathToRegex', () => {
    it('should convert a simple path', () => {
      expect(openApiPathToRegex('/users')).toBe('^\\/users\\/?$');
    });

    it('should convert path parameters to [^/]+', () => {
      expect(openApiPathToRegex('/users/{userId}')).toBe('^\\/users\\/[^\\/]+\\/?$');
    });

    it('should handle multiple path parameters', () => {
      expect(openApiPathToRegex('/users/{userId}/orders/{orderId}')).toBe(
        '^\\/users\\/[^\\/]+\\/orders\\/[^\\/]+\\/?$'
      );
    });

    it('should produce a regex that matches actual paths', () => {
      const pattern = new RegExp(openApiPathToRegex('/api/pet/{petId}'));
      expect(pattern.test('/api/pet/123')).toBe(true);
      expect(pattern.test('/api/pet/123/')).toBe(true);
      expect(pattern.test('/api/pet/')).toBe(false);
      expect(pattern.test('/api/pet/123/extra')).toBe(false);
      expect(pattern.test('/other/api/pet/123')).toBe(false);
    });
  });

  describe('method-not-allowed middleware generation', () => {
    it('should generate middleware file with correct route map', () => {
      const doc: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pets': {
            get: { operationId: 'listPets', tags: ['Pets'], responses: {} },
            post: { operationId: 'createPet', tags: ['Pets'], responses: {} },
          },
          '/pets/{petId}': {
            get: { operationId: 'getPet', tags: ['Pets'], responses: {} },
            delete: { operationId: 'deletePet', tags: ['Pets'], responses: {} },
          },
        },
      };

      generator.generate(doc, project, './generated');

      const middlewareFile = project.getSourceFile(
        './generated/common/middleware/method-not-allowed.middleware.ts'
      );
      expect(middlewareFile).toBeDefined();

      const text = middlewareFile!.getFullText();
      expect(text).toContain('ROUTE_MAP');
      expect(text).toContain('methodNotAllowedMiddleware');
      expect(text).toContain("'GET'");
      expect(text).toContain("'HEAD'");
      expect(text).toContain("'POST'");
      expect(text).toContain("'DELETE'");
      expect(text).toContain("'OPTIONS'");
      expect(text).toContain('^\\/pets\\/?$');
      expect(text).toContain('^\\/pets\\/[^\\/]+\\/?$');
    });

    it('should not generate middleware when document is undefined', () => {
      generator.generate(undefined, project, './generated');

      const middlewareFile = project.getSourceFile(
        './generated/common/middleware/method-not-allowed.middleware.ts'
      );
      expect(middlewareFile).toBeUndefined();
    });

    it('should not generate middleware when paths is empty', () => {
      const doc: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      };

      generator.generate(doc, project, './generated');

      const middlewareFile = project.getSourceFile(
        './generated/common/middleware/method-not-allowed.middleware.ts'
      );
      expect(middlewareFile).toBeUndefined();
    });

    it('should export methodNotAllowedMiddleware function', () => {
      const doc: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: { responses: {} },
          },
        },
      };

      generator.generate(doc, project, './generated');

      const middlewareFile = project.getSourceFile(
        './generated/common/middleware/method-not-allowed.middleware.ts'
      );
      const text = middlewareFile!.getFullText();
      expect(text).toContain('export function methodNotAllowedMiddleware');
    });

    it('should import Express types', () => {
      const doc: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: { responses: {} },
          },
        },
      };

      generator.generate(doc, project, './generated');

      const middlewareFile = project.getSourceFile(
        './generated/common/middleware/method-not-allowed.middleware.ts'
      );
      const text = middlewareFile!.getFullText();
      expect(text).toContain("from 'express'");
      expect(text).toContain('Request');
      expect(text).toContain('Response');
      expect(text).toContain('NextFunction');
    });

    it('should set Allow header and return 405 JSON in middleware logic', () => {
      const doc: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: { responses: {} },
          },
        },
      };

      generator.generate(doc, project, './generated');

      const text = project
        .getSourceFile('./generated/common/middleware/method-not-allowed.middleware.ts')!
        .getFullText();
      expect(text).toContain("res.setHeader('Allow'");
      expect(text).toContain('res.status(405)');
      expect(text).toContain("'Method Not Allowed'");
      expect(text).toContain('next()');
    });
  });
});
