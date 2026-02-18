// tests/utils/formatting-helpers.spec.ts
import {
  capitalize,
  formatDecoratorArguments,
  formatImportSpecifier,
  buildDecoratorString,
  extractRefName,
  normalizeSchemaName,
  buildDtoImportPath,
  toConstantCase,
  toEnumKey,
} from '../../src/utils/formatting-helpers';

describe('Formatting Helpers', () => {
  describe('capitalize', () => {
    it('should capitalize first character', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('world')).toBe('World');
    });

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A');
    });

    it('should handle already capitalized string', () => {
      expect(capitalize('Hello')).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('should preserve rest of string', () => {
      expect(capitalize('getUserById')).toBe('GetUserById');
    });

    it('should throw for non-string input', () => {
      expect(() => capitalize(null as any)).toThrow('capitalize() requires a string');
      expect(() => capitalize(undefined as any)).toThrow('capitalize() requires a string');
      expect(() => capitalize(123 as any)).toThrow('capitalize() requires a string');
    });
  });

  describe('formatDecoratorArguments', () => {
    it('should format single argument', () => {
      expect(formatDecoratorArguments(["'value'"])).toBe("('value')");
    });

    it('should format multiple arguments', () => {
      expect(formatDecoratorArguments(["'arg1'", "'arg2'"])).toBe("('arg1', 'arg2')");
    });

    it('should handle empty array', () => {
      expect(formatDecoratorArguments([])).toBe('()');
    });

    it('should handle complex arguments', () => {
      expect(formatDecoratorArguments(['{ type: User }', 'true'])).toBe('({ type: User }, true)');
    });

    it('should throw for non-array input', () => {
      expect(() => formatDecoratorArguments('not-array' as any)).toThrow('formatDecoratorArguments() requires an array');
      expect(() => formatDecoratorArguments(null as any)).toThrow('formatDecoratorArguments() requires an array');
    });
  });

  describe('formatImportSpecifier', () => {
    it('should format import statement', () => {
      expect(formatImportSpecifier('User', './user')).toBe("import { User } from './user';");
    });

    it('should handle relative paths', () => {
      expect(formatImportSpecifier('UserDto', '../dtos/UserDto.dto')).toBe("import { UserDto } from '../dtos/UserDto.dto';");
    });

    it('should handle module imports', () => {
      expect(formatImportSpecifier('Injectable', '@nestjs/common')).toBe("import { Injectable } from '@nestjs/common';");
    });

    it('should throw for invalid arguments', () => {
      expect(() => formatImportSpecifier(null as any, './path')).toThrow('formatImportSpecifier() requires string arguments');
      expect(() => formatImportSpecifier('Name', null as any)).toThrow('formatImportSpecifier() requires string arguments');
    });
  });

  describe('buildDecoratorString', () => {
    it('should build decorator without arguments', () => {
      expect(buildDecoratorString('Get')).toBe('@Get()');
    });

    it('should build decorator with single argument', () => {
      expect(buildDecoratorString('Get', ["'/users'"])).toBe("@Get('/users')");
    });

    it('should build decorator with multiple arguments', () => {
      expect(buildDecoratorString('ApiResponse', ['200', '{ type: User }'])).toBe('@ApiResponse(200, { type: User })');
    });

    it('should handle empty args array', () => {
      expect(buildDecoratorString('Body', [])).toBe('@Body()');
    });

    it('should throw for non-string name', () => {
      expect(() => buildDecoratorString(null as any)).toThrow('buildDecoratorString() requires a string name');
      expect(() => buildDecoratorString(123 as any)).toThrow('buildDecoratorString() requires a string name');
    });
  });

  describe('extractRefName', () => {
    it('should extract name from $ref path', () => {
      expect(extractRefName('#/components/schemas/UserDto')).toBe('UserDto');
      expect(extractRefName('#/components/schemas/CreateUserDto')).toBe('CreateUserDto');
    });

    it('should extract name from parameter ref', () => {
      expect(extractRefName('#/components/parameters/UserId')).toBe('UserId');
    });

    it('should extract name from response ref', () => {
      expect(extractRefName('#/components/responses/NotFound')).toBe('NotFound');
    });

    it('should handle simple paths', () => {
      expect(extractRefName('UserDto')).toBe('UserDto');
    });

    it('should return null for empty string after split', () => {
      expect(extractRefName('#/components/schemas/')).toBeNull();
    });

    it('should return null for trailing slash', () => {
      expect(extractRefName('path/to/schema/')).toBeNull();
    });

    it('should throw for non-string input', () => {
      expect(() => extractRefName(null as any)).toThrow('extractRefName() requires a string');
      expect(() => extractRefName(undefined as any)).toThrow('extractRefName() requires a string');
    });
  });

  describe('normalizeSchemaName', () => {
    it('should convert Object to ObjectDto', () => {
      expect(normalizeSchemaName('Object')).toBe('ObjectDto');
    });

    it('should leave other names unchanged', () => {
      expect(normalizeSchemaName('UserDto')).toBe('UserDto');
      expect(normalizeSchemaName('CreateUserDto')).toBe('CreateUserDto');
      expect(normalizeSchemaName('String')).toBe('String');
    });

    it('should handle empty string', () => {
      expect(normalizeSchemaName('')).toBe('');
    });

    it('should throw for non-string input', () => {
      expect(() => normalizeSchemaName(null as any)).toThrow('normalizeSchemaName() requires a string');
      expect(() => normalizeSchemaName(undefined as any)).toThrow('normalizeSchemaName() requires a string');
    });
  });

  describe('buildDtoImportPath', () => {
    it('should build DTO import path', () => {
      expect(buildDtoImportPath('UserDto')).toBe('../dtos/UserDto.dto');
      expect(buildDtoImportPath('CreateUserDto')).toBe('../dtos/CreateUserDto.dto');
    });

    it('should handle ObjectDto', () => {
      expect(buildDtoImportPath('ObjectDto')).toBe('../dtos/ObjectDto.dto');
    });

    it('should throw for non-string input', () => {
      expect(() => buildDtoImportPath(null as any)).toThrow('buildDtoImportPath() requires a string');
      expect(() => buildDtoImportPath(undefined as any)).toThrow('buildDtoImportPath() requires a string');
    });
  });

  describe('toConstantCase', () => {
    it('should convert camelCase to UPPER_SNAKE_CASE', () => {
      expect(toConstantCase('clientResponse')).toBe('CLIENT_RESPONSE');
      expect(toConstantCase('getUserById')).toBe('GET_USER_BY_ID');
    });

    it('should convert PascalCase to UPPER_SNAKE_CASE', () => {
      expect(toConstantCase('ClientResponseDto')).toBe('CLIENT_RESPONSE_DTO');
      expect(toConstantCase('UserDto')).toBe('USER_DTO');
    });

    it('should replace spaces with underscores', () => {
      expect(toConstantCase('client response')).toBe('CLIENT_RESPONSE');
    });

    it('should replace hyphens with underscores', () => {
      expect(toConstantCase('client-response')).toBe('CLIENT_RESPONSE');
    });

    it('should handle already uppercase strings', () => {
      expect(toConstantCase('STATUS')).toBe('STATUS');
    });

    it('should handle single word', () => {
      expect(toConstantCase('status')).toBe('STATUS');
    });

    it('should handle empty string', () => {
      expect(toConstantCase('')).toBe('');
    });

    it('should throw for non-string input', () => {
      expect(() => toConstantCase(null as any)).toThrow('toConstantCase() requires a string');
      expect(() => toConstantCase(undefined as any)).toThrow('toConstantCase() requires a string');
    });
  });

  describe('toEnumKey', () => {
    it('should convert valid enum values to uppercase', () => {
      expect(toEnumKey('active')).toBe('ACTIVE');
      expect(toEnumKey('pending')).toBe('PENDING');
    });

    it('should replace spaces with underscores', () => {
      expect(toEnumKey('in progress')).toBe('IN_PROGRESS');
    });

    it('should replace hyphens with underscores', () => {
      expect(toEnumKey('not-found')).toBe('NOT_FOUND');
    });

    it('should handle already valid keys', () => {
      expect(toEnumKey('ACTIVE')).toBe('ACTIVE');
      expect(toEnumKey('IN_PROGRESS')).toBe('IN_PROGRESS');
    });

    it('should quote invalid identifiers', () => {
      // Starts with number
      expect(toEnumKey('2fa')).toBe("'2FA'");

      // Contains special characters after replacement
      const result = toEnumKey('status@value');
      expect(result).toMatch(/^'.*'$/);
    });

    it('should handle empty string', () => {
      expect(toEnumKey('')).toBe("''");
    });

    it('should throw for non-string input', () => {
      expect(() => toEnumKey(null as any)).toThrow('toEnumKey() requires a string');
      expect(() => toEnumKey(undefined as any)).toThrow('toEnumKey() requires a string');
    });
  });
});
