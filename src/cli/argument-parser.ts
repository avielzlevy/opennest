import { Command } from 'commander';
import { InvalidArgumentsError } from '../errors/cli-error';

/**
 * Validation recovery strategy
 */
export type ValidationRecoveryStrategy = 'strict' | 'lenient' | 'ignore-warnings';

/**
 * Parsed CLI arguments with all available options
 */
export interface CliArgs {
  spec: string;
  output: string;
  structure: 'type-based' | 'domain-based';
  onlyDto: boolean;
  onlyController: boolean;
  onlyDecorator: boolean;
  force: boolean;
  verbose: boolean;
  strict?: boolean;
  lenient?: boolean;
  ignoreWarnings?: boolean;
  validateOnly?: boolean;
  validateVerbose?: boolean;
}

/**
 * CLI Argument Parser using Commander.js
 * Handles parsing command-line arguments and validating options
 */
export class ArgumentParser {
  private program: Command;

  constructor() {
    this.program = new Command();
  }

  /**
   * Parse CLI arguments and return typed CliArgs object
   * @param argv - Arguments to parse (typically process.argv.slice(2))
   * @returns Parsed arguments as CliArgs
   * @throws InvalidArgumentsError if validation fails
   */
  parseArgs(argv: string[]): CliArgs {
    this.setupCommand();

    try {
      this.program.parse(argv, { from: 'user' });
    } catch (error) {
      if (error instanceof Error) {
        throw new InvalidArgumentsError(error.message);
      }
      throw error;
    }

    const options = this.program.opts();
    const args = this.program.args;

    // Validate that spec is provided
    if (!args[0]) {
      throw new InvalidArgumentsError('Spec argument is required. Usage: opennest <spec-file-or-url>');
    }

    const spec = args[0];

    // Validate that only one --only-X flag is used
    const onlyFlags = [options.onlyDto, options.onlyController, options.onlyDecorator].filter(Boolean);
    if (onlyFlags.length > 1) {
      throw new InvalidArgumentsError(
        'Cannot use multiple --only-* flags simultaneously. Choose one: --only-dto, --only-controller, or --only-decorator'
      );
    }

    // Validate that only one validation strategy flag is used
    const validationFlags = [options.strict, options.lenient, options.ignoreWarnings].filter(Boolean);
    if (validationFlags.length > 1) {
      throw new InvalidArgumentsError(
        'Cannot use multiple validation flags simultaneously. Choose one: --strict, --lenient, or --ignore-warnings'
      );
    }

    // Validate structure flag value
    const structure = options.structure || 'type-based';
    if (structure !== 'type-based' && structure !== 'domain-based') {
      throw new InvalidArgumentsError(
        `Invalid --structure value: "${structure}". Must be one of: type-based, domain-based`
      );
    }

    return {
      spec,
      output: options.output || './generated',
      structure: structure as 'type-based' | 'domain-based',
      onlyDto: !!options.onlyDto,
      onlyController: !!options.onlyController,
      onlyDecorator: !!options.onlyDecorator,
      force: !!options.force,
      verbose: !!options.verbose,
      strict: !!options.strict,
      lenient: !!options.lenient,
      ignoreWarnings: !!options.ignoreWarnings,
      validateOnly: !!options.validateOnly,
      validateVerbose: !!options.validateVerbose,
    };
  }

  /**
   * Setup the Commander command with all options and help text
   */
  private setupCommand(): void {
    this.program
      .name('opennest')
      .description('Generate NestJS code from OpenAPI/Swagger specifications')
      .version('1.0.0', '-v, --version', 'Display version information')
      .argument('<spec>', 'Path to OpenAPI spec file (YAML/JSON) or URL')
      .option('-o, --output <directory>', 'Output directory for generated files (default: ./generated)', './generated')
      .option('--structure <type>', 'Output structure pattern: type-based | domain-based (default: type-based)', 'type-based')
      .option('--only-dto', 'Generate only DTO files')
      .option('--only-controller', 'Generate only controller files')
      .option('--only-decorator', 'Generate only decorator files')
      .option('--force, -f', 'Overwrite existing files without prompting')
      .option('-v, --verbose', 'Show detailed output and error stack traces')
      .option('--strict', 'Fail on any validation error or warning (default)')
      .option('--lenient', 'Skip invalid schemas/operations and continue generation')
      .option('--ignore-warnings', 'Only fail on errors, skip warnings')
      .option('--validate-only', 'Validate spec without generating code')
      .option('--validate-verbose', 'Show all validation checks (used with --validate-only)')
      .addHelpText(
        'after',
        `
Examples:
  # Generate from local YAML file
  $ opennest ./specs/api.yaml

  # Generate from remote URL with custom output directory
  $ opennest https://api.example.com/openapi.json -o ./src/generated

  # Generate only DTOs with verbose output
  $ opennest ./specs/api.yaml --only-dto --verbose

  # Overwrite existing files
  $ opennest ./specs/api.yaml --force

  # Validate specification only
  $ opennest ./specs/api.yaml --validate-only

  # Generate with lenient mode (skip invalid schemas)
  $ opennest ./specs/api.yaml --lenient

  # Use domain-based output structure
  $ opennest ./specs/api.yaml --structure domain-based

  # Use type-based output structure (default)
  $ opennest ./specs/api.yaml --structure type-based

Output Structure Patterns:
  type-based (default)  - Organize by file type:
                          generated/
                          ├── dtos/
                          │   ├── User.dto.ts
                          │   └── Product.dto.ts
                          ├── controllers/
                          │   ├── user.controller.ts
                          │   └── product.controller.ts
                          └── decorators/
                              └── endpoint.decorator.ts

  domain-based          - Organize by domain/resource:
                          generated/
                          ├── user/
                          │   ├── dtos/
                          │   │   └── User.dto.ts
                          │   └── controllers/
                          │       └── user.controller.ts
                          ├── product/
                          │   ├── dtos/
                          │   │   └── Product.dto.ts
                          │   └── controllers/
                          │       └── product.controller.ts
                          └── decorators/
                              └── endpoint.decorator.ts

Validation Modes:
  --strict (default)    - Fail on any validation error or warning
  --lenient             - Skip invalid schemas/operations, continue generation
  --ignore-warnings     - Only fail on errors, skip non-critical issues

Generators:
  ✓ DTO Generator     - Generates data transfer object classes from schemas
  ✓ Controller Generator - Generates NestJS controller classes with decorators
  ✓ Decorator Generator  - Generates method decorators and guards

Documentation:
  📖 GitHub: https://github.com/example/opennest
  📚 Docs: https://docs.example.com
  💬 Issues: https://github.com/example/opennest/issues
`
      );
  }
}

/**
 * Parse CLI arguments using the ArgumentParser
 * @param argv - Arguments array (typically process.argv.slice(2))
 * @returns Parsed and validated CLI arguments
 */
export function parseArgs(argv: string[]): CliArgs {
  const parser = new ArgumentParser();
  return parser.parseArgs(argv);
}
