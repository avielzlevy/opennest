/**
 * Real-World Integration Tests
 *
 * Purpose:
 * - Validate full pipeline with production-grade OpenAPI specs
 * - Test all generators together (DTO, Controller, Decorator)
 * - Ensure generated codebase has correct structure and imports
 * - Snapshot test complete generated output for regression detection
 *
 * Test Coverage:
 * - Petstore: Basic CRUD operations, single tag, simple schemas
 * - Petstore Expanded: Multiple tags, nested schemas, complex relationships
 *
 * Architecture:
 * - Uses in-memory file system for fast execution
 * - Deterministic snapshot ordering via custom serializer
 * - Tests run in <5 seconds each
 */

import { Project } from "ts-morph";
import { DtoGenerator } from "../../src/generators/dto.generator";
import { ControllerGenerator } from "../../src/generators/controller.generator";
import { DecoratorGenerator } from "../../src/generators/decorator.generator";
import { TypeMapper } from "../../src/utils/type-mapper";
import { OpenAPIV3 } from "openapi-types";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

describe("Real-World Integration Tests", () => {
  let project: Project;
  let dtoGenerator: DtoGenerator;
  let controllerGenerator: ControllerGenerator;
  let decoratorGenerator: DecoratorGenerator;

  // Helper: Load OpenAPI spec from fixture file
  function loadSpec(filename: string): OpenAPIV3.Document {
    const fixturePath = path.resolve(__dirname, "../fixtures/real-world", filename);
    const fileContent = fs.readFileSync(fixturePath, "utf8");
    return yaml.load(fileContent) as OpenAPIV3.Document;
  }

  // Helper: Extract file structure from generated project
  function extractFileStructure(project: Project): Record<string, { path: string; classes: string[]; imports: string[] }> {
    const structure: Record<string, { path: string; classes: string[]; imports: string[] }> = {};

    project.getSourceFiles().forEach(sourceFile => {
      const filePath = sourceFile.getFilePath();
      // Normalize path to remove leading slashes and make it relative
      const normalizedPath = filePath.replace(/^\//, "");
      const classes = sourceFile.getClasses().map(c => c.getName() || "Anonymous");
      const imports = sourceFile.getImportDeclarations().map(imp => {
        const moduleSpec = imp.getModuleSpecifierValue();
        const named = imp.getNamedImports().map(n => n.getName()).sort().join(", ");
        return `import { ${named} } from "${moduleSpec}"`;
      }).sort();

      structure[normalizedPath] = { path: normalizedPath, classes: classes.sort(), imports };
    });

    return structure;
  }

  beforeEach(() => {
    // Initialize in-memory project for fast testing
    project = new Project({ useInMemoryFileSystem: true });
    dtoGenerator = new DtoGenerator(new TypeMapper());
    controllerGenerator = new ControllerGenerator();
    decoratorGenerator = new DecoratorGenerator();
  });

  describe("Petstore Integration", () => {
    it("should generate complete codebase from petstore.yaml", () => {
      const spec = loadSpec("petstore.yaml");

      // Run all generators
      dtoGenerator.generate(spec, project, "generated");
      controllerGenerator.generate(spec, project, "generated");
      decoratorGenerator.generate(spec, project, "generated");

      // Extract file structure
      const structure = extractFileStructure(project);

      // Validate DTOs were generated
      expect(structure["generated/dtos/Pet.dto.ts"]).toBeDefined();
      expect(structure["generated/dtos/Pet.dto.ts"].classes).toContain("Pet");
      expect(structure["generated/dtos/NewPet.dto.ts"]).toBeDefined();
      expect(structure["generated/dtos/NewPet.dto.ts"].classes).toContain("NewPet");
      expect(structure["generated/dtos/Category.dto.ts"]).toBeDefined();
      expect(structure["generated/dtos/Category.dto.ts"].classes).toContain("Category");
      expect(structure["generated/dtos/Tag.dto.ts"]).toBeDefined();
      expect(structure["generated/dtos/Tag.dto.ts"].classes).toContain("Tag");
      expect(structure["generated/dtos/Error.dto.ts"]).toBeDefined();
      expect(structure["generated/dtos/Error.dto.ts"].classes).toContain("Error");

      // Validate Controllers were generated
      expect(structure["generated/controllers/pets.controller.ts"]).toBeDefined();
      expect(structure["generated/controllers/pets.controller.ts"].classes).toContain("PetsController");

      // Validate Decorators were generated
      expect(structure["generated/decorators/pets.decorator.ts"]).toBeDefined();

      // Snapshot test: File paths and class names only (avoid circular refs)
      const snapshotData = Object.keys(structure).sort().reduce((acc, key) => {
        acc[key] = {
          classes: structure[key].classes,
          importCount: structure[key].imports.length,
        };
        return acc;
      }, {} as Record<string, { classes: string[]; importCount: number }>);

      expect(snapshotData).toMatchSnapshot("petstore-file-structure");
    });

    it("should generate all CRUD operations for pets resource", () => {
      const spec = loadSpec("petstore.yaml");

      // Run controller generator
      controllerGenerator.generate(spec, project, "generated");

      const sourceFile = project.getSourceFile("generated/controllers/pets.controller.ts");
      expect(sourceFile).toBeDefined();

      const controllerClass = sourceFile!.getClass("PetsController");
      expect(controllerClass).toBeDefined();

      // Validate all operations exist (HEAD excluded per architectural decision)
      const methods = controllerClass!.getMethods().map(m => m.getName());
      expect(methods).toContain("listPets");
      expect(methods).toContain("createPet");
      expect(methods).toContain("getPetById");
      expect(methods).toContain("updatePet");
      expect(methods).toContain("deletePet");

      // Snapshot test: Controller methods
      expect(methods.sort()).toMatchSnapshot("petstore-controller-methods");
    });

    it("should generate correct imports in controller", () => {
      const spec = loadSpec("petstore.yaml");

      // Run all generators (DTOs needed for imports)
      dtoGenerator.generate(spec, project, "generated");
      controllerGenerator.generate(spec, project, "generated");

      const sourceFile = project.getSourceFile("generated/controllers/pets.controller.ts");
      expect(sourceFile).toBeDefined();

      const imports = sourceFile!.getImportDeclarations().map(imp => ({
        module: imp.getModuleSpecifierValue(),
        named: imp.getNamedImports().map(n => n.getName()).sort(),
      })).sort((a, b) => a.module.localeCompare(b.module));

      // Validate NestJS imports
      const nestjsImport = imports.find(imp => imp.module === "@nestjs/common");
      expect(nestjsImport).toBeDefined();
      expect(nestjsImport!.named).toContain("Controller");
      expect(nestjsImport!.named).toContain("Get");
      expect(nestjsImport!.named).toContain("Post");
      expect(nestjsImport!.named).toContain("Put");
      expect(nestjsImport!.named).toContain("Delete");

      // Validate DTO imports exist
      const dtoImports = imports.filter(imp => imp.module.includes("../dtos/"));
      expect(dtoImports.length).toBeGreaterThan(0);

      // Snapshot test: All imports (simplified to avoid circular refs)
      const snapshotData = imports.map(imp => `${imp.module}: [${imp.named.join(", ")}]`);
      expect(snapshotData).toMatchSnapshot("petstore-controller-imports");
    });
  });

  describe("Petstore Expanded Integration", () => {
    it("should generate complete codebase from petstore-expanded.yaml", () => {
      const spec = loadSpec("petstore-expanded.yaml");

      // Run all generators
      dtoGenerator.generate(spec, project, "generated");
      controllerGenerator.generate(spec, project, "generated");
      decoratorGenerator.generate(spec, project, "generated");

      // Extract file structure
      const structure = extractFileStructure(project);

      // Validate DTOs for complex nested schemas
      expect(structure["generated/dtos/Pet.dto.ts"]).toBeDefined();
      expect(structure["generated/dtos/NewPet.dto.ts"]).toBeDefined();
      expect(structure["generated/dtos/PetList.dto.ts"]).toBeDefined();
      expect(structure["generated/dtos/Order.dto.ts"]).toBeDefined();
      expect(structure["generated/dtos/OrderItem.dto.ts"]).toBeDefined();
      expect(structure["generated/dtos/Address.dto.ts"]).toBeDefined();
      expect(structure["generated/dtos/Coordinates.dto.ts"]).toBeDefined();
      expect(structure["generated/dtos/User.dto.ts"]).toBeDefined();
      expect(structure["generated/dtos/ApiResponse.dto.ts"]).toBeDefined();

      // Validate Controllers for multiple tags
      expect(structure["generated/controllers/pets.controller.ts"]).toBeDefined();
      expect(structure["generated/controllers/store.controller.ts"]).toBeDefined();
      expect(structure["generated/controllers/user.controller.ts"]).toBeDefined();

      // Validate Decorators for multiple tags
      expect(structure["generated/decorators/pets.decorator.ts"]).toBeDefined();
      expect(structure["generated/decorators/store.decorator.ts"]).toBeDefined();
      expect(structure["generated/decorators/user.decorator.ts"]).toBeDefined();

      // Snapshot test: File paths and class names only (avoid circular refs)
      const snapshotData = Object.keys(structure).sort().reduce((acc, key) => {
        acc[key] = {
          classes: structure[key].classes,
          importCount: structure[key].imports.length,
        };
        return acc;
      }, {} as Record<string, { classes: string[]; importCount: number }>);

      expect(snapshotData).toMatchSnapshot("petstore-expanded-file-structure");
    });

    it("should generate controllers for all three resource types", () => {
      const spec = loadSpec("petstore-expanded.yaml");

      // Run controller generator
      controllerGenerator.generate(spec, project, "generated");

      // Pets controller
      const petsController = project.getSourceFile("generated/controllers/pets.controller.ts");
      expect(petsController).toBeDefined();
      expect(petsController!.getClass("PetsController")).toBeDefined();

      // Store controller
      const storeController = project.getSourceFile("generated/controllers/store.controller.ts");
      expect(storeController).toBeDefined();
      expect(storeController!.getClass("StoreController")).toBeDefined();

      // User controller
      const userController = project.getSourceFile("generated/controllers/user.controller.ts");
      expect(userController).toBeDefined();
      expect(userController!.getClass("UserController")).toBeDefined();

      // Extract all method names from all controllers
      const allMethods = {
        pets: petsController!.getClass("PetsController")!.getMethods().map(m => m.getName()).sort(),
        store: storeController!.getClass("StoreController")!.getMethods().map(m => m.getName()).sort(),
        user: userController!.getClass("UserController")!.getMethods().map(m => m.getName()).sort(),
      };

      // Snapshot test: All controller methods
      expect(allMethods).toMatchSnapshot("petstore-expanded-controller-methods");
    });

    it("should handle nested schemas with proper imports", () => {
      const spec = loadSpec("petstore-expanded.yaml");

      // Run DTO generator
      dtoGenerator.generate(spec, project, "generated");

      // Order DTO has nested OrderItem and Address references
      const orderDto = project.getSourceFile("generated/dtos/Order.dto.ts");
      expect(orderDto).toBeDefined();

      const orderClass = orderDto!.getClass("Order");
      expect(orderClass).toBeDefined();

      // Check for properties that reference other DTOs
      const itemsProp = orderClass!.getProperty("items");
      expect(itemsProp).toBeDefined();

      const shippingAddressProp = orderClass!.getProperty("shippingAddress");
      expect(shippingAddressProp).toBeDefined();

      // Address DTO has nested Coordinates reference
      const addressDto = project.getSourceFile("generated/dtos/Address.dto.ts");
      expect(addressDto).toBeDefined();

      const addressClass = addressDto!.getClass("Address");
      expect(addressClass).toBeDefined();

      const coordinatesProp = addressClass!.getProperty("coordinates");
      expect(coordinatesProp).toBeDefined();

      // User DTO has nested Address array
      const userDto = project.getSourceFile("generated/dtos/User.dto.ts");
      expect(userDto).toBeDefined();

      const userClass = userDto!.getClass("User");
      expect(userClass).toBeDefined();

      const addressesProp = userClass!.getProperty("addresses");
      expect(addressesProp).toBeDefined();

      // Snapshot test: Property names and types (not full AST to avoid circular refs)
      const nestedProps = {
        orderItems: itemsProp ? {
          name: itemsProp.getName(),
          type: itemsProp.getType().getText(),
          hasDecorators: itemsProp.getDecorators().length > 0,
        } : null,
        orderShippingAddress: shippingAddressProp ? {
          name: shippingAddressProp.getName(),
          type: shippingAddressProp.getType().getText(),
          hasDecorators: shippingAddressProp.getDecorators().length > 0,
        } : null,
        addressCoordinates: coordinatesProp ? {
          name: coordinatesProp.getName(),
          type: coordinatesProp.getType().getText(),
          hasDecorators: coordinatesProp.getDecorators().length > 0,
        } : null,
        userAddresses: addressesProp ? {
          name: addressesProp.getName(),
          type: addressesProp.getType().getText(),
          hasDecorators: addressesProp.getDecorators().length > 0,
        } : null,
      };

      expect(nestedProps).toMatchSnapshot("petstore-expanded-nested-schemas");
    });

    it("should handle PATCH operation correctly", () => {
      const spec = loadSpec("petstore-expanded.yaml");

      // Run controller generator
      controllerGenerator.generate(spec, project, "generated");

      const petsController = project.getSourceFile("generated/controllers/pets.controller.ts");
      expect(petsController).toBeDefined();

      const controllerClass = petsController!.getClass("PetsController");
      expect(controllerClass).toBeDefined();

      // Validate PATCH method exists
      const patchMethod = controllerClass!.getMethod("patchPet");
      expect(patchMethod).toBeDefined();

      // Check for @Patch decorator
      const patchDecorator = patchMethod!.getDecorators().find(d => d.getName() === "Patch");
      expect(patchDecorator).toBeDefined();

      // Snapshot test: PATCH method signature
      expect(patchMethod!.getText()).toMatchSnapshot("petstore-expanded-patch-method");
    });
  });

  describe("File Path Conventions", () => {
    it("should follow consistent naming conventions across both specs", () => {
      const petstoreSpec = loadSpec("petstore.yaml");
      const expandedSpec = loadSpec("petstore-expanded.yaml");

      // Generate from both specs in separate projects
      const petstoreProject = new Project({ useInMemoryFileSystem: true });
      const expandedProject = new Project({ useInMemoryFileSystem: true });

      const petDto = new DtoGenerator(new TypeMapper());
      const petController = new ControllerGenerator();
      const petDecorator = new DecoratorGenerator();

      const expDto = new DtoGenerator(new TypeMapper());
      const expController = new ControllerGenerator();
      const expDecorator = new DecoratorGenerator();

      petDto.generate(petstoreSpec, petstoreProject, "generated");
      petController.generate(petstoreSpec, petstoreProject, "generated");
      petDecorator.generate(petstoreSpec, petstoreProject, "generated");

      expDto.generate(expandedSpec, expandedProject, "generated");
      expController.generate(expandedSpec, expandedProject, "generated");
      expDecorator.generate(expandedSpec, expandedProject, "generated");

      // Extract file paths and normalize
      const petstorePaths = petstoreProject.getSourceFiles()
        .map(sf => sf.getFilePath().replace(/^\//, ""))
        .sort();
      const expandedPaths = expandedProject.getSourceFiles()
        .map(sf => sf.getFilePath().replace(/^\//, ""))
        .sort();

      // Validate naming conventions
      petstorePaths.forEach(filePath => {
        // DTOs should end with .dto.ts
        if (filePath.includes("/dtos/")) {
          expect(filePath).toMatch(/\.dto\.ts$/);
        }
        // Controllers should end with .controller.ts
        if (filePath.includes("/controllers/")) {
          expect(filePath).toMatch(/\.controller\.ts$/);
        }
        // Decorators should end with .decorator.ts
        if (filePath.includes("/decorators/")) {
          expect(filePath).toMatch(/\.decorator\.ts$/);
        }
      });

      expandedPaths.forEach(filePath => {
        // DTOs should end with .dto.ts
        if (filePath.includes("/dtos/")) {
          expect(filePath).toMatch(/\.dto\.ts$/);
        }
        // Controllers should end with .controller.ts
        if (filePath.includes("/controllers/")) {
          expect(filePath).toMatch(/\.controller\.ts$/);
        }
        // Decorators should end with .decorator.ts
        if (filePath.includes("/decorators/")) {
          expect(filePath).toMatch(/\.decorator\.ts$/);
        }
      });

      // Snapshot test: File paths from both specs (as simple arrays)
      expect(petstorePaths).toMatchSnapshot("petstore-file-paths");
      expect(expandedPaths).toMatchSnapshot("expanded-file-paths");
    });
  });

  describe("Performance", () => {
    it("should generate petstore codebase in <5 seconds", () => {
      const spec = loadSpec("petstore.yaml");
      const startTime = Date.now();

      dtoGenerator.generate(spec, project, "generated");
      controllerGenerator.generate(spec, project, "generated");
      decoratorGenerator.generate(spec, project, "generated");

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });

    it("should generate petstore-expanded codebase in <5 seconds", () => {
      const spec = loadSpec("petstore-expanded.yaml");
      const startTime = Date.now();

      dtoGenerator.generate(spec, project, "generated");
      controllerGenerator.generate(spec, project, "generated");
      decoratorGenerator.generate(spec, project, "generated");

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });
  });
});
