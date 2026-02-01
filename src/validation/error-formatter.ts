/**
 * Format validation errors and warnings for user-friendly display
 */

import chalk from 'chalk';
import { ValidationResult, ValidationIssue, ValidationSeverity } from './validation-result';

/**
 * Format a single validation issue for display
 */
export function formatValidationIssue(issue: ValidationIssue): string {
  const icon = issue.severity === ValidationSeverity.Error ? '✗' : '⚠';
  const color = issue.severity === ValidationSeverity.Error ? chalk.red : chalk.yellow;

  let output = color(`${icon} ${issue.message}`);

  if (issue.location) {
    output += `\n  ${chalk.gray(`Location: ${issue.location}`)}`;
  }

  if (issue.suggestion) {
    output += `\n  ${chalk.cyan(`Suggestion: ${issue.suggestion}`)}`;
  }

  if (issue.code) {
    output += `\n  ${chalk.gray(`Code: ${issue.code}`)}`;
  }

  return output;
}

/**
 * Format all errors from validation result
 */
export function formatErrors(issues: ValidationIssue[]): string {
  if (issues.length === 0) return '';

  const lines = [chalk.red.bold(`\n✗ Errors (${issues.length}):\n`)];
  for (const issue of issues) {
    lines.push(`  ${formatValidationIssue(issue)}`);
  }
  return lines.join('\n\n');
}

/**
 * Format all warnings from validation result
 */
export function formatWarnings(issues: ValidationIssue[]): string {
  if (issues.length === 0) return '';

  const lines = [chalk.yellow.bold(`\n⚠ Warnings (${issues.length}):\n`)];
  for (const issue of issues) {
    lines.push(`  ${formatValidationIssue(issue)}`);
  }
  return lines.join('\n\n');
}

/**
 * Format validation summary
 */
export function formatValidationSummary(result: ValidationResult): string {
  const lines = [chalk.bold('\n✓ Validation Summary\n')];

  lines.push(`  Schemas validated:     ${result.summary.schemasValidated}`);
  lines.push(`  Operations validated:  ${result.summary.operationsValidated}`);

  if (result.summary.errorsFound > 0) {
    lines.push(chalk.red(`  ✗ Errors:             ${result.summary.errorsFound}`));
  }

  if (result.summary.warningsFound > 0) {
    lines.push(chalk.yellow(`  ⚠ Warnings:           ${result.summary.warningsFound}`));
  }

  if (result.summary.infoFound > 0) {
    lines.push(chalk.blue(`  ℹ Info:               ${result.summary.infoFound}`));
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Format complete validation report
 */
export function formatValidationReport(result: ValidationResult): string {
  const lines = ['\n'];

  // Summary
  lines.push(formatValidationSummary(result));

  // Errors
  if (result.errors.length > 0) {
    lines.push(formatErrors(result.errors));
  }

  // Warnings
  if (result.warnings.length > 0) {
    lines.push(formatWarnings(result.warnings));
  }

  // Help text
  if (result.errors.length > 0 || result.warnings.length > 0) {
    lines.push('\n' + chalk.gray('Tips:'));
    if (result.warnings.length > 0) {
      lines.push(chalk.gray('  • Run with --strict to treat warnings as errors'));
    }
    if (result.errors.length > 0) {
      lines.push(chalk.gray('  • Run with --lenient to skip invalid schemas and continue'));
    }
    lines.push(chalk.gray('  • Run with --validate-only to see all issues without generating code'));
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Format validation report for JSON output (for tests/piping)
 */
export function formatValidationReportJson(result: ValidationResult): string {
  return JSON.stringify(result, null, 2);
}
