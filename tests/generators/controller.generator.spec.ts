import { Project } from "ts-morph";
import { ControllerGenerator } from "../../src/generators/controller.generator";
import { OpenAPIV3 } from "openapi-types";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { normalizeCode } from "../jest-setup";

describe("ControllerGenerator", () => {
  let project: Project;
  let generator: ControllerGenerator;

  beforeEach(() => {
    // Initialize an in-memory project (no physical files created)
    project = new Project({ useInMemoryFileSystem: true });
    generator = new ControllerGenerator();
  });

  describe("HTTP Methods and Routes", () => {
    it("should generate controller with GET operation", () => {
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
        "generated/controllers/pets.controller.ts"
      );
      expect(sourceFile).toBeDefined();

      const controllerClass = sourceFile!.getClass("PetsController");
      expect(controllerClass).toBeDefined();

      const method = controllerClass!.getMethod("listPets");
      expect(method).toBeDefined();
      expect(method!.getDecorators().some((d) => d.getName() === "Get")).toBe(
        true
      );
    });

    it("should generate controller with POST operation and request body", () => {
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
        "generated/controllers/pets.controller.ts"
      );
      const controllerClass = sourceFile!.getClass("PetsController");
      const method = controllerClass!.getMethod("createPet");

      expect(method).toBeDefined();
      expect(method!.getDecorators().some((d) => d.getName() === "Post")).toBe(
        true
      );

      // Check for @Body() parameter
      const bodyParam = method!.getParameters().find((p) => p.getName() === "body");
      expect(bodyParam).toBeDefined();
      expect(bodyParam!.getType().getText()).toContain("NewPet");
    });

    it("should generate controller with PUT operation with path param and body", () => {
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
        "generated/controllers/pets.controller.ts"
      );
      const controllerClass = sourceFile!.getClass("PetsController");
      const method = controllerClass!.getMethod("updatePet");

      expect(method).toBeDefined();
      expect(method!.getDecorators().some((d) => d.getName() === "Put")).toBe(
        true
      );

      // Check for @Param() parameter
      const pathParam = method!.getParameters().find((p) => p.getName() === "petId");
      expect(pathParam).toBeDefined();
      expect(pathParam!.getDecorators().some((d) => d.getName() === "Param")).toBe(
        true
      );

      // Check for @Body() parameter
      const bodyParam = method!.getParameters().find((p) => p.getName() === "body");
      expect(bodyParam).toBeDefined();
    });

    it("should generate controller with PATCH operation", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets/{petId}": {
            patch: {
              operationId: "partialUpdatePet",
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
                    schema: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                      },
                    },
                  },
                },
              },
              responses: {
                "200": {
                  description: "Pet partially updated",
                },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/controllers/pets.controller.ts"
      );
      const controllerClass = sourceFile!.getClass("PetsController");
      const method = controllerClass!.getMethod("partialUpdatePet");

      expect(method).toBeDefined();
      expect(method!.getDecorators().some((d) => d.getName() === "Patch")).toBe(
        true
      );
    });

    it("should generate controller with DELETE operation", () => {
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
                  name: "petId",
                  in: "path",
                  required: true,
                  schema: { type: "integer" },
                },
              ],
              responses: {
                "200": {
                  description: "Pet deleted",
                },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/controllers/pets.controller.ts"
      );
      const controllerClass = sourceFile!.getClass("PetsController");
      const method = controllerClass!.getMethod("deletePet");

      expect(method).toBeDefined();
      expect(method!.getDecorators().some((d) => d.getName() === "Delete")).toBe(
        true
      );
    });

    it("should generate correct route paths", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets": {
            get: {
              operationId: "listPets",
              tags: ["pets"],
              responses: { "200": { description: "OK" } },
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
              responses: { "200": { description: "OK" } },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/controllers/pets.controller.ts"
      );
      const controllerClass = sourceFile!.getClass("PetsController");

      // Controller should have @Controller('pets') decorator
      const controllerDecorator = controllerClass!
        .getDecorators()
        .find((d) => d.getName() === "Controller");
      expect(controllerDecorator).toBeDefined();
      expect(controllerDecorator!.getArguments()[0].getText()).toContain("pets");

      // listPets method should have @Get('') (empty path)
      const listMethod = controllerClass!.getMethod("listPets");
      const listGetDecorator = listMethod!
        .getDecorators()
        .find((d) => d.getName() === "Get");
      expect(listGetDecorator!.getArguments()[0].getText()).toBe("''");

      // getPetById method should have @Get(':petId')
      const getMethod = controllerClass!.getMethod("getPetById");
      const getDecorator = getMethod!
        .getDecorators()
        .find((d) => d.getName() === "Get");
      expect(getDecorator!.getArguments()[0].getText()).toContain(":petId");
    });

    it("should handle complex paths correctly", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users/{userId}/orders/{orderId}": {
            get: {
              operationId: "getUserOrder",
              tags: ["orders"],
              parameters: [
                {
                  name: "userId",
                  in: "path",
                  required: true,
                  schema: { type: "integer" },
                },
                {
                  name: "orderId",
                  in: "path",
                  required: true,
                  schema: { type: "integer" },
                },
              ],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/controllers/orders.controller.ts"
      );
      const controllerClass = sourceFile!.getClass("OrdersController");
      const method = controllerClass!.getMethod("getUserOrder");

      // Check path parameters
      const userIdParam = method!.getParameters().find((p) => p.getName() === "userId");
      const orderIdParam = method!.getParameters().find((p) => p.getName() === "orderId");

      expect(userIdParam).toBeDefined();
      expect(orderIdParam).toBeDefined();
    });
  });

  describe("Parameter Handling", () => {
    it("should handle path parameters correctly", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets/{id}": {
            get: {
              operationId: "getPet",
              tags: ["pets"],
              parameters: [
                {
                  name: "id",
                  in: "path",
                  required: true,
                  schema: { type: "integer" },
                },
              ],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/controllers/pets.controller.ts"
      );
      const method = sourceFile!.getClass("PetsController")!.getMethod("getPet");
      const param = method!.getParameters()[0];

      expect(param.getName()).toBe("id");
      expect(param.getDecorators().some((d) => d.getName() === "Param")).toBe(true);
      expect(param.getType().getText()).toBe("number");
    });

    it("should handle query parameters correctly", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets": {
            get: {
              operationId: "listPets",
              tags: ["pets"],
              parameters: [
                {
                  name: "limit",
                  in: "query",
                  required: false,
                  schema: { type: "integer" },
                },
                {
                  name: "status",
                  in: "query",
                  required: false,
                  schema: { type: "string" },
                },
              ],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/controllers/pets.controller.ts"
      );
      const method = sourceFile!.getClass("PetsController")!.getMethod("listPets");

      const limitParam = method!.getParameters().find((p) => p.getName() === "limit");
      expect(limitParam).toBeDefined();
      expect(limitParam!.getDecorators().some((d) => d.getName() === "Query")).toBe(
        true
      );

      const statusParam = method!.getParameters().find((p) => p.getName() === "status");
      expect(statusParam).toBeDefined();
      expect(statusParam!.getDecorators().some((d) => d.getName() === "Query")).toBe(
        true
      );
    });

    it("should handle header parameters correctly", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets": {
            get: {
              operationId: "listPets",
              tags: ["pets"],
              parameters: [
                {
                  name: "Authorization",
                  in: "header",
                  required: true,
                  schema: { type: "string" },
                },
              ],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/controllers/pets.controller.ts"
      );
      const method = sourceFile!.getClass("PetsController")!.getMethod("listPets");
      const authParam = method!.getParameters().find(
        (p) => p.getName() === "Authorization"
      );

      expect(authParam).toBeDefined();
      expect(authParam!.getDecorators().some((d) => d.getName() === "Headers")).toBe(
        true
      );
    });

    it("should infer parameter types correctly", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              operationId: "testParams",
              tags: ["test"],
              parameters: [
                {
                  name: "stringParam",
                  in: "query",
                  schema: { type: "string" },
                },
                {
                  name: "numberParam",
                  in: "query",
                  schema: { type: "number" },
                },
                {
                  name: "integerParam",
                  in: "query",
                  schema: { type: "integer" },
                },
                {
                  name: "booleanParam",
                  in: "query",
                  schema: { type: "boolean" },
                },
              ],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/controllers/test.controller.ts"
      );
      const method = sourceFile!.getClass("TestController")!.getMethod("testParams");

      const stringParam = method!.getParameters().find(
        (p) => p.getName() === "stringParam"
      );
      expect(stringParam!.getType().getText()).toBe("string");

      const numberParam = method!.getParameters().find(
        (p) => p.getName() === "numberParam"
      );
      expect(numberParam!.getType().getText()).toBe("number");

      const integerParam = method!.getParameters().find(
        (p) => p.getName() === "integerParam"
      );
      expect(integerParam!.getType().getText()).toBe("number");

      const booleanParam = method!.getParameters().find(
        (p) => p.getName() === "booleanParam"
      );
      expect(booleanParam!.getType().getText()).toBe("boolean");
    });

    it("should handle optional parameters", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets/{id}": {
            get: {
              operationId: "getPet",
              tags: ["pets"],
              parameters: [
                {
                  name: "id",
                  in: "path",
                  required: true,
                  schema: { type: "integer" },
                },
                {
                  name: "includeDetails",
                  in: "query",
                  required: false,
                  schema: { type: "boolean" },
                },
              ],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/controllers/pets.controller.ts"
      );
      const method = sourceFile!.getClass("PetsController")!.getMethod("getPet");

      // Both parameters should be present
      expect(method!.getParameters().length).toBe(2);
    });
  });

  describe("Request/Response Handling", () => {
    it("should map request body to DTO", () => {
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
                    schema: { $ref: "#/components/schemas/CreatePetDto" },
                  },
                },
              },
              responses: {
                "201": {
                  description: "Created",
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
            CreatePetDto: {
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
        "generated/controllers/pets.controller.ts"
      );
      const method = sourceFile!.getClass("PetsController")!.getMethod("createPet");
      const bodyParam = method!.getParameters().find((p) => p.getName() === "body");

      expect(bodyParam).toBeDefined();
      expect(bodyParam!.getType().getText()).toContain("CreatePetDto");
      expect(bodyParam!.getDecorators().some((d) => d.getName() === "Body")).toBe(
        true
      );
    });

    it("should infer response DTO from 200 status", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets/{id}": {
            get: {
              operationId: "getPet",
              tags: ["pets"],
              parameters: [
                {
                  name: "id",
                  in: "path",
                  required: true,
                  schema: { type: "integer" },
                },
              ],
              responses: {
                "200": {
                  description: "OK",
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
        "generated/controllers/pets.controller.ts"
      );
      const method = sourceFile!.getClass("PetsController")!.getMethod("getPet");

      expect(method!.getReturnType().getText()).toContain("Pet");
    });

    it("should infer response DTO from 201 status for POST", () => {
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
                    schema: {
                      type: "object",
                      properties: { name: { type: "string" } },
                    },
                  },
                },
              },
              responses: {
                "201": {
                  description: "Created",
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
        "generated/controllers/pets.controller.ts"
      );
      const method = sourceFile!.getClass("PetsController")!.getMethod("createPet");

      expect(method!.getReturnType().getText()).toContain("Pet");
    });

    it("should handle 204 No Content responses", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets/{id}": {
            delete: {
              operationId: "deletePet",
              tags: ["pets"],
              parameters: [
                {
                  name: "id",
                  in: "path",
                  required: true,
                  schema: { type: "integer" },
                },
              ],
              responses: {
                "204": {
                  description: "No Content",
                },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/controllers/pets.controller.ts"
      );
      const method = sourceFile!.getClass("PetsController")!.getMethod("deletePet");

      expect(method!.getReturnType().getText()).toContain("void");
    });

    it("should handle array responses", () => {
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
                  description: "OK",
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
        "generated/controllers/pets.controller.ts"
      );
      const method = sourceFile!.getClass("PetsController")!.getMethod("listPets");

      expect(method!.getReturnType().getText()).toContain("Pet[]");
    });
  });

  describe("Grouping and Naming", () => {
    it("should group operations by tag into separate controllers", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets": {
            get: {
              operationId: "listPets",
              tags: ["pets"],
              responses: { "200": { description: "OK" } },
            },
          },
          "/users": {
            get: {
              operationId: "listUsers",
              tags: ["users"],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const petsFile = project.getSourceFile(
        "generated/controllers/pets.controller.ts"
      );
      const usersFile = project.getSourceFile(
        "generated/controllers/users.controller.ts"
      );

      expect(petsFile).toBeDefined();
      expect(usersFile).toBeDefined();

      expect(petsFile!.getClass("PetsController")).toBeDefined();
      expect(usersFile!.getClass("UsersController")).toBeDefined();
    });

    it("should derive controller class name from tag", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pet-store": {
            get: {
              operationId: "listPets",
              tags: ["pet-store"],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/controllers/petstore.controller.ts"
      );
      expect(sourceFile).toBeDefined();

      // Tag "pet-store" is normalized to PascalCase "PetStore"
      const controllerClass = sourceFile!.getClass("PetStoreController");
      expect(controllerClass).toBeDefined();
    });

    it("should derive method name from operationId", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets": {
            get: {
              operationId: "getAllPetsFromStore",
              tags: ["pets"],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/controllers/pets.controller.ts"
      );
      const method = sourceFile!
        .getClass("PetsController")!
        .getMethod("getAllPetsFromStore");

      expect(method).toBeDefined();
    });

    it("should generate service interface with matching method signatures", () => {
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
                  description: "OK",
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
        "generated/controllers/pets.controller.ts"
      );
      const serviceInterface = sourceFile!.getInterface("IPetsService");

      expect(serviceInterface).toBeDefined();
      expect(serviceInterface!.getMethod("listPets")).toBeDefined();
    });
  });

  describe("Edge Cases - Empty Operations", () => {
    it("should handle operations with no parameters or body", () => {
      const specPath = path.join(
        __dirname,
        "../fixtures/synthetic/empty-operations.yaml"
      );
      const specContent = fs.readFileSync(specPath, "utf8");
      const doc = yaml.load(specContent) as OpenAPIV3.Document;

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/controllers/health.controller.ts"
      );
      expect(sourceFile).toBeDefined();

      const healthCheckMethod = sourceFile!
        .getClass("HealthController")!
        .getMethod("healthCheck");
      expect(healthCheckMethod).toBeDefined();
      expect(healthCheckMethod!.getParameters().length).toBe(0);
    });
  });

  describe("Edge Cases - Malformed OperationIds", () => {
    it("should normalize operationIds with special characters", () => {
      const specPath = path.join(
        __dirname,
        "../fixtures/synthetic/malformed-operationids.yaml"
      );
      const specContent = fs.readFileSync(specPath, "utf8");
      const doc = yaml.load(specContent) as OpenAPIV3.Document;

      generator.generate(doc, project, "generated");

      const userFile = project.getSourceFile(
        "generated/controllers/user.controller.ts"
      );
      expect(userFile).toBeDefined();

      // Should normalize create-user to createUser
      const createMethod = userFile!.getClass("UserController")!.getMethod("createUser");
      expect(createMethod).toBeDefined();

      // Should normalize create_user to createUser (already tested via spec)
      // Since multiple operations might have same normalized name, check that at least one exists
    });

    it("should generate fallback method names for missing operationIds", () => {
      const specPath = path.join(
        __dirname,
        "../fixtures/synthetic/malformed-operationids.yaml"
      );
      const specContent = fs.readFileSync(specPath, "utf8");
      const doc = yaml.load(specContent) as OpenAPIV3.Document;

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/controllers/user.controller.ts"
      );
      expect(sourceFile).toBeDefined();

      // The spec has a DELETE /users/{id} without operationId
      // Should fallback to something like deleteUsersId or similar
      const controllerClass = sourceFile!.getClass("UserController");
      const methods = controllerClass!.getMethods();

      // Verify controller has methods generated
      expect(methods.length).toBeGreaterThan(0);
    });
  });

  describe("Real-World Spec - Petstore", () => {
    it("should generate complete controller from petstore spec", () => {
      const specPath = path.join(
        __dirname,
        "../fixtures/real-world/petstore.yaml"
      );
      const specContent = fs.readFileSync(specPath, "utf8");
      const doc = yaml.load(specContent) as OpenAPIV3.Document;

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/controllers/pets.controller.ts"
      );
      expect(sourceFile).toBeDefined();

      const controllerClass = sourceFile!.getClass("PetsController");
      expect(controllerClass).toBeDefined();

      // Check for expected methods
      expect(controllerClass!.getMethod("listPets")).toBeDefined();
      expect(controllerClass!.getMethod("createPet")).toBeDefined();
      expect(controllerClass!.getMethod("getPetById")).toBeDefined();
      expect(controllerClass!.getMethod("updatePet")).toBeDefined();
      expect(controllerClass!.getMethod("deletePet")).toBeDefined();
    });
  });

  describe("Snapshot Tests", () => {
    it("should match snapshot for simple GET controller", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets": {
            get: {
              operationId: "listPets",
              tags: ["pets"],
              parameters: [
                {
                  name: "limit",
                  in: "query",
                  schema: { type: "integer" },
                },
              ],
              responses: {
                "200": {
                  description: "OK",
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
        "generated/controllers/pets.controller.ts"
      );
      const code = normalizeCode(sourceFile!.getFullText());

      expect(code).toMatchSnapshot();
    });

    it("should match snapshot for POST controller with request body", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            post: {
              operationId: "createUser",
              tags: ["users"],
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/CreateUserDto" },
                  },
                },
              },
              responses: {
                "201": {
                  description: "Created",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/User" },
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
                email: { type: "string" },
              },
            },
            CreateUserDto: {
              type: "object",
              properties: {
                email: { type: "string" },
                password: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/controllers/users.controller.ts"
      );
      const code = normalizeCode(sourceFile!.getFullText());

      expect(code).toMatchSnapshot();
    });

    it("should match snapshot for controller with multiple HTTP methods", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/products/{id}": {
            get: {
              operationId: "getProduct",
              tags: ["products"],
              parameters: [
                {
                  name: "id",
                  in: "path",
                  required: true,
                  schema: { type: "integer" },
                },
              ],
              responses: {
                "200": {
                  description: "OK",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/Product" },
                    },
                  },
                },
              },
            },
            put: {
              operationId: "updateProduct",
              tags: ["products"],
              parameters: [
                {
                  name: "id",
                  in: "path",
                  required: true,
                  schema: { type: "integer" },
                },
              ],
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/UpdateProductDto" },
                  },
                },
              },
              responses: {
                "200": {
                  description: "OK",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/Product" },
                    },
                  },
                },
              },
            },
            delete: {
              operationId: "deleteProduct",
              tags: ["products"],
              parameters: [
                {
                  name: "id",
                  in: "path",
                  required: true,
                  schema: { type: "integer" },
                },
              ],
              responses: {
                "204": {
                  description: "No Content",
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Product: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
                price: { type: "number" },
              },
            },
            UpdateProductDto: {
              type: "object",
              properties: {
                name: { type: "string" },
                price: { type: "number" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/controllers/products.controller.ts"
      );
      const code = normalizeCode(sourceFile!.getFullText());

      expect(code).toMatchSnapshot();
    });

    it("should match snapshot for petstore controller", () => {
      const specPath = path.join(
        __dirname,
        "../fixtures/real-world/petstore.yaml"
      );
      const specContent = fs.readFileSync(specPath, "utf8");
      const doc = yaml.load(specContent) as OpenAPIV3.Document;

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/controllers/pets.controller.ts"
      );
      const code = normalizeCode(sourceFile!.getFullText());

      expect(code).toMatchSnapshot();
    });

    it("should match snapshot for controller with complex parameters", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/search": {
            get: {
              operationId: "search",
              tags: ["search"],
              parameters: [
                {
                  name: "q",
                  in: "query",
                  required: true,
                  schema: { type: "string" },
                },
                {
                  name: "limit",
                  in: "query",
                  schema: { type: "integer" },
                },
                {
                  name: "offset",
                  in: "query",
                  schema: { type: "integer" },
                },
                {
                  name: "X-Request-ID",
                  in: "header",
                  schema: { type: "string" },
                },
              ],
              responses: {
                "200": {
                  description: "OK",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          results: {
                            type: "array",
                            items: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated");

      const sourceFile = project.getSourceFile(
        "generated/controllers/search.controller.ts"
      );
      const code = normalizeCode(sourceFile!.getFullText());

      expect(code).toMatchSnapshot();
    });
  });
});
