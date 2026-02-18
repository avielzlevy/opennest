// tests/utils/string-sanitizer.test.ts

import {
  sanitizeString,
  isValidIdentifier,
  ensureValidIdentifier,
} from '../../src/utils/string-sanitizer';

describe('String Sanitizer', () => {
  describe('sanitizeString()', () => {
    it('should remove special characters', () => {
      expect(sanitizeString('get-user')).toBe('getuser');
      expect(sanitizeString('get/user')).toBe('getuser');
      expect(sanitizeString('get@user#id')).toBe('getuserid');
    });

    it('should preserve underscores', () => {
      expect(sanitizeString('get_user')).toBe('get_user');
      expect(sanitizeString('User_GetById')).toBe('User_GetById');
    });

    it('should preserve dollar signs', () => {
      expect(sanitizeString('$get_user')).toBe('$get_user');
    });

    it('should preserve alphanumeric characters', () => {
      expect(sanitizeString('getUser123')).toBe('getUser123');
      expect(sanitizeString('123getUser')).toBe('123getUser');
    });

    it('should handle empty and null input', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(undefined as any)).toBe('');
    });

    it('should remove all non-identifier characters', () => {
      expect(sanitizeString('get!@#%^&*()user')).toBe('getuser');
      expect(sanitizeString('get user')).toBe('getuser');
    });
  });

  describe('isValidIdentifier()', () => {
    it('should validate correct identifiers', () => {
      expect(isValidIdentifier('getUser')).toBe(true);
      expect(isValidIdentifier('_private')).toBe(true);
      expect(isValidIdentifier('$variable')).toBe(true);
      expect(isValidIdentifier('_')).toBe(true);
      expect(isValidIdentifier('$')).toBe(true);
      expect(isValidIdentifier('a')).toBe(true);
    });

    it('should reject identifiers starting with numbers', () => {
      expect(isValidIdentifier('123invalid')).toBe(false);
      expect(isValidIdentifier('1getUser')).toBe(false);
    });

    it('should reject empty or whitespace', () => {
      expect(isValidIdentifier('')).toBe(false);
      expect(isValidIdentifier(' ')).toBe(false);
    });

    it('should reject null and undefined', () => {
      expect(isValidIdentifier(null as any)).toBe(false);
      expect(isValidIdentifier(undefined as any)).toBe(false);
    });

    it('should reject identifiers with invalid characters', () => {
      expect(isValidIdentifier('get-user')).toBe(false);
      expect(isValidIdentifier('get@user')).toBe(false);
      expect(isValidIdentifier('get user')).toBe(false);
    });

    it('should allow underscores and dollar signs in middle', () => {
      expect(isValidIdentifier('get_user')).toBe(true);
      expect(isValidIdentifier('get$user')).toBe(true);
      expect(isValidIdentifier('_user_id')).toBe(true);
    });
  });

  describe('ensureValidIdentifier()', () => {
    it('should return valid identifiers unchanged', () => {
      expect(ensureValidIdentifier('getUser')).toBe('getUser');
      expect(ensureValidIdentifier('_private')).toBe('_private');
    });

    it('should prepend underscore to invalid starting character', () => {
      expect(ensureValidIdentifier('123invalid')).toBe('_123invalid');
      expect(ensureValidIdentifier('1getUser')).toBe('_1getUser');
    });

    it('should sanitize and validate', () => {
      expect(ensureValidIdentifier('get-user')).toBe('getuser');
      expect(ensureValidIdentifier('123-get-user')).toBe('_123getuser');
    });

    it('should handle empty input', () => {
      expect(ensureValidIdentifier('')).toBe('_');
      expect(ensureValidIdentifier(null as any)).toBe('_');
    });

    it('should handle completely invalid input', () => {
      expect(ensureValidIdentifier('@#%^')).toBe('_');
      expect(ensureValidIdentifier('   ')).toBe('_');
    });
  });
});
