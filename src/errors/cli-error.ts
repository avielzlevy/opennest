/**
 * CLI-specific error types with exit codes and user-friendly messages
 */

/**
 * Abstract base class for CLI errors
 */
export abstract class CliError extends Error {
  abstract readonly exitCode: number;
  abstract readonly userMessage: string;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, CliError.prototype);
  }
}

/**
 * Error when spec file/URL is not found
 */
export class SpecNotFoundError extends CliError {
  readonly exitCode = 1;
  readonly userMessage: string;

  constructor(specPath: string) {
    super(`Spec file not found: ${specPath}`);
    this.userMessage = `Could not find spec at: ${specPath}\n\nTip: Provide a valid file path or URL to your OpenAPI spec.`;
    Object.setPrototypeOf(this, SpecNotFoundError.prototype);
  }
}

/**
 * Error when spec file cannot be parsed
 */
export class MalformedSpecError extends CliError {
  readonly exitCode = 1;
  readonly userMessage: string;

  constructor(specPath: string, reason: string) {
    super(`Invalid spec format: ${reason}`);
    this.userMessage = `The spec at ${specPath} is malformed.\n\nReason: ${reason}\n\nTip: Ensure your spec is valid YAML or JSON.`;
    Object.setPrototypeOf(this, MalformedSpecError.prototype);
  }
}

/**
 * Error during network operations (e.g., fetching remote specs)
 */
export class NetworkError extends CliError {
  readonly exitCode = 2;
  readonly userMessage: string;

  constructor(url: string, reason: string) {
    super(`Network error while fetching ${url}: ${reason}`);
    this.userMessage = `Could not fetch spec from ${url}.\n\nReason: ${reason}\n\nTip: Check your internet connection and ensure the URL is accessible.`;
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Error when output files already exist and --force is not provided
 */
export class FileConflictError extends CliError {
  readonly exitCode = 1;
  readonly userMessage: string;

  constructor(files: string[]) {
    super(`Output files already exist: ${files.join(', ')}`);
    const fileList = files.map((f) => `  - ${f}`).join('\n');
    this.userMessage = `Output files already exist:\n${fileList}\n\nTip: Use --force to overwrite existing files.`;
    Object.setPrototypeOf(this, FileConflictError.prototype);
  }
}

/**
 * Error with invalid command-line arguments
 */
export class InvalidArgumentsError extends CliError {
  readonly exitCode = 1;
  readonly userMessage: string;

  constructor(message: string) {
    super(`Invalid arguments: ${message}`);
    this.userMessage = `${message}\n\nTip: Run with --help to see usage information.`;
    Object.setPrototypeOf(this, InvalidArgumentsError.prototype);
  }
}
