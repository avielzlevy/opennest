/**
 * CLI Application
 * Orchestrates the main application flow: loading specs, checking conflicts, prompting users, and generating code
 */

import { confirm } from '@inquirer/prompts';
import { loadSpec } from './spec-loader';
import {
  checkFileConflicts,
  generateConflictPrompt,
  getFilesToGenerate,
} from './file-conflict-handler';
import {
  displaySuccessMessage,
  displayStepMessage,
  displayWarningMessage,
  displayInfoMessage,
} from './error-handler';

/**
 * CLI Arguments passed to the application
 */
export interface CliApplicationArgs {
  spec: string;
  output: string;
  onlyDto: boolean;
  onlyController: boolean;
  onlyDecorator: boolean;
  force: boolean;
  verbose: boolean;
}

/**
 * CLI Application
 * Handles the main flow of spec loading, conflict detection, and generation
 */
export class CliApplication {
  /**
   * Run the CLI application with parsed arguments
   * @param args - Parsed CLI arguments
   */
  async run(args: CliApplicationArgs): Promise<void> {
    // Display header
    this.displayHeader();

    // Load specification
    displayStepMessage(`Loading specification from: ${args.spec}`);
    const spec = await loadSpec(args.spec);
    displaySuccessMessage('Specification loaded successfully');

    if (args.verbose) {
      displayInfoMessage(
        `Specification contains paths and schemas for code generation`
      );
    }

    // Determine files to generate
    const filesToGenerate = getFilesToGenerate(spec);
    displayStepMessage(
      `Ready to generate ${filesToGenerate.length} file(s) to: ${args.output}`
    );

    if (args.verbose) {
      displayInfoMessage(`Files to generate:`);
      filesToGenerate.forEach((file) => {
        console.log(`  • ${file}`);
      });
    }

    // Check for file conflicts
    const conflicts = await checkFileConflicts(args.output, filesToGenerate);

    // Handle conflicts
    if (conflicts.length > 0) {
      await this.handleFileConflicts(conflicts, args);
    }

    // Display generation summary
    this.displayGenerationSummary(args, filesToGenerate, conflicts);
  }

  /**
   * Display application header
   */
  private displayHeader(): void {
    console.log('');
    console.log('  OpenNest v1.0.0');
    console.log('  Generate NestJS code from OpenAPI specifications');
    console.log('');
  }

  /**
   * Handle file conflicts by prompting user (unless --force is used)
   * @param conflicts - Array of conflicting files
   * @param args - CLI arguments
   */
  private async handleFileConflicts(
    conflicts: Array<{ path: string; size: number; mtime: Date }>,
    args: CliApplicationArgs
  ): Promise<void> {
    if (args.force) {
      if (args.verbose) {
        displayWarningMessage(
          `Force mode enabled. Will overwrite ${conflicts.length} existing file(s).`
        );
      }
      return;
    }

    // Prompt user for confirmation
    displayWarningMessage(
      `${conflicts.length} file(s) would be overwritten`
    );
    console.log('');

    const promptMessage = generateConflictPrompt(conflicts, args.output);
    console.log(promptMessage);
    console.log('');

    const shouldContinue = await confirm({
      message: 'Do you want to continue?',
      default: false,
    });

    if (!shouldContinue) {
      throw new Error('Generation cancelled by user');
    }

    if (args.verbose) {
      displaySuccessMessage('User confirmed overwriting files');
    }
  }

  /**
   * Display generation summary
   * @param args - CLI arguments
   * @param filesToGenerate - List of files to generate
   * @param conflicts - List of conflicting files
   */
  private displayGenerationSummary(
    args: CliApplicationArgs,
    filesToGenerate: string[],
    conflicts: Array<{ path: string; size: number; mtime: Date }>
  ): void {
    console.log('');
    displaySuccessMessage('Ready to generate code');

    if (args.verbose) {
      console.log('');
      displayInfoMessage('Generation Summary:');
      console.log(`  Files to generate: ${filesToGenerate.length}`);
      console.log(`  Output directory: ${args.output}`);

      if (args.onlyDto) {
        console.log(`  Mode: DTO only`);
      } else if (args.onlyController) {
        console.log(`  Mode: Controller only`);
      } else if (args.onlyDecorator) {
        console.log(`  Mode: Decorator only`);
      } else {
        console.log(`  Mode: Full generation`);
      }

      if (conflicts.length > 0) {
        console.log(
          `  Files to overwrite: ${conflicts.length}`
        );
      }

      console.log(`  Force mode: ${args.force ? 'enabled' : 'disabled'}`);
      console.log('');
    }

    displayStepMessage('Next: Code generation (Phase 2)');
  }
}
