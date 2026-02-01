/**
 * CLI Application
 * Orchestrates the main application flow: loading specs, checking conflicts, prompting users, and generating code
 */

import { confirm } from "@inquirer/prompts";
import { Project } from "ts-morph";
import { OpenAPIV3 } from "openapi-types";
import { loadSpec } from "./spec-loader";
import {
  checkFileConflicts,
  generateConflictPrompt,
  getFilesToGenerate,
} from "./file-conflict-handler";
import {
  displaySuccessMessage,
  displayStepMessage,
  displayWarningMessage,
  displayInfoMessage,
} from "./error-handler";
import { TypeMapper } from "../utils/type-mapper";
import { DtoGenerator } from "../generators/dto.generator";
import { ControllerGenerator } from "../generators/controller.generator";
import { CommonGenerator } from "../generators/common.generator";
import { DecoratorGenerator } from "../generators/decorator.generator";
import { SpecValidator } from "../validation/spec-validator";
import { formatValidationReport } from "../validation/error-formatter";
import { ValidationError } from "../errors/validation-error";
import { OutputStructureConfig } from "../utils/output-structure-manager";

/**
 * CLI Arguments passed to the application
 */
export interface CliApplicationArgs {
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
    displaySuccessMessage("Specification loaded successfully");

    if (args.verbose) {
      displayInfoMessage(
        `Specification contains paths and schemas for code generation`,
      );
    }

    // Validate specification
    displayStepMessage("Validating specification...");
    const validator = new SpecValidator({ strict: args.strict ?? true });
    const document = spec as unknown as OpenAPIV3.Document;
    const validationResult = validator.validate(document);

    // Display validation report
    console.log(formatValidationReport(validationResult));

    // Handle validation errors
    if (!validationResult.valid) {
      if (args.lenient) {
        displayWarningMessage(
          `Validation errors found. Continuing with lenient mode (invalid schemas will be skipped).`,
        );
      } else if (args.ignoreWarnings) {
        displayWarningMessage(
          `Validation warnings found. Ignoring warnings and continuing.`,
        );
      } else {
        throw new ValidationError(
          `Specification validation failed with ${validationResult.errors.length} error(s)`,
          'See validation report above',
          `Use --lenient to skip invalid schemas or --ignore-warnings to ignore non-critical issues`,
        );
      }
    }

    // If validate-only flag, skip code generation
    if (args.validateOnly) {
      displaySuccessMessage("Validation complete. Skipping code generation (--validate-only)");
      return;
    }

    // Determine files to generate
    const filesToGenerate = getFilesToGenerate(spec);
    displayStepMessage(
      `Ready to generate ${filesToGenerate.length} file(s) to: ${args.output}`,
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

    // Generate code
    await this.generateCode(spec, args);

    // Display generation summary
    this.displayGenerationSummary(args, filesToGenerate, conflicts);
  }

  /**
   * Display application header
   */
  private displayHeader(): void {
    console.log("");
    console.log("  OpenNest v1.0.0");
    console.log("  Generate NestJS code from OpenAPI specifications");
    console.log("");
  }

  /**
   * Handle file conflicts by prompting user (unless --force is used)
   * @param conflicts - Array of conflicting files
   * @param args - CLI arguments
   */
  private async handleFileConflicts(
    conflicts: Array<{ path: string; size: number; mtime: Date }>,
    args: CliApplicationArgs,
  ): Promise<void> {
    if (args.force) {
      if (args.verbose) {
        displayWarningMessage(
          `Force mode enabled. Will overwrite ${conflicts.length} existing file(s).`,
        );
      }
      return;
    }

    // Prompt user for confirmation
    displayWarningMessage(`${conflicts.length} file(s) would be overwritten`);
    console.log("");

    const promptMessage = generateConflictPrompt(conflicts, args.output);
    console.log(promptMessage);
    console.log("");

    const shouldContinue = await confirm({
      message: "Do you want to continue?",
      default: false,
    });

    if (!shouldContinue) {
      throw new Error("Generation cancelled by user");
    }

    if (args.verbose) {
      displaySuccessMessage("User confirmed overwriting files");
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
    conflicts: Array<{ path: string; size: number; mtime: Date }>,
  ): void {
    console.log("");
    displaySuccessMessage("Ready to generate code");

    if (args.verbose) {
      console.log("");
      displayInfoMessage("Generation Summary:");
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
        console.log(`  Files to overwrite: ${conflicts.length}`);
      }

      console.log(`  Force mode: ${args.force ? "enabled" : "disabled"}`);
      console.log("");
    }

    displayStepMessage("Next: Code generation (Phase 2)");
  }

  /**
   * Generate code from the OpenAPI specification
   * @param spec - The loaded OpenAPI specification
   * @param args - CLI arguments
   */
  private async generateCode(
    spec: Record<string, unknown>,
    args: CliApplicationArgs,
  ): Promise<void> {
    try {
      displayStepMessage("Generating code...");

      // Create structure configuration
      const structureConfig: OutputStructureConfig = {
        structure: args.structure as 'type-based' | 'domain-based',
      };

      if (args.verbose) {
        displayInfoMessage(`Using ${args.structure} output structure`);
      }

      // Initialize AST Project
      const project = new Project({
        compilerOptions: {
          outDir: args.output,
        },
        skipAddingFilesFromTsConfig: true,
      });

      // Determine recovery strategy for generators
      const recoveryStrategy = args.lenient ? 'skip' : (args.ignoreWarnings ? 'warn' : 'warn');

      // Instantiate generators
      const typeMapper = new TypeMapper();
      const commonGen = new CommonGenerator();
      const dtoGen = new DtoGenerator(typeMapper, recoveryStrategy as any);
      const decoratorGen = new DecoratorGenerator();
      const controllerGen = new ControllerGenerator();

      // Execute generation pipeline
      const document = spec as unknown as OpenAPIV3.Document;

      if (args.verbose) {
        displayInfoMessage("Generating common artifacts...");
      }
      commonGen.generate(document, project, args.output);

      if (args.verbose) {
        displayInfoMessage("Generating DTOs...");
      }
      dtoGen.generate(document, project, args.output);

      if (args.verbose) {
        displayInfoMessage("Generating endpoint decorators...");
      }
      decoratorGen.generate(document, project, args.output);

      if (args.verbose) {
        displayInfoMessage("Generating controllers...");
      }
      controllerGen.generate(document, project, args.output);

      // Format and save files
      if (args.verbose) {
        displayInfoMessage("Formatting source files...");
      }
      for (const file of project.getSourceFiles()) {
        file.formatText({
          ensureNewLineAtEndOfFile: true,
          indentSize: 2,
          convertTabsToSpaces: true,
          placeOpenBraceOnNewLineForFunctions: false,
          placeOpenBraceOnNewLineForControlBlocks: false,
        });
      }
      await project.save();

      const fileCount = project.getSourceFiles().length;
      displaySuccessMessage(
        `Generated ${fileCount} file(s) successfully to: ${args.output}`,
      );
    } catch (error) {
      throw new Error(
        `Code generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
