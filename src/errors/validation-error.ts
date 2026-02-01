/**
 * Validation-specific error class with context and suggestions
 */

import { CliError } from './cli-error';

/**
 * Error for schema and specification validation failures
 */
export class ValidationError extends CliError {
  readonly exitCode = 1;
  readonly userMessage: string;

  constructor(
    message: string,
    readonly location?: string,
    readonly suggestion?: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    Object.setPrototypeOf(this, ValidationError.prototype);

    // Build user-friendly message with location and suggestion
    let userMsg = message;
    if (location) {
      userMsg += `\n\nLocation: ${location}`;
    }
    if (suggestion) {
      userMsg += `\n\nSuggestion: ${suggestion}`;
    }
    userMsg += '\n\nRun with --validate-only to see all validation issues.';

    this.userMessage = userMsg;
  }
}

/**
 * Error for invalid TypeScript/JavaScript identifiers
 */
export class InvalidIdentifierError extends ValidationError {
  constructor(
    identifier: string,
    context: string,
    suggestion?: string,
  ) {
    const message = `Invalid identifier "${identifier}" in ${context}`;
    super(
      message,
      context,
      suggestion || `Use a valid JavaScript identifier (letters, numbers, $, _ only, must start with letter, $, or _)`,
    );
    Object.setPrototypeOf(this, InvalidIdentifierError.prototype);
  }
}

/**
 * Error for conflicting schema/identifier names
 */
export class NameConflictError extends ValidationError {
  constructor(
    name: string,
    conflictType: string,
    conflictWith: string[],
    suggestion?: string,
  ) {
    const message = `Schema name "${name}" conflicts with ${conflictType}`;
    const details = `Conflicts with: ${conflictWith.join(', ')}`;
    super(
      message,
      `components.schemas.${name}`,
      suggestion || `Rename the schema to avoid conflicts`,
    );
    this.details = { conflictType, conflictWith };
    Object.setPrototypeOf(this, NameConflictError.prototype);
  }
}
