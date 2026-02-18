/**
 * Validation result types and aggregation
 */

/**
 * Severity level for validation issues
 */
export enum ValidationSeverity {
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
}

/**
 * A single validation issue
 */
export interface ValidationIssue {
  severity: ValidationSeverity;
  message: string;
  location?: string;
  suggestion?: string;
  code?: string;
}

/**
 * Complete validation result with aggregated issues
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
  summary: {
    schemasValidated: number;
    operationsValidated: number;
    errorsFound: number;
    warningsFound: number;
    infoFound: number;
  };
}

/**
 * Create an empty validation result
 */
export function createValidationResult(): ValidationResult {
  return {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
    summary: {
      schemasValidated: 0,
      operationsValidated: 0,
      errorsFound: 0,
      warningsFound: 0,
      infoFound: 0,
    },
  };
}

/**
 * Add an issue to validation result
 */
export function addIssue(
  result: ValidationResult,
  issue: ValidationIssue,
): void {
  switch (issue.severity) {
    case ValidationSeverity.Error:
      result.errors.push(issue);
      result.summary.errorsFound++;
      result.valid = false;
      break;
    case ValidationSeverity.Warning:
      result.warnings.push(issue);
      result.summary.warningsFound++;
      break;
    case ValidationSeverity.Info:
      result.info.push(issue);
      result.summary.infoFound++;
      break;
  }
}
