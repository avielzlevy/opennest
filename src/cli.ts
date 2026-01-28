import { parseArgs } from './cli/argument-parser';
import { displayError } from './cli/error-handler';
import { CliApplication } from './cli/cli-application';

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
