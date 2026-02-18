import { OpenAPIV3 } from 'openapi-types';
import { Project, VariableDeclarationKind } from 'ts-morph';
import { IGenerator } from '../interfaces/core';
import { OutputStructureConfig } from '../utils/output-structure-manager';
import { collectAllowedMethodsByPath } from '../utils/operation-helpers';

/**
 * Converts an OpenAPI path template to a RegExp pattern string.
 * e.g. `/api/pet/{petId}` → `^\\/api\\/pet\\/[^/]+\\/?$`
 */
export function openApiPathToRegex(path: string): string {
  const escaped = path
    .replace(/\{[^}]+\}/g, '[^/]+')   // {param} → [^/]+
    .replace(/\//g, '\\/');             // / → \/
  return `^${escaped}\\/?$`;
}

export class CommonGenerator implements IGenerator {
  public generate(_document: OpenAPIV3.Document | undefined, project: Project, outputPath: string = './generated', config?: OutputStructureConfig): void {

    // 1. Generate Common Error DTO
    const errorDtoFile = project.createSourceFile(`${outputPath}/common/dto/error.dto.ts`, '', { overwrite: true });
    
    errorDtoFile.addImportDeclaration({
        namedImports: ['ApiProperty'],
        moduleSpecifier: '@nestjs/swagger'
    });

    errorDtoFile.addClass({
        name: 'ErrorDto',
        isExported: true,
        properties: [
            {
                name: 'message',
                type: 'string',
                hasExclamationToken: true, // FIX: Strict initialization
                decorators: [{ name: 'ApiProperty', arguments: ["{ description: 'Error message' }"] }]
            },
            {
                name: 'status',
                type: 'number',
                hasExclamationToken: true, // FIX: Strict initialization
                decorators: [{ name: 'ApiProperty', arguments: ["{ description: 'HTTP status code' }"] }]
            },
            {
                name: 'error',
                type: 'string',
                hasExclamationToken: true, // FIX: Strict initialization
                decorators: [{ name: 'ApiProperty', arguments: ["{ description: 'Error type' }"] }]
            }
        ]
    });

    errorDtoFile.addVariableStatement({
        declarationKind: VariableDeclarationKind.Const,
        isExported: true,
        declarations: [{
            name: 'examples',
            initializer: `{
                NotFoundError: {
                    message: 'The requested resource was not found',
                    status: 404,
                    error: 'Not Found',
                },
                InternalServerError: {
                    message: 'An unexpected error occurred',
                    status: 500,
                    error: 'Internal Server Error',
                },
            }`
        }]
    });

    // 2. JWT Decorator
    const jwtFile = project.createSourceFile(`${outputPath}/common/decorators/auth/jwt.decorator.ts`, '', { overwrite: true });
    jwtFile.addImportDeclaration({ namedImports: ['applyDecorators'], moduleSpecifier: '@nestjs/common' });
    jwtFile.addImportDeclaration({ namedImports: ['ApiBearerAuth', 'ApiUnauthorizedResponse'], moduleSpecifier: '@nestjs/swagger' });
    
    // Import from the common DTO
    jwtFile.addImportDeclaration({ namedImports: ['ErrorDto'], moduleSpecifier: '../../dto/error.dto' });

    jwtFile.addFunction({
      name: 'JwtDecorator',
      isExported: true,
      statements: `
        return applyDecorators(
          ApiBearerAuth(),
          ApiUnauthorizedResponse({
            type: ErrorDto,
            description: 'Unauthorized',
            schema: {
              example: {
                message: 'Invalid or expired JWT token',
                status: 401,
                error: 'Unauthorized',
              }
            }
          }),
        );
      `
    });

    // 3. API Key Decorator
    const apiKeyFile = project.createSourceFile(`${outputPath}/common/decorators/auth/apiKey.decorator.ts`, '', { overwrite: true });
    apiKeyFile.addImportDeclaration({ namedImports: ['applyDecorators'], moduleSpecifier: '@nestjs/common' });
    apiKeyFile.addImportDeclaration({ namedImports: ['ApiSecurity', 'ApiUnauthorizedResponse'], moduleSpecifier: '@nestjs/swagger' });
    
    // Import from the common DTO
    apiKeyFile.addImportDeclaration({ namedImports: ['ErrorDto'], moduleSpecifier: '../../dto/error.dto' });

    apiKeyFile.addFunction({
        name: 'ApiKeyDecorator',
        isExported: true,
        statements: `
          return applyDecorators(
            ApiSecurity('Api-Key'),
            ApiUnauthorizedResponse({
              type: ErrorDto,
              description: 'Unauthorized',
              schema: {
                example: {
                    message: 'Invalid or missing API key',
                    status: 401,
                    error: 'Unauthorized',
                }
              }
            }),
          );
        `
      });

    // 4. Method Not Allowed Middleware
    this.generateMethodNotAllowedMiddleware(_document, project, outputPath);
  }

  private generateMethodNotAllowedMiddleware(
    document: OpenAPIV3.Document | undefined,
    project: Project,
    outputPath: string
  ): void {
    const allowedMethods = collectAllowedMethodsByPath(document?.paths);
    if (Object.keys(allowedMethods).length === 0) return;

    const routeEntries = Object.entries(allowedMethods)
      .map(([path, methods]) => {
        const regex = openApiPathToRegex(path);
        const methodsStr = methods.map(m => `'${m}'`).join(', ');
        return `  { pattern: new RegExp('${regex}'), methods: [${methodsStr}] }`;
      })
      .join(',\n');

    const middlewareSource = `import { Request, Response, NextFunction } from 'express';

const ROUTE_MAP: { pattern: RegExp; methods: string[] }[] = [
${routeEntries}
];

export function methodNotAllowedMiddleware(req: Request, res: Response, next: NextFunction): void {
  const matched = ROUTE_MAP.find(route => route.pattern.test(req.path));
  if (matched && !matched.methods.includes(req.method)) {
    res.setHeader('Allow', matched.methods.join(', '));
    res.status(405).json({
      statusCode: 405,
      message: \`Method \${req.method} is not allowed for \${req.path}\`,
      error: 'Method Not Allowed',
    });
    return;
  }
  next();
}
`;

    project.createSourceFile(
      `${outputPath}/common/middleware/method-not-allowed.middleware.ts`,
      middlewareSource,
      { overwrite: true }
    );
  }
}