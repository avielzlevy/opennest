import chalk from 'chalk';
import { CliError } from '../errors/cli-error';

/**
 * Result of handling a CLI error
 */
export interface ErrorHandleResult {
  exitCode: number;
  message: string;
}

/**
 * CLI Error Handler
 * Formats and displays errors, warnings, info, and success messages
 */
export class ErrorHandler {
  /**
   * Handle a CLI error and return formatted output
   * @param error - The error to handle
   * @param verbose - Whether to show stack traces
   * @returns Object with exit code and formatted message
   */
  static handleCliError(error: unknown, verbose: boolean = false): ErrorHandleResult {
    if (error instanceof CliError) {
      // Custom CLI error with user-friendly message
      let message = chalk.red('✗ Error:') + ' ' + error.userMessage;

      if (verbose && error.message && error.message !== error.userMessage) {
        message += '\n\n' + chalk.gray('Debug info:') + '\n' + chalk.gray(error.message);
      }

      if (verbose && error.stack) {
        message += '\n\n' + chalk.gray('Stack trace:') + '\n' + chalk.gray(error.stack);
      }

      return {
        exitCode: error.exitCode,
        message,
      };
    }

    if (error instanceof Error) {
      // Standard JavaScript error
      let message = chalk.red('✗ Error:') + ' ' + (error.message || 'An unknown error occurred');

      if (verbose && error.stack) {
        message += '\n\n' + chalk.gray('Stack trace:') + '\n' + chalk.gray(error.stack);
      }

      return {
        exitCode: 1,
        message,
      };
    }

    // Non-Error object
    return {
      exitCode: 1,
      message: chalk.red('✗ Error:') + ' ' + String(error),
    };
  }

  /**
   * Format a success message
   * @param message - The success message
   * @param verbose - Whether to include extra formatting
   * @returns Formatted success message
   */
  static displaySuccess(message: string, verbose: boolean = false): string {
    const formatted = chalk.green('✓ Success:') + ' ' + message;
    return verbose ? formatted + '\n' : formatted;
  }

  /**
   * Format an info message
   * @param message - The info message
   * @returns Formatted info message
   */
  static displayInfo(message: string): string {
    return chalk.blue('ℹ Info:') + ' ' + message;
  }

  /**
   * Format a warning message
   * @param message - The warning message
   * @returns Formatted warning message
   */
  static displayWarning(message: string): string {
    return chalk.yellow('⚠ Warning:') + ' ' + message;
  }

  /**
   * Format a step/progress message
   * @param message - The step message
   * @returns Formatted step message
   */
  static displayStep(message: string): string {
    return chalk.cyan('→') + ' ' + message;
  }

  /**
   * Format code/technical message
   * @param code - The code to display
   * @returns Formatted code message
   */
  static formatCode(code: string): string {
    return chalk.gray(code);
  }
}

/**
 * Display a CLI error message and return exit code
 * Shorthand function for handleCliError
 * @param error - The error to display
 * @param verbose - Whether to show stack traces
 * @returns Exit code for process.exit()
 */
export function displayError(error: unknown, verbose: boolean = false): number {
  const result = ErrorHandler.handleCliError(error, verbose);
  console.error(result.message);
  return result.exitCode;
}

/**
 * Display a success message
 * @param message - The success message to display
 */
export function displaySuccessMessage(message: string): void {
  console.log(ErrorHandler.displaySuccess(message));
}

/**
 * Display an info message
 * @param message - The info message to display
 */
export function displayInfoMessage(message: string): void {
  console.log(ErrorHandler.displayInfo(message));
}

/**
 * Display a warning message
 * @param message - The warning message to display
 */
export function displayWarningMessage(message: string): void {
  console.warn(ErrorHandler.displayWarning(message));
}

/**
 * Display a step message
 * @param message - The step message to display
 */
export function displayStepMessage(message: string): void {
  console.log(ErrorHandler.displayStep(message));
}
