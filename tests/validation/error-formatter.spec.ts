import { ValidationSeverity, ValidationIssue, createValidationResult, addIssue } from '../../src/validation/validation-result';
import {
  formatValidationIssue,
  formatErrors,
  formatWarnings,
  formatValidationSummary,
  formatValidationReport,
} from '../../src/validation/error-formatter';

describe('Error Formatter', () => {
  describe('formatValidationIssue()', () => {
    it('should format error issues with icon and color', () => {
      const issue: ValidationIssue = {
        severity: ValidationSeverity.Error,
        message: 'Schema is missing type field',
        location: 'components.schemas.User',
        suggestion: 'Add type: object to schema',
      };

      const formatted = formatValidationIssue(issue);

      expect(formatted).toContain('Schema is missing type field');
      expect(formatted).toContain('components.schemas.User');
      expect(formatted).toContain('Add type: object to schema');
    });

    it('should format warning issues', () => {
      const issue: ValidationIssue = {
        severity: ValidationSeverity.Warning,
        message: 'operationId missing camelCase format',
        location: 'paths./users.get',
        code: 'INVALID_OPERATION_ID',
      };

      const formatted = formatValidationIssue(issue);

      expect(formatted).toContain('operationId missing camelCase format');
      expect(formatted).toContain('INVALID_OPERATION_ID');
    });

    it('should handle issues without optional fields', () => {
      const issue: ValidationIssue = {
        severity: ValidationSeverity.Error,
        message: 'Generic error',
      };

      const formatted = formatValidationIssue(issue);

      expect(formatted).toContain('Generic error');
    });
  });

  describe('formatErrors()', () => {
    it('should format multiple errors', () => {
      const errors: ValidationIssue[] = [
        {
          severity: ValidationSeverity.Error,
          message: 'Error 1',
        },
        {
          severity: ValidationSeverity.Error,
          message: 'Error 2',
        },
      ];

      const formatted = formatErrors(errors);

      expect(formatted).toContain('✗ Errors (2)');
      expect(formatted).toContain('Error 1');
      expect(formatted).toContain('Error 2');
    });

    it('should return empty string for no errors', () => {
      const formatted = formatErrors([]);

      expect(formatted).toBe('');
    });
  });

  describe('formatWarnings()', () => {
    it('should format multiple warnings', () => {
      const warnings: ValidationIssue[] = [
        {
          severity: ValidationSeverity.Warning,
          message: 'Warning 1',
        },
        {
          severity: ValidationSeverity.Warning,
          message: 'Warning 2',
        },
      ];

      const formatted = formatWarnings(warnings);

      expect(formatted).toContain('⚠ Warnings (2)');
      expect(formatted).toContain('Warning 1');
      expect(formatted).toContain('Warning 2');
    });

    it('should return empty string for no warnings', () => {
      const formatted = formatWarnings([]);

      expect(formatted).toBe('');
    });
  });

  describe('formatValidationSummary()', () => {
    it('should format validation summary with counts', () => {
      const result = createValidationResult();
      result.summary.schemasValidated = 5;
      result.summary.operationsValidated = 10;
      result.summary.errorsFound = 2;
      result.summary.warningsFound = 3;
      result.summary.infoFound = 1;

      const formatted = formatValidationSummary(result);

      expect(formatted).toContain('Schemas validated:     5');
      expect(formatted).toContain('Operations validated:  10');
      expect(formatted).toContain('Errors:             2');
      expect(formatted).toContain('Warnings:           3');
      expect(formatted).toContain('Info:               1');
    });

    it('should not show zero counts', () => {
      const result = createValidationResult();
      result.summary.schemasValidated = 5;
      result.summary.operationsValidated = 10;

      const formatted = formatValidationSummary(result);

      expect(formatted).toContain('Schemas validated:     5');
      expect(formatted).not.toContain('Errors:');
      expect(formatted).not.toContain('Warnings:');
    });
  });

  describe('formatValidationReport()', () => {
    it('should format complete validation report', () => {
      const result = createValidationResult();
      addIssue(result, {
        severity: ValidationSeverity.Error,
        message: 'Test error',
      });
      addIssue(result, {
        severity: ValidationSeverity.Warning,
        message: 'Test warning',
      });

      const formatted = formatValidationReport(result);

      expect(formatted).toContain('Validation Summary');
      expect(formatted).toContain('Test error');
      expect(formatted).toContain('Test warning');
      expect(formatted).toContain('--strict');
      expect(formatted).toContain('--lenient');
      expect(formatted).toContain('--validate-only');
    });

    it('should include tips for issues found', () => {
      const result = createValidationResult();
      addIssue(result, {
        severity: ValidationSeverity.Error,
        message: 'Test error',
      });

      const formatted = formatValidationReport(result);

      expect(formatted).toContain('Tips:');
    });

    it('should not include tips if no issues', () => {
      const result = createValidationResult();

      const formatted = formatValidationReport(result);

      expect(formatted).not.toContain('Tips:');
    });
  });
});
