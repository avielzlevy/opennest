import {
  isValidIdentifier,
  hasNestJsConflict,
  sanitizeIdentifier,
  resolveNestJsConflict,
  getReservedWords,
  getConflictingNames,
} from '../../src/validation/identifier-validator';

describe('Identifier Validator', () => {
  describe('isValidIdentifier()', () => {
    it('should accept valid identifiers', () => {
      expect(isValidIdentifier('MyClass')).toBe(true);
      expect(isValidIdentifier('_privateField')).toBe(true);
      expect(isValidIdentifier('$special')).toBe(true);
      expect(isValidIdentifier('camelCase123')).toBe(true);
      expect(isValidIdentifier('CONSTANT_VALUE')).toBe(true);
    });

    it('should reject reserved words', () => {
      expect(isValidIdentifier('class')).toBe(false);
      expect(isValidIdentifier('const')).toBe(false);
      expect(isValidIdentifier('function')).toBe(false);
      expect(isValidIdentifier('return')).toBe(false);
      expect(isValidIdentifier('import')).toBe(false);
    });

    it('should reject identifiers starting with numbers', () => {
      expect(isValidIdentifier('123Name')).toBe(false);
      expect(isValidIdentifier('1stValue')).toBe(false);
    });

    it('should reject identifiers with invalid characters', () => {
      expect(isValidIdentifier('my-class')).toBe(false);
      expect(isValidIdentifier('my.class')).toBe(false);
      expect(isValidIdentifier('my class')).toBe(false);
      expect(isValidIdentifier('my@class')).toBe(false);
    });

    it('should reject empty or null', () => {
      expect(isValidIdentifier('')).toBe(false);
      expect(isValidIdentifier(null as unknown as string)).toBe(false);
      expect(isValidIdentifier(undefined as unknown as string)).toBe(false);
    });
  });

  describe('hasNestJsConflict()', () => {
    it('should detect NestJS decorator conflicts', () => {
      expect(hasNestJsConflict('ApiResponse')).toBe(true);
      expect(hasNestJsConflict('ApiParam')).toBe(true);
      expect(hasNestJsConflict('ApiBody')).toBe(true);
      expect(hasNestJsConflict('Controller')).toBe(true);
      expect(hasNestJsConflict('Injectable')).toBe(true);
    });

    it('should not detect conflicts for safe names', () => {
      expect(hasNestJsConflict('User')).toBe(false);
      expect(hasNestJsConflict('Product')).toBe(false);
      expect(hasNestJsConflict('Order')).toBe(false);
    });
  });

  describe('sanitizeIdentifier()', () => {
    it('should replace invalid characters with underscores', () => {
      expect(sanitizeIdentifier('my-class')).toBe('my_class');
      expect(sanitizeIdentifier('my.class')).toBe('my_class');
      expect(sanitizeIdentifier('my class')).toBe('my_class');
    });

    it('should strip leading numbers and return valid identifier', () => {
      const result = sanitizeIdentifier('123Name');
      expect(result).toBe('Name');
      expect(/^[a-zA-Z_$]/.test(result)).toBe(true);
    });

    it('should handle reserved words by appending underscore', () => {
      expect(sanitizeIdentifier('class')).toBe('class_');
      expect(sanitizeIdentifier('const')).toBe('const_');
      expect(sanitizeIdentifier('function')).toBe('function_');
    });

    it('should strip leading numbers even with custom prefix', () => {
      const result = sanitizeIdentifier('123name', 'Dto');
      expect(result).toBe('name');
      expect(/^[a-zA-Z_$]/.test(result)).toBe(true);
    });

    it('should handle empty strings', () => {
      expect(sanitizeIdentifier('')).toBe('Generated');
      expect(sanitizeIdentifier('', 'Dto')).toBe('Dto');
    });

    it('should trim whitespace', () => {
      expect(sanitizeIdentifier('  MyClass  ')).toBe('MyClass');
    });
  });

  describe('resolveNestJsConflict()', () => {
    it('should append suffix to conflicting names', () => {
      expect(resolveNestJsConflict('ApiResponse')).toBe('ApiResponseDto');
      expect(resolveNestJsConflict('Controller')).toBe('ControllerDto');
    });

    it('should return safe names unchanged', () => {
      expect(resolveNestJsConflict('User')).toBe('User');
      expect(resolveNestJsConflict('Product')).toBe('Product');
    });

    it('should use custom suffix', () => {
      expect(resolveNestJsConflict('ApiResponse', 'Schema')).toBe('ApiResponseSchema');
      expect(resolveNestJsConflict('Controller', 'Model')).toBe('ControllerModel');
    });
  });

  describe('getReservedWords()', () => {
    it('should return array of reserved words', () => {
      const reserved = getReservedWords();
      expect(Array.isArray(reserved)).toBe(true);
      expect(reserved.length).toBeGreaterThan(0);
      expect(reserved).toContain('class');
      expect(reserved).toContain('function');
      expect(reserved).toContain('return');
    });
  });

  describe('getConflictingNames()', () => {
    it('should return array of NestJS conflicting names', () => {
      const conflicts = getConflictingNames();
      expect(Array.isArray(conflicts)).toBe(true);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts).toContain('ApiResponse');
      expect(conflicts).toContain('Controller');
      expect(conflicts).toContain('Injectable');
    });
  });
});
