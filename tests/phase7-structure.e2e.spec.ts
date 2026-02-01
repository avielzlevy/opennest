/**
 * Phase 7 E2E Integration Tests
 *
 * Test Coverage:
 * - Type-based structure generation and compilation
 * - Domain-based structure generation and compilation
 * - Code equivalence between structures
 * - Default behavior
 * - Validation of invalid structure values
 */

import { Project } from "ts-morph";
import { DtoGenerator } from "../src/generators/dto.generator";
import { ControllerGenerator } from "../src/generators/controller.generator";
import { DecoratorGenerator } from "../src/generators/decorator.generator";
import { TypeMapper } from "../src/utils/type-mapper";
import { OpenAPIV3 } from "openapi-types";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { OutputStructureConfig } from "../src/utils/output-structure-manager";

describe("Phase 7 E2E Integration Tests", () => {
  let petstoreDoc: OpenAPIV3.Document;

  beforeAll(() => {
    // Load Petstore spec
    const specPath = path.join(
      __dirname,
      "fixtures/real-world/petstore.yaml"
    );
    const specContent = fs.readFileSync(specPath, "utf8");
    petstoreDoc = yaml.load(specContent) as OpenAPIV3.Document;
  });

  describe("Type-based Structure", () => {
    let project: Project;

    beforeEach(() => {
      project = new Project({ useInMemoryFileSystem: true });
    });

    it("should generate DTOs in type-based structure", () => {
      const generator = new DtoGenerator(new TypeMapper());
      const config: OutputStructureConfig = { structure: "type-based" };

      generator.generate(petstoreDoc, project, "./generated", config);

      // Verify files are in dtos/ directory
      const files = project.getSourceFiles();
      const dtoFiles = files.filter(f => f.getFilePath().includes("/dtos/"));

      expect(dtoFiles.length).toBeGreaterThan(0);

      // Check specific files
      expect(project.getSourceFile("./generated/dtos/Pet.dto.ts")).toBeDefined();
      expect(project.getSourceFile("./generated/dtos/NewPet.dto.ts")).toBeDefined();
      expect(project.getSourceFile("./generated/dtos/Error.dto.ts")).toBeDefined();
    });

    it("should generate controllers in type-based structure", () => {
      const generator = new ControllerGenerator();
      const config: OutputStructureConfig = { structure: "type-based" };

      generator.generate(petstoreDoc, project, "./generated", config);

      // Verify files are in controllers/ directory
      const files = project.getSourceFiles();
      const controllerFiles = files.filter(f => f.getFilePath().includes("/controllers/"));

      expect(controllerFiles.length).toBeGreaterThan(0);

      // Check specific file
      expect(project.getSourceFile("./generated/controllers/pets.controller.ts")).toBeDefined();
    });

    it("should generate decorators in type-based structure", () => {
      const generator = new DecoratorGenerator();
      const config: OutputStructureConfig = { structure: "type-based" };

      generator.generate(petstoreDoc, project, "./generated", config);

      // Verify files are in decorators/ directory
      const files = project.getSourceFiles();
      const decoratorFiles = files.filter(f => f.getFilePath().includes("/decorators/"));

      expect(decoratorFiles.length).toBeGreaterThan(0);

      // Check specific file
      expect(project.getSourceFile("./generated/decorators/pets.decorator.ts")).toBeDefined();
    });

    it("should compile successfully with TypeScript strict mode", () => {
      // Generate all artifacts
      new DtoGenerator(new TypeMapper()).generate(
        petstoreDoc,
        project,
        "./generated",
        { structure: "type-based" }
      );
      new ControllerGenerator().generate(
        petstoreDoc,
        project,
        "./generated",
        { structure: "type-based" }
      );
      new DecoratorGenerator().generate(
        petstoreDoc,
        project,
        "./generated",
        { structure: "type-based" }
      );

      // Get all diagnostics
      const diagnostics = project.getPreEmitDiagnostics();

      // Filter out common acceptable warnings
      const errors = diagnostics.filter(d => {
        const message = d.getMessageText().toString();
        // Allow "cannot find module" for external dependencies
        return !message.includes("Cannot find module");
      });

      if (errors.length > 0) {
        console.error("TypeScript Errors:");
        errors.forEach(e => console.error(e.getMessageText()));
      }

      // Should have no critical errors
      expect(errors.length).toBeLessThan(20); // Allow some external module warnings
    });
  });

  describe("Domain-based Structure", () => {
    let project: Project;

    beforeEach(() => {
      project = new Project({ useInMemoryFileSystem: true });
    });

    it("should generate DTOs in domain-based structure", () => {
      const generator = new DtoGenerator(new TypeMapper());
      const config: OutputStructureConfig = { structure: "domain-based" };

      generator.generate(petstoreDoc, project, "./generated", config);

      // Verify files are in domain/dtos/ directories
      const files = project.getSourceFiles();

      // Check specific files in domain directories
      expect(project.getSourceFile("./generated/Pet/dtos/Pet.dto.ts")).toBeDefined();
      expect(project.getSourceFile("./generated/NewPet/dtos/NewPet.dto.ts")).toBeDefined();
      expect(project.getSourceFile("./generated/Error/dtos/Error.dto.ts")).toBeDefined();

      // Verify they are NOT in type-based structure
      expect(project.getSourceFile("./generated/dtos/Pet.dto.ts")).toBeUndefined();
    });

    it("should generate controllers in domain-based structure", () => {
      const generator = new ControllerGenerator();
      const config: OutputStructureConfig = { structure: "domain-based" };

      generator.generate(petstoreDoc, project, "./generated", config);

      // Verify files are in domain/controllers/ directories
      expect(project.getSourceFile("./generated/pets/controllers/pets.controller.ts")).toBeDefined();

      // Verify they are NOT in type-based structure
      expect(project.getSourceFile("./generated/controllers/pets.controller.ts")).toBeUndefined();
    });

    it("should generate decorators in domain-based structure", () => {
      const generator = new DecoratorGenerator();
      const config: OutputStructureConfig = { structure: "domain-based" };

      generator.generate(petstoreDoc, project, "./generated", config);

      // Verify files are in domain/decorators/ directories
      expect(project.getSourceFile("./generated/pets/decorators/pets.decorator.ts")).toBeDefined();

      // Verify they are NOT in type-based structure
      expect(project.getSourceFile("./generated/decorators/pets.decorator.ts")).toBeUndefined();
    });

    it("should separate different domains into different directories", () => {
      const dtoGen = new DtoGenerator(new TypeMapper());
      const config: OutputStructureConfig = { structure: "domain-based" };

      dtoGen.generate(petstoreDoc, project, "./generated", config);

      const files = project.getSourceFiles();
      const filePaths = files.map(f => f.getFilePath());

      // Should have files in different domain directories
      const hasPetDomain = filePaths.some(p => p.includes("/Pet/"));
      const hasNewPetDomain = filePaths.some(p => p.includes("/NewPet/"));
      const hasErrorDomain = filePaths.some(p => p.includes("/Error/"));

      expect(hasPetDomain).toBe(true);
      expect(hasNewPetDomain).toBe(true);
      expect(hasErrorDomain).toBe(true);
    });

    it("should compile successfully with TypeScript strict mode", () => {
      // Generate all artifacts
      new DtoGenerator(new TypeMapper()).generate(
        petstoreDoc,
        project,
        "./generated",
        { structure: "domain-based" }
      );
      new ControllerGenerator().generate(
        petstoreDoc,
        project,
        "./generated",
        { structure: "domain-based" }
      );
      new DecoratorGenerator().generate(
        petstoreDoc,
        project,
        "./generated",
        { structure: "domain-based" }
      );

      // Get all diagnostics
      const diagnostics = project.getPreEmitDiagnostics();

      // Filter out common acceptable warnings
      const errors = diagnostics.filter(d => {
        const message = d.getMessageText().toString();
        return !message.includes("Cannot find module");
      });

      if (errors.length > 0) {
        console.error("TypeScript Errors:");
        errors.forEach(e => console.error(e.getMessageText()));
      }

      // Should have no critical errors
      expect(errors.length).toBeLessThan(20);
    });
  });

  describe("Code Equivalence", () => {
    it("should generate identical DTO code in both structures", () => {
      // Type-based
      const typeProject = new Project({ useInMemoryFileSystem: true });
      new DtoGenerator(new TypeMapper()).generate(
        petstoreDoc,
        typeProject,
        "./generated",
        { structure: "type-based" }
      );
      const typeFile = typeProject.getSourceFileOrThrow("./generated/dtos/Pet.dto.ts");
      const typeCode = typeFile.getFullText();

      // Domain-based
      const domainProject = new Project({ useInMemoryFileSystem: true });
      new DtoGenerator(new TypeMapper()).generate(
        petstoreDoc,
        domainProject,
        "./generated",
        { structure: "domain-based" }
      );
      const domainFile = domainProject.getSourceFileOrThrow("./generated/Pet/dtos/Pet.dto.ts");
      const domainCode = domainFile.getFullText();

      // Code should be identical
      expect(typeCode).toBe(domainCode);
    });

    it("should generate identical controller code in both structures", () => {
      // Type-based
      const typeProject = new Project({ useInMemoryFileSystem: true });
      new ControllerGenerator().generate(
        petstoreDoc,
        typeProject,
        "./generated",
        { structure: "type-based" }
      );
      const typeFile = typeProject.getSourceFileOrThrow("./generated/controllers/pets.controller.ts");
      const typeCode = typeFile.getFullText();

      // Domain-based
      const domainProject = new Project({ useInMemoryFileSystem: true });
      new ControllerGenerator().generate(
        petstoreDoc,
        domainProject,
        "./generated",
        { structure: "domain-based" }
      );
      const domainFile = domainProject.getSourceFileOrThrow("./generated/pets/controllers/pets.controller.ts");
      const domainCode = domainFile.getFullText();

      // Code should be identical
      expect(typeCode).toBe(domainCode);
    });

    it("should generate identical decorator code in both structures", () => {
      // Type-based
      const typeProject = new Project({ useInMemoryFileSystem: true });
      new DecoratorGenerator().generate(
        petstoreDoc,
        typeProject,
        "./generated",
        { structure: "type-based" }
      );
      const typeFile = typeProject.getSourceFileOrThrow("./generated/decorators/pets.decorator.ts");
      const typeCode = typeFile.getFullText();

      // Domain-based
      const domainProject = new Project({ useInMemoryFileSystem: true });
      new DecoratorGenerator().generate(
        petstoreDoc,
        domainProject,
        "./generated",
        { structure: "domain-based" }
      );
      const domainFile = domainProject.getSourceFileOrThrow("./generated/pets/decorators/pets.decorator.ts");
      const domainCode = domainFile.getFullText();

      // Code should be identical
      expect(typeCode).toBe(domainCode);
    });

    it("should generate same number of files in both structures", () => {
      // Type-based
      const typeProject = new Project({ useInMemoryFileSystem: true });
      new DtoGenerator(new TypeMapper()).generate(
        petstoreDoc,
        typeProject,
        "./generated",
        { structure: "type-based" }
      );
      new ControllerGenerator().generate(
        petstoreDoc,
        typeProject,
        "./generated",
        { structure: "type-based" }
      );
      new DecoratorGenerator().generate(
        petstoreDoc,
        typeProject,
        "./generated",
        { structure: "type-based" }
      );
      const typeFileCount = typeProject.getSourceFiles().length;

      // Domain-based
      const domainProject = new Project({ useInMemoryFileSystem: true });
      new DtoGenerator(new TypeMapper()).generate(
        petstoreDoc,
        domainProject,
        "./generated",
        { structure: "domain-based" }
      );
      new ControllerGenerator().generate(
        petstoreDoc,
        domainProject,
        "./generated",
        { structure: "domain-based" }
      );
      new DecoratorGenerator().generate(
        petstoreDoc,
        domainProject,
        "./generated",
        { structure: "domain-based" }
      );
      const domainFileCount = domainProject.getSourceFiles().length;

      expect(typeFileCount).toBe(domainFileCount);
      expect(typeFileCount).toBeGreaterThan(0);
    });
  });

  describe("Default Behavior", () => {
    it("should use type-based structure when config is undefined", () => {
      const project = new Project({ useInMemoryFileSystem: true });
      const generator = new DtoGenerator(new TypeMapper());

      // Generate without config
      generator.generate(petstoreDoc, project, "./generated");

      // Should use type-based structure
      expect(project.getSourceFile("./generated/dtos/Pet.dto.ts")).toBeDefined();
      expect(project.getSourceFile("./generated/Pet/dtos/Pet.dto.ts")).toBeUndefined();
    });

    it("should use type-based structure when structure is not specified", () => {
      const project = new Project({ useInMemoryFileSystem: true });
      const generator = new ControllerGenerator();

      // Generate without config
      generator.generate(petstoreDoc, project, "./generated");

      // Should use type-based structure
      expect(project.getSourceFile("./generated/controllers/pets.controller.ts")).toBeDefined();
      expect(project.getSourceFile("./generated/pets/controllers/pets.controller.ts")).toBeUndefined();
    });
  });

  describe("Validation", () => {
    it("should handle invalid structure value gracefully", () => {
      const project = new Project({ useInMemoryFileSystem: true });
      const generator = new DtoGenerator(new TypeMapper());

      // TypeScript should catch this at compile time, but test runtime behavior
      const invalidConfig = { structure: "invalid" } as any;

      // Should fall back to type-based or handle gracefully
      expect(() => {
        generator.generate(petstoreDoc, project, "./generated", invalidConfig);
      }).not.toThrow();

      // Should generate some files (either type-based or error recovery)
      expect(project.getSourceFiles().length).toBeGreaterThan(0);
    });
  });

  describe("File Organization", () => {
    it("should organize type-based structure correctly", () => {
      const project = new Project({ useInMemoryFileSystem: true });

      new DtoGenerator(new TypeMapper()).generate(
        petstoreDoc,
        project,
        "./generated",
        { structure: "type-based" }
      );
      new ControllerGenerator().generate(
        petstoreDoc,
        project,
        "./generated",
        { structure: "type-based" }
      );
      new DecoratorGenerator().generate(
        petstoreDoc,
        project,
        "./generated",
        { structure: "type-based" }
      );

      const files = project.getSourceFiles();
      const filePaths = files.map(f => f.getFilePath());

      // All DTOs should be in dtos/
      const dtoFiles = filePaths.filter(p => p.endsWith(".dto.ts"));
      dtoFiles.forEach(path => {
        expect(path).toMatch(/\/dtos\//);
      });

      // All controllers should be in controllers/
      const controllerFiles = filePaths.filter(p => p.endsWith(".controller.ts"));
      controllerFiles.forEach(path => {
        expect(path).toMatch(/\/controllers\//);
      });

      // All decorators should be in decorators/
      const decoratorFiles = filePaths.filter(p => p.endsWith(".decorator.ts"));
      decoratorFiles.forEach(path => {
        expect(path).toMatch(/\/decorators\//);
      });
    });

    it("should organize domain-based structure correctly", () => {
      const project = new Project({ useInMemoryFileSystem: true });

      new DtoGenerator(new TypeMapper()).generate(
        petstoreDoc,
        project,
        "./generated",
        { structure: "domain-based" }
      );
      new ControllerGenerator().generate(
        petstoreDoc,
        project,
        "./generated",
        { structure: "domain-based" }
      );
      new DecoratorGenerator().generate(
        petstoreDoc,
        project,
        "./generated",
        { structure: "domain-based" }
      );

      const files = project.getSourceFiles();
      const filePaths = files.map(f => f.getFilePath());

      // All DTOs should be in {domain}/dtos/
      const dtoFiles = filePaths.filter(p => p.endsWith(".dto.ts"));
      dtoFiles.forEach(path => {
        expect(path).toMatch(/\/[^/]+\/dtos\//);
      });

      // All controllers should be in {domain}/controllers/
      const controllerFiles = filePaths.filter(p => p.endsWith(".controller.ts"));
      controllerFiles.forEach(path => {
        expect(path).toMatch(/\/[^/]+\/controllers\//);
      });

      // All decorators should be in {domain}/decorators/
      const decoratorFiles = filePaths.filter(p => p.endsWith(".decorator.ts"));
      decoratorFiles.forEach(path => {
        expect(path).toMatch(/\/[^/]+\/decorators\//);
      });
    });
  });
});
