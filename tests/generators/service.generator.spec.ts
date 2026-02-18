import { Project } from "ts-morph";
import { ServiceGenerator } from "../../src/generators/service.generator";
import { OpenAPIV3 } from "openapi-types";

describe("ServiceGenerator", () => {
  let project: Project;
  let generator: ServiceGenerator;

  beforeEach(() => {
    // Initialize an in-memory project (no physical files created)
    project = new Project({ useInMemoryFileSystem: true });
    generator = new ServiceGenerator();
  });

  describe("Basic Generation", () => {
    it("should generate service with correct class name and decorator", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets": {
            get: {
              operationId: "listPets",
              tags: ["pets"],
              responses: {
                "200": {
                  description: "List of pets",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Pet" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Pet: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/services/pets.service.ts",
      );
      expect(sourceFile).toBeDefined();

      const serviceClass = sourceFile!.getClass("PetsService");
      expect(serviceClass).toBeDefined();
      expect(serviceClass!.isExported()).toBe(true);

      // Check @Injectable() decorator
      const decorator = serviceClass!.getDecorator("Injectable");
      expect(decorator).toBeDefined();
    });

    it("should implement the service interface", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            get: {
              operationId: "listUsers",
              tags: ["users"],
              responses: {
                "200": {
                  description: "List of users",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/services/users.service.ts",
      );
      const serviceClass = sourceFile!.getClass("UsersService");

      // Check implements clause
      const implementsClause = serviceClass!.getImplements();
      expect(implementsClause.length).toBe(1);
      expect(implementsClause[0].getText()).toBe("IUsersService");
    });

    it("should generate method with correct signature", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets": {
            get: {
              operationId: "listPets",
              tags: ["pets"],
              responses: {
                "200": {
                  description: "List of pets",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Pet" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Pet: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/services/pets.service.ts",
      );
      const serviceClass = sourceFile!.getClass("PetsService");
      const method = serviceClass!.getMethod("listPets");

      expect(method).toBeDefined();
      expect(method!.isAsync()).toBe(true);
      expect(method!.getReturnType().getText()).toContain("Promise<Pet[]>");
    });

    it("should throw 'not implemented' error in method body", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets": {
            get: {
              operationId: "listPets",
              tags: ["pets"],
              responses: {
                "200": {
                  description: "List of pets",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Pet" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Pet: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/services/pets.service.ts",
      );
      const serviceClass = sourceFile!.getClass("PetsService");
      const method = serviceClass!.getMethod("listPets");

      const bodyText = method!.getBodyText();
      expect(bodyText).toContain("throw new Error");
      expect(bodyText).toContain("listPets not implemented");
    });
  });

  describe("Multiple Operations", () => {
    it("should generate all methods for multiple operations in same tag", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets": {
            get: {
              operationId: "listPets",
              tags: ["pets"],
              responses: {
                "200": {
                  description: "List of pets",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Pet" },
                      },
                    },
                  },
                },
              },
            },
            post: {
              operationId: "createPet",
              tags: ["pets"],
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/NewPet" },
                  },
                },
              },
              responses: {
                "201": {
                  description: "Pet created",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/Pet" },
                    },
                  },
                },
              },
            },
          },
          "/pets/{petId}": {
            get: {
              operationId: "getPetById",
              tags: ["pets"],
              parameters: [
                {
                  name: "petId",
                  in: "path",
                  required: true,
                  schema: { type: "integer" },
                },
              ],
              responses: {
                "200": {
                  description: "Pet details",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/Pet" },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Pet: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
              },
            },
            NewPet: {
              type: "object",
              properties: {
                name: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/services/pets.service.ts",
      );
      const serviceClass = sourceFile!.getClass("PetsService");

      expect(serviceClass!.getMethod("listPets")).toBeDefined();
      expect(serviceClass!.getMethod("createPet")).toBeDefined();
      expect(serviceClass!.getMethod("getPetById")).toBeDefined();
    });

    it("should generate methods with correct parameters", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets": {
            post: {
              operationId: "createPet",
              tags: ["pets"],
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/NewPet" },
                  },
                },
              },
              responses: {
                "201": {
                  description: "Pet created",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/Pet" },
                    },
                  },
                },
              },
            },
          },
          "/pets/{petId}": {
            put: {
              operationId: "updatePet",
              tags: ["pets"],
              parameters: [
                {
                  name: "petId",
                  in: "path",
                  required: true,
                  schema: { type: "integer" },
                },
              ],
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/NewPet" },
                  },
                },
              },
              responses: {
                "200": {
                  description: "Pet updated",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/Pet" },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Pet: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
              },
            },
            NewPet: {
              type: "object",
              properties: {
                name: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/services/pets.service.ts",
      );
      const serviceClass = sourceFile!.getClass("PetsService");

      // Check createPet - has body parameter
      const createMethod = serviceClass!.getMethod("createPet");
      const createParams = createMethod!.getParameters();
      expect(createParams.length).toBe(1);
      expect(createParams[0].getName()).toBe("body");
      expect(createParams[0].getType().getText()).toContain("NewPet");

      // Check updatePet - has petId and body parameters
      const updateMethod = serviceClass!.getMethod("updatePet");
      const updateParams = updateMethod!.getParameters();
      expect(updateParams.length).toBe(2);
      expect(updateParams[0].getName()).toBe("petId");
      expect(updateParams[0].getType().getText()).toContain("number");
      expect(updateParams[1].getName()).toBe("body");
      expect(updateParams[1].getType().getText()).toContain("NewPet");
    });
  });

  describe("Multiple Tags", () => {
    it("should generate separate service files for each tag", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets": {
            get: {
              operationId: "listPets",
              tags: ["pets"],
              responses: {
                "200": {
                  description: "List of pets",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Pet" },
                      },
                    },
                  },
                },
              },
            },
          },
          "/users": {
            get: {
              operationId: "listUsers",
              tags: ["users"],
              responses: {
                "200": {
                  description: "List of users",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Pet: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
              },
            },
            User: {
              type: "object",
              properties: {
                id: { type: "integer" },
                email: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const petsService = project.getSourceFile(
        "generated/services/pets.service.ts",
      );
      const usersService = project.getSourceFile(
        "generated/services/users.service.ts",
      );

      expect(petsService).toBeDefined();
      expect(usersService).toBeDefined();

      const petsClass = petsService!.getClass("PetsService");
      const usersClass = usersService!.getClass("UsersService");

      expect(petsClass).toBeDefined();
      expect(usersClass).toBeDefined();
    });
  });

  describe("JSDoc Content", () => {
    it("should include class-level JSDoc with AI tags", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets": {
            get: {
              operationId: "listPets",
              tags: ["pets"],
              responses: {
                "200": {
                  description: "List of pets",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Pet" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Pet: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/services/pets.service.ts",
      );
      const serviceClass = sourceFile!.getClass("PetsService");

      const jsDocs = serviceClass!.getJsDocs();
      expect(jsDocs.length).toBeGreaterThan(0);

      const jsDocText = jsDocs[0].getFullText();
      expect(jsDocText).toContain("@ai_service");
      expect(jsDocText).toContain("PetsService");
      expect(jsDocText).toContain("@ai_context");
    });

    it("should include method-level JSDoc with AI instruction tags", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets": {
            get: {
              operationId: "listPets",
              tags: ["pets"],
              responses: {
                "200": {
                  description: "List of pets",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Pet" },
                      },
                    },
                  },
                },
              },
            },
            post: {
              operationId: "createPet",
              tags: ["pets"],
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/NewPet" },
                  },
                },
              },
              responses: {
                "201": {
                  description: "Pet created",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/Pet" },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Pet: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
              },
            },
            NewPet: {
              type: "object",
              properties: {
                name: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/services/pets.service.ts",
      );
      const serviceClass = sourceFile!.getClass("PetsService");

      // Check listPets method
      const listMethod = serviceClass!.getMethod("listPets");
      const listJsDocs = listMethod!.getJsDocs();
      expect(listJsDocs.length).toBeGreaterThan(0);

      const listJsDocText = listJsDocs[0].getFullText();
      expect(listJsDocText).toContain("@ai_action");
      expect(listJsDocText).toContain("@ai_hint");
      expect(listJsDocText).toContain("@param");
      expect(listJsDocText).toContain("@returns");
      expect(listJsDocText).toContain("@ai_implements");
      expect(listJsDocText).toContain("GET");

      // Check createPet method
      const createMethod = serviceClass!.getMethod("createPet");
      const createJsDocs = createMethod!.getJsDocs();
      expect(createJsDocs.length).toBeGreaterThan(0);

      const createJsDocText = createJsDocs[0].getFullText();
      expect(createJsDocText).toContain("@ai_action");
      expect(createJsDocText).toContain("Create");
      expect(createJsDocText).toContain("@ai_hint");
      expect(createJsDocText).toContain("POST");
      expect(createJsDocText).toContain("@throws");
    });

    it("should include @param tags for method parameters", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets/{petId}": {
            get: {
              operationId: "getPetById",
              tags: ["pets"],
              parameters: [
                {
                  name: "petId",
                  in: "path",
                  required: true,
                  schema: { type: "integer" },
                },
              ],
              responses: {
                "200": {
                  description: "Pet details",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/Pet" },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Pet: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/services/pets.service.ts",
      );
      const serviceClass = sourceFile!.getClass("PetsService");
      const method = serviceClass!.getMethod("getPetById");

      const jsDocs = method!.getJsDocs();
      const jsDocText = jsDocs[0].getFullText();

      expect(jsDocText).toContain("@param {number} petId");
    });

    it("should include @returns tag with correct type", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets": {
            get: {
              operationId: "listPets",
              tags: ["pets"],
              responses: {
                "200": {
                  description: "List of pets",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Pet" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Pet: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/services/pets.service.ts",
      );
      const serviceClass = sourceFile!.getClass("PetsService");
      const method = serviceClass!.getMethod("listPets");

      const jsDocs = method!.getJsDocs();
      const jsDocText = jsDocs[0].getFullText();

      expect(jsDocText).toContain("@returns {Promise<Pet[]>}");
      expect(jsDocText).toContain("Array of Pets resources");
    });
  });

  describe("DTO Imports", () => {
    it("should import body and response DTOs", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets": {
            post: {
              operationId: "createPet",
              tags: ["pets"],
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/NewPet" },
                  },
                },
              },
              responses: {
                "201": {
                  description: "Pet created",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/Pet" },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Pet: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
              },
            },
            NewPet: {
              type: "object",
              properties: {
                name: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/services/pets.service.ts",
      );

      const imports = sourceFile!.getImportDeclarations();
      const dtoImports = imports.filter((imp) =>
        imp.getModuleSpecifierValue().includes("../dtos/"),
      );

      expect(dtoImports.length).toBeGreaterThan(0);

      const importedNames = dtoImports.flatMap((imp) =>
        imp.getNamedImports().map((n) => n.getName()),
      );

      expect(importedNames).toContain("Pet");
      expect(importedNames).toContain("NewPet");
    });

    it("should import service interface from controller", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets": {
            get: {
              operationId: "listPets",
              tags: ["pets"],
              responses: {
                "200": {
                  description: "List of pets",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Pet" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Pet: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/services/pets.service.ts",
      );

      const imports = sourceFile!.getImportDeclarations();
      const controllerImport = imports.find((imp) =>
        imp.getModuleSpecifierValue().includes("controllers"),
      );

      expect(controllerImport).toBeDefined();

      const importedNames = controllerImport!
        .getNamedImports()
        .map((n) => n.getName());

      expect(importedNames).toContain("IPetsService");
    });
  });

  describe("Output Structure", () => {
    it("should respect type-based structure", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets": {
            get: {
              operationId: "listPets",
              tags: ["pets"],
              responses: {
                "200": {
                  description: "List of pets",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Pet" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Pet: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated", {
        structure: "type-based",
      });

      const sourceFile = project.getSourceFile(
        "generated/services/pets.service.ts",
      );

      expect(sourceFile).toBeDefined();
    });

    it("should respect domain-based structure", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets": {
            get: {
              operationId: "listPets",
              tags: ["pets"],
              responses: {
                "200": {
                  description: "List of pets",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Pet" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Pet: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated", {
        structure: "domain-based",
      });

      const sourceFile = project.getSourceFile(
        "generated/pets/services/pets.service.ts",
      );

      expect(sourceFile).toBeDefined();
    });
  });

  describe("Method Signatures", () => {
    it("should match service interface signatures from controller", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets/{petId}": {
            put: {
              operationId: "updatePet",
              tags: ["pets"],
              parameters: [
                {
                  name: "petId",
                  in: "path",
                  required: true,
                  schema: { type: "integer" },
                },
              ],
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/NewPet" },
                  },
                },
              },
              responses: {
                "200": {
                  description: "Pet updated",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/Pet" },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Pet: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
              },
            },
            NewPet: {
              type: "object",
              properties: {
                name: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/services/pets.service.ts",
      );
      const serviceClass = sourceFile!.getClass("PetsService");
      const method = serviceClass!.getMethod("updatePet");

      // Check parameters match expected signature
      const params = method!.getParameters();
      expect(params.length).toBe(2);
      expect(params[0].getName()).toBe("petId");
      expect(params[0].getType().getText()).toContain("number");
      expect(params[1].getName()).toBe("body");
      expect(params[1].getType().getText()).toContain("NewPet");

      // Check return type
      expect(method!.getReturnType().getText()).toContain("Promise<Pet>");
    });

    it("should handle operations with no parameters", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets": {
            get: {
              operationId: "listPets",
              tags: ["pets"],
              responses: {
                "200": {
                  description: "List of pets",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Pet" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Pet: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/services/pets.service.ts",
      );
      const serviceClass = sourceFile!.getClass("PetsService");
      const method = serviceClass!.getMethod("listPets");

      // Should have optional data parameter
      const params = method!.getParameters();
      expect(params.length).toBe(1);
      expect(params[0].getName()).toBe("data");
      expect(params[0].hasQuestionToken()).toBe(true);
    });

    it("should sort required params before optional params", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets/{petId}": {
            delete: {
              operationId: "deletePet",
              tags: ["pets"],
              parameters: [
                {
                  name: "api_key",
                  in: "header",
                  required: false,
                  schema: { type: "string" },
                },
                {
                  name: "petId",
                  in: "path",
                  required: true,
                  schema: { type: "integer" },
                },
              ],
              responses: {
                "200": { description: "Pet deleted" },
              },
            },
          },
        },
        components: { schemas: {} },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/services/pets.service.ts",
      );
      const serviceClass = sourceFile!.getClass("PetsService");
      const method = serviceClass!.getMethod("deletePet");
      const params = method!.getParameters();

      // Required param (petId) should come first, optional (apiKey) second
      expect(params.length).toBe(2);
      expect(params[0].getName()).toBe("petId");
      expect(params[0].hasQuestionToken()).toBe(false);
      expect(params[1].getName()).toBe("apiKey");
      expect(params[1].hasQuestionToken()).toBe(true);
    });
  });
});
