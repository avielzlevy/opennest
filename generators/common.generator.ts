import { Project, VariableDeclarationKind } from 'ts-morph';
import { IGenerator } from '../interfaces/core';

export class CommonGenerator implements IGenerator {
  public generate(_: any, project: Project): void {
    
    // 1. Generate Common Error DTO
    const errorDtoFile = project.createSourceFile('src/common/dto/error.dto.ts', '', { overwrite: true });
    
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
    const jwtFile = project.createSourceFile('src/common/decorators/auth/jwt.decorator.ts', '', { overwrite: true });
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
    const apiKeyFile = project.createSourceFile('src/common/decorators/auth/apiKey.decorator.ts', '', { overwrite: true });
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
  }
}