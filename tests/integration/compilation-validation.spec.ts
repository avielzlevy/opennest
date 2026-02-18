/**
 * Compilation Validation Integration Test
 *
 * Validates that generated TypeScript code compiles without errors in strict mode.
 * This test generates code for real-world specs, writes to temporary directory,
 * and runs `tsc --noEmit --strict` to validate type correctness.
 */

import { Project } from "ts-morph";
import { OpenAPIV3 } from "openapi-types";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { execSync } from "child_process";
import { TypeMapper } from "../../src/utils/type-mapper";
import { DtoGenerator } from "../../src/generators/dto.generator";
import { ControllerGenerator } from "../../src/generators/controller.generator";
import { CommonGenerator } from "../../src/generators/common.generator";
import { DecoratorGenerator } from "../../src/generators/decorator.generator";

describe("Compilation Validation", () => {
  const TEMP_OUTPUT_DIR = path.join(__dirname, "../../.tmp-compilation-test");

  /**
   * Clean up temporary directory before and after tests
   */
  beforeEach(() => {
    if (fs.existsSync(TEMP_OUTPUT_DIR)) {
      fs.rmSync(TEMP_OUTPUT_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEMP_OUTPUT_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEMP_OUTPUT_DIR)) {
      fs.rmSync(TEMP_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  /**
   * Load OpenAPI spec from YAML file
   */
  function loadSpec(specPath: string): OpenAPIV3.Document {
    const fileContent = fs.readFileSync(specPath, "utf-8");
    return yaml.load(fileContent) as OpenAPIV3.Document;
  }

  /**
   * Generate code from OpenAPI spec to output directory
   */
  function generateCode(spec: OpenAPIV3.Document, outputDir: string): void {
    const project = new Project({
      compilerOptions: {
        outDir: outputDir,
        strict: true,
        target: 99, // ESNext
        module: 1, // CommonJS
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
      skipAddingFilesFromTsConfig: true,
    });

    // Instantiate generators
    const typeMapper = new TypeMapper();
    const commonGen = new CommonGenerator();
    const dtoGen = new DtoGenerator(typeMapper);
    const decoratorGen = new DecoratorGenerator();
    const controllerGen = new ControllerGenerator();

    // Generate code
    commonGen.generate(spec, project, outputDir);
    dtoGen.generate(spec, project, outputDir);
    decoratorGen.generate(spec, project, outputDir);
    controllerGen.generate(spec, project, outputDir);

    // Format and save files
    for (const file of project.getSourceFiles()) {
      file.formatText({
        ensureNewLineAtEndOfFile: true,
        indentSize: 2,
        convertTabsToSpaces: true,
      });
    }
    project.saveSync();
  }

  /**
   * Create tsconfig.json for compilation validation
   */
  function createTsConfig(outputDir: string): void {
    const tsconfigPath = path.join(outputDir, "tsconfig.json");
    const tsconfig = {
      compilerOptions: {
        target: "ES2021",
        module: "commonjs",
        strict: true,
        esModuleInterop: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        skipLibCheck: true,
        moduleResolution: "node",
        types: ["node"],
        baseUrl: ".",
        paths: {
          "*": ["node_modules/*"],
        },
      },
      include: ["**/*.ts"],
      exclude: ["node_modules"],
    };

    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  }

  /**
   * Run TypeScript compiler to validate generated code
   * @returns true if compilation succeeds, false otherwise
   */
  function validateCompilation(outputDir: string): { success: boolean; output: string } {
    try {
      const result = execSync(
        `npx tsc --noEmit --strict --project ${path.join(outputDir, "tsconfig.json")}`,
        {
          cwd: path.resolve(__dirname, "../.."),
          encoding: "utf-8",
          stdio: "pipe",
        }
      );
      return { success: true, output: result };
    } catch (error: any) {
      return {
        success: false,
        output: error.stdout || error.stderr || error.message,
      };
    }
  }

  describe("Real-World Specs", () => {
    it("should generate compilable code for Petstore spec", () => {
      // Load spec
      const specPath = path.join(__dirname, "../fixtures/real-world/petstore.yaml");
      const spec = loadSpec(specPath);

      // Generate code
      generateCode(spec, TEMP_OUTPUT_DIR);

      // Create tsconfig
      createTsConfig(TEMP_OUTPUT_DIR);

      // Validate compilation
      const result = validateCompilation(TEMP_OUTPUT_DIR);

      // Assert
      if (!result.success) {
        console.error("Compilation failed:");
        console.error(result.output);
      }

      expect(result.success).toBe(true);
    }, 30000); // 30 second timeout for compilation

    it("should generate compilable code for Petstore Expanded spec", () => {
      // Load spec
      const specPath = path.join(__dirname, "../fixtures/real-world/petstore-expanded.yaml");
      const spec = loadSpec(specPath);

      // Generate code
      generateCode(spec, TEMP_OUTPUT_DIR);

      // Create tsconfig
      createTsConfig(TEMP_OUTPUT_DIR);

      // Validate compilation
      const result = validateCompilation(TEMP_OUTPUT_DIR);

      // Assert
      if (!result.success) {
        console.error("Compilation failed:");
        console.error(result.output);
      }

      expect(result.success).toBe(true);
    }, 30000); // 30 second timeout for compilation
  });

  describe("Generated Files Structure", () => {
    it("should generate all expected file types for petstore spec", () => {
      // Load spec
      const specPath = path.join(__dirname, "../fixtures/real-world/petstore.yaml");
      const spec = loadSpec(specPath);

      // Generate code
      generateCode(spec, TEMP_OUTPUT_DIR);

      // Check that expected directories exist
      const commonDir = path.join(TEMP_OUTPUT_DIR, "common");
      const controllersDir = path.join(TEMP_OUTPUT_DIR, "controllers");
      const decoratorsDir = path.join(TEMP_OUTPUT_DIR, "decorators");
      const dtosDir = path.join(TEMP_OUTPUT_DIR, "dtos"); // Note: plural "dtos"

      expect(fs.existsSync(commonDir)).toBe(true);
      expect(fs.existsSync(controllersDir)).toBe(true);
      expect(fs.existsSync(decoratorsDir)).toBe(true);
      expect(fs.existsSync(dtosDir)).toBe(true);

      // Check that common files exist
      expect(fs.existsSync(path.join(commonDir, "dto", "error.dto.ts"))).toBe(true);
      expect(fs.existsSync(path.join(commonDir, "decorators", "auth", "jwt.decorator.ts"))).toBe(true);

      // Count generated files (DTOs)
      const dtoFiles = fs.readdirSync(dtosDir);
      expect(dtoFiles.length).toBeGreaterThan(0);

      // Count generated files (Controllers)
      const controllerFiles = fs.readdirSync(controllersDir);
      expect(controllerFiles.length).toBeGreaterThan(0);

      // Count generated files (Decorators)
      const decoratorFiles = fs.readdirSync(decoratorsDir);
      expect(decoratorFiles.length).toBeGreaterThan(0);
    });
  });

  describe("Strict Mode Compliance", () => {
    it("should not use 'any' type in generated code (strict mode check)", () => {
      // Load spec
      const specPath = path.join(__dirname, "../fixtures/real-world/petstore.yaml");
      const spec = loadSpec(specPath);

      // Generate code
      generateCode(spec, TEMP_OUTPUT_DIR);

      // Read all generated TypeScript files
      const allTsFiles: string[] = [];

      function collectTsFiles(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            collectTsFiles(fullPath);
          } else if (entry.name.endsWith(".ts")) {
            allTsFiles.push(fullPath);
          }
        }
      }

      collectTsFiles(TEMP_OUTPUT_DIR);

      // Check each file for explicit 'any' usage
      const filesWithAny: string[] = [];
      for (const filePath of allTsFiles) {
        const content = fs.readFileSync(filePath, "utf-8");
        // Look for ': any' or 'any[]' but exclude comments
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Skip comment lines
          if (line.trim().startsWith("//") || line.trim().startsWith("*")) {
            continue;
          }
          // Check for explicit any usage
          if (/:\s*any(\s|;|,|\)|\||$)/.test(line) || /any\[\]/.test(line)) {
            filesWithAny.push(`${path.relative(TEMP_OUTPUT_DIR, filePath)}:${i + 1}`);
          }
        }
      }

      // Log files with 'any' for debugging
      if (filesWithAny.length > 0) {
        console.warn("Files with 'any' type:");
        filesWithAny.forEach((file) => console.warn(`  - ${file}`));
      }

      // Generated code should not use 'any' type (strict mode compliance)
      expect(filesWithAny.length).toBe(0);
    });
  });
});
