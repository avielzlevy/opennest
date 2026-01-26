// main.ts
import SwaggerParser from "@apidevtools/swagger-parser";
import { Project } from "ts-morph";
import { ISpecParser, IFileWriter } from "./interfaces/core";
import { TypeMapper } from "./utils/type-mapper";
import { DtoGenerator } from "./generators/dto.generator";
import { ControllerGenerator } from "./generators/controller.generator";
import { CommonGenerator } from "./generators/common.generator";
import { DecoratorGenerator } from "./generators/decorator.generator";

// --- Adapters (Implementation Details) ---

class SwaggerParserAdapter implements ISpecParser {
  async parse(path: string) {
    // Dereferencing strictly validates the schema
    return (await SwaggerParser.dereference(path)) as any;
  }
}

class SystemFileWriter implements IFileWriter {
  async save(project: Project) {
    console.log("Formatting source files...");
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
    console.log(
      `\nSuccess! Generated ${project.getSourceFiles().length} files.`,
    );
  }
}

// --- Main Execution ---

async function bootstrap() {
  // 1. Dependency Injection
  const parser = new SwaggerParserAdapter();
  const fileWriter = new SystemFileWriter();
  const typeMapper = new TypeMapper();

  // Generators
  const dtoGen = new DtoGenerator(typeMapper);
  const controllerGen = new ControllerGenerator();
  const commonGen = new CommonGenerator();
  const decoratorGen = new DecoratorGenerator();

  // 2. Initialize AST Project
  const project = new Project({
    tsConfigFilePath: "./tsconfig.json", // Assumes strict mode
    skipAddingFilesFromTsConfig: true,
  });

  // 3. Parse OpenAPI Spec
  const openapiUrl = "http://localhost:5300/docs-json"; // Adjust as needed
  const document = await parser.parse(openapiUrl);

  // 4. Execution Pipeline
  console.log("Generating Common Artifacts...");
  commonGen.generate(document, project);

  console.log("Generating DTOs...");
  dtoGen.generate(document, project);

  console.log("Generating Endpoint Decorators...");
  decoratorGen.generate(document, project);

  console.log("Generating Controllers...");
  controllerGen.generate(document, project);

  await fileWriter.save(project);
}

bootstrap().catch(console.error);
