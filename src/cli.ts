import { parseArgs } from './cli/argument-parser';
import { displayError, displaySuccessMessage, displayStepMessage } from './cli/error-handler';
import { CliError } from './errors/cli-error';

/**
 * Stub CliApplication for Phase 1 bootstrap
 * Will be expanded in subsequent phases to handle actual generation
 */
class CliApplication {
  /**
   * Run the CLI application with parsed arguments
   * @param args - Parsed CLI arguments
   */
  async run(args: any): Promise<void> {
    displayStepMessage(`Processing spec: ${args.spec}`);
    displayStepMessage(`Output directory: ${args.output}`);

    if (args.verbose) {
      displayStepMessage('Verbose mode enabled');
    }

    if (args.force) {
      displayStepMessage('Force overwrite enabled');
    }

    // Stub implementation - will be replaced in Phase 2
    displaySuccessMessage('CLI application initialized successfully!');
    displayStepMessage('Next: Load and parse spec file (Phase 2)');
  }
}

/**
 * CLI Bootstrap and Entry Point
 * This is the main entry point for ts-node src/cli.ts
 */
async function main() {
  try {
    // Parse command-line arguments
    const args = parseArgs(process.argv.slice(2));

    // Create and run CLI application
    const app = new CliApplication();
    await app.run(args);
  } catch (error) {
    // Handle errors and exit with appropriate code
    const exitCode = displayError(error, process.env.OPENNEST_VERBOSE === 'true');
    process.exit(exitCode);
  }
}

// Run the CLI application if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    const exitCode = displayError(error, process.env.OPENNEST_VERBOSE === 'true');
    process.exit(exitCode);
  });
}

export { CliApplication };
