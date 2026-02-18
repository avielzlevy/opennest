import { Project } from "ts-morph";
import { DecoratorGenerator } from "../../src/generators/decorator.generator";
import { OpenAPIV3 } from "openapi-types";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

describe("DecoratorGenerator", () => {
  let project: Project;
  let generator: DecoratorGenerator;

  beforeEach(() => {
    // Initialize an in-memory project (no physical files created)
    project = new Project({ useInMemoryFileSystem: true });
    generator = new DecoratorGenerator();
  });

  describe("Basic Decorator Generation", () => {
    it("should generate decorator function with ApiOperation", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets": {
            get: {
              operationId: "listPets",
              summary: "List all pets",
              description: "Retrieve a paginated list of pets",
              tags: ["pets"],
              responses: {
                "200": {
                  description: "Success",
                },
              },
            },
          },
        },
      };

      generator.generate(doc, project);

      const sourceFile = project.getSourceFile(
        "generated/decorators/pets.decorator.ts",
      );
      expect(sourceFile).toBeDefined();

      const functionDecl = sourceFile?.getFunction("ListPetsEndpoint");
      expect(functionDecl).toBeDefined();
      expect(functionDecl?.isExported()).toBe(true);

      const bodyText = functionDecl?.getBodyText() || "";
      expect(bodyText).toContain("ApiOperation");
      expect(bodyText).toContain("List all pets");
      expect(bodyText).toContain("Retrieve a paginated list of pets");
    });

    it("should handle operations without operationId using fallback", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/status": {
            get: {
              summary: "Get status",
              tags: ["health"],
              responses: {
                "200": {
                  description: "Success",
                },
              },
            },
          },
        },
      };

      generator.generate(doc, project);

      const sourceFile = project.getSourceFile(
        "generated/decorators/health.decorator.ts",
      );
      expect(sourceFile).toBeDefined();

      // Should fallback to method + tag name (capitalize method + resourceName)
      const functionDecl = sourceFile?.getFunction("GethealthEndpoint");
      expect(functionDecl).toBeDefined();
    });

    it("should handle empty summary and description gracefully", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/ping": {
            get: {
              operationId: "ping",
              tags: ["health"],
              responses: {
                "200": {
                  description: "Pong",
                },
              },
            },
          },
        },
      };

      generator.generate(doc, project);

      const sourceFile = project.getSourceFile(
        "generated/decorators/health.decorator.ts",
      );
      expect(sourceFile).toBeDefined();

      const functionDecl = sourceFile?.getFunction("PingEndpoint");
      const bodyText = functionDecl?.getBodyText() || "";

      // Should still have ApiOperation with empty strings (JSON.stringify format)
      expect(bodyText).toContain("ApiOperation");
      expect(bodyText).toContain('"summary":""');
      expect(bodyText).toContain('"description":""');
    });
  });

  describe("Parameter Decorators", () => {
    it("should generate ApiParam for path parameters", () => {
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
                  schema: {
                    type: "integer",
                    format: "int64",
                  },
                  description: "The id of the pet to retrieve",
                },
              ],
              responses: {
                "200": {
                  description: "Success",
                },
              },
            },
          },
        },
      };

      generator.generate(doc, project);

      const sourceFile = project.getSourceFile(
        "generated/decorators/pets.decorator.ts",
      );
      const functionDecl = sourceFile?.getFunction("GetPetByIdEndpoint");
      const bodyText = functionDecl?.getBodyText() || "";

      expect(bodyText).toContain("ApiParam");
      expect(bodyText).toContain("name: 'petId'");
      expect(bodyText).toContain("type: Number");

      // Should import ApiParam
      const imports = sourceFile?.getImportDeclaration(
        (d) => d.getModuleSpecifierValue() === "@nestjs/swagger",
      );
      expect(
        imports?.getNamedImports().some((i) => i.getName() === "ApiParam"),
      ).toBe(true);
    });

    it("should generate ApiQuery for query parameters with required flag", () => {
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
                  schema: {
                    type: "integer",
                  },
                  description: "How many items to return",
                },
                {
                  name: "status",
                  in: "query",
                  required: true,
                  schema: {
                    type: "string",
                  },
                },
              ],
              responses: {
                "200": {
                  description: "Success",
                },
              },
            },
          },
        },
      };

      generator.generate(doc, project);

      const sourceFile = project.getSourceFile(
        "generated/decorators/pets.decorator.ts",
      );
      const functionDecl = sourceFile?.getFunction("ListPetsEndpoint");
      const bodyText = functionDecl?.getBodyText() || "";

      expect(bodyText).toContain("ApiQuery");
      expect(bodyText).toContain("name: 'limit'");
      expect(bodyText).toContain("required: false");
      expect(bodyText).toContain("type: Number");
      expect(bodyText).toContain("name: 'status'");
      expect(bodyText).toContain("required: true");
      expect(bodyText).toContain("type: String");
    });

    it("should map parameter schema types correctly (string, integer, number)", () => {
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
                  name: "intParam",
                  in: "query",
                  schema: { type: "integer" },
                },
                {
                  name: "numberParam",
                  in: "query",
                  schema: { type: "number" },
                },
              ],
              responses: {
                "200": {
                  description: "Success",
                },
              },
            },
          },
        },
      };

      generator.generate(doc, project);

      const sourceFile = project.getSourceFile(
        "generated/decorators/test.decorator.ts",
      );
      const functionDecl = sourceFile?.getFunction("TestParamsEndpoint");
      const bodyText = functionDecl?.getBodyText() || "";

      expect(bodyText).toContain("name: 'stringParam'");
      expect(bodyText).toMatch(/name: 'stringParam'[^}]+type: String/s);
      expect(bodyText).toContain("name: 'intParam'");
      expect(bodyText).toMatch(/name: 'intParam'[^}]+type: Number/s);
      expect(bodyText).toContain("name: 'numberParam'");
      expect(bodyText).toMatch(/name: 'numberParam'[^}]+type: Number/s);
    });

    it("should handle operations with no parameters", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/health": {
            get: {
              operationId: "healthCheck",
              tags: ["health"],
              responses: {
                "200": {
                  description: "Success",
                },
              },
            },
          },
        },
      };

      generator.generate(doc, project);

      const sourceFile = project.getSourceFile(
        "generated/decorators/health.decorator.ts",
      );
      const functionDecl = sourceFile?.getFunction("HealthCheckEndpoint");
      const bodyText = functionDecl?.getBodyText() || "";

      // Should not have ApiQuery or ApiParam
      expect(bodyText).not.toContain("ApiQuery");
      expect(bodyText).not.toContain("ApiParam");
      expect(bodyText).toContain("ApiOperation");
      expect(bodyText).toContain("ApiResponse");
    });
  });

  describe("Request Body Decorators", () => {
    it("should generate ApiBody with DTO import for request body", () => {
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
                      $ref: "#/components/schemas/NewPet",
                    },
                  },
                },
              },
              responses: {
                "201": {
                  description: "Created",
                },
              },
            },
          },
        },
        components: {
          schemas: {
            NewPet: {
              type: "object",
              properties: {
                name: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project);

      const sourceFile = project.getSourceFile(
        "generated/decorators/pets.decorator.ts",
      );
      const functionDecl = sourceFile?.getFunction("CreatePetEndpoint");
      const bodyText = functionDecl?.getBodyText() || "";

      expect(bodyText).toContain("ApiBody");
      expect(bodyText).toContain("type: NewPet");

      // Should import NewPet DTO
      const dtoImport = sourceFile?.getImportDeclaration(
        (d) => d.getModuleSpecifierValue() === "../dtos/NewPet.dto",
      );
      expect(dtoImport).toBeDefined();
      expect(
        dtoImport?.getNamedImports().some((i) => i.getName() === "NewPet"),
      ).toBe(true);

      // Should import ApiBody from @nestjs/swagger
      const swaggerImport = sourceFile?.getImportDeclaration(
        (d) => d.getModuleSpecifierValue() === "@nestjs/swagger",
      );
      expect(
        swaggerImport?.getNamedImports().some((i) => i.getName() === "ApiBody"),
      ).toBe(true);
    });

    it("should handle operations without request body", () => {
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
                  description: "Success",
                },
              },
            },
          },
        },
      };

      generator.generate(doc, project);

      const sourceFile = project.getSourceFile(
        "generated/decorators/pets.decorator.ts",
      );
      const functionDecl = sourceFile?.getFunction("ListPetsEndpoint");
      const bodyText = functionDecl?.getBodyText() || "";

      expect(bodyText).not.toContain("ApiBody");
    });
  });

  describe("Response Decorators", () => {
    it("should generate ApiResponse with DTO for successful response", () => {
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
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/Pet",
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

      generator.generate(doc, project);

      const sourceFile = project.getSourceFile(
        "generated/decorators/pets.decorator.ts",
      );
      const functionDecl = sourceFile?.getFunction("GetPetByIdEndpoint");
      const bodyText = functionDecl?.getBodyText() || "";

      expect(bodyText).toContain("ApiResponse");
      expect(bodyText).toContain("status: 200");
      expect(bodyText).toContain("type: Pet");
      expect(bodyText).toContain("isArray: false");

      // Should import Pet DTO
      const dtoImport = sourceFile?.getImportDeclaration(
        (d) => d.getModuleSpecifierValue() === "../dtos/Pet.dto",
      );
      expect(dtoImport).toBeDefined();
    });

    it("should generate ApiResponse with isArray for array responses", () => {
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
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/Pet",
                        },
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
              },
            },
          },
        },
      };

      generator.generate(doc, project);

      const sourceFile = project.getSourceFile(
        "generated/decorators/pets.decorator.ts",
      );
      const functionDecl = sourceFile?.getFunction("ListPetsEndpoint");
      const bodyText = functionDecl?.getBodyText() || "";

      expect(bodyText).toContain("ApiResponse");
      expect(bodyText).toContain("type: Pet");
      expect(bodyText).toContain("isArray: true");
    });

    it("should handle void responses without DTO", () => {
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
                "204": {
                  description: "No Content",
                },
              },
            },
          },
        },
      };

      generator.generate(doc, project);

      const sourceFile = project.getSourceFile(
        "generated/decorators/pets.decorator.ts",
      );
      const functionDecl = sourceFile?.getFunction("DeletePetEndpoint");
      const bodyText = functionDecl?.getBodyText() || "";

      expect(bodyText).toContain("ApiResponse");
      expect(bodyText).toContain("status: 204");
      expect(bodyText).toContain("description: 'No Content'");
      // Should not have DTO type for void responses
      expect(bodyText).not.toContain("isArray");
    });
  });

  describe("Security Decorators", () => {
    it("should generate JwtDecorator for Bearer auth", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/protected": {
            get: {
              operationId: "getProtected",
              tags: ["secure"],
              security: [{ BearerAuth: [] }],
              responses: {
                "200": {
                  description: "Success",
                },
              },
            },
          },
        },
        components: {
          securitySchemes: {
            BearerAuth: {
              type: "http",
              scheme: "bearer",
            },
          },
        },
      };

      generator.generate(doc, project);

      const sourceFile = project.getSourceFile(
        "generated/decorators/secure.decorator.ts",
      );
      const functionDecl = sourceFile?.getFunction("GetProtectedEndpoint");
      const bodyText = functionDecl?.getBodyText() || "";

      expect(bodyText).toContain("JwtDecorator()");

      // Should import JwtDecorator
      const jwtImport = sourceFile?.getImportDeclaration(
        (d) =>
          d.getModuleSpecifierValue() ===
          "../common/decorators/auth/jwt.decorator",
      );
      expect(jwtImport).toBeDefined();
    });

    it("should generate ApiKeyDecorator for API key auth", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/api-protected": {
            get: {
              operationId: "getApiProtected",
              tags: ["secure"],
              security: [{ ApiKey: [] }],
              responses: {
                "200": {
                  description: "Success",
                },
              },
            },
          },
        },
        components: {
          securitySchemes: {
            ApiKey: {
              type: "apiKey",
              in: "header",
              name: "X-API-Key",
            },
          },
        },
      };

      generator.generate(doc, project);

      const sourceFile = project.getSourceFile(
        "generated/decorators/secure.decorator.ts",
      );
      const functionDecl = sourceFile?.getFunction("GetApiProtectedEndpoint");
      const bodyText = functionDecl?.getBodyText() || "";

      expect(bodyText).toContain("ApiKeyDecorator()");

      // Should import ApiKeyDecorator
      const apiKeyImport = sourceFile?.getImportDeclaration(
        (d) =>
          d.getModuleSpecifierValue() ===
          "../common/decorators/auth/apiKey.decorator",
      );
      expect(apiKeyImport).toBeDefined();
    });

    it("should handle operations without security", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/public": {
            get: {
              operationId: "getPublic",
              tags: ["public"],
              responses: {
                "200": {
                  description: "Success",
                },
              },
            },
          },
        },
      };

      generator.generate(doc, project);

      const sourceFile = project.getSourceFile(
        "generated/decorators/public.decorator.ts",
      );
      const functionDecl = sourceFile?.getFunction("GetPublicEndpoint");
      const bodyText = functionDecl?.getBodyText() || "";

      expect(bodyText).not.toContain("JwtDecorator");
      expect(bodyText).not.toContain("ApiKeyDecorator");
    });
  });

  describe("Real-World Fixtures", () => {
    it("should handle Petstore API fixture", () => {
      const fixtureContent = fs.readFileSync(
        path.join(__dirname, "../fixtures/real-world/petstore.yaml"),
        "utf-8",
      );
      const doc = yaml.load(fixtureContent) as OpenAPIV3.Document;

      generator.generate(doc, project);

      // Should generate pets.decorator.ts
      const sourceFile = project.getSourceFile(
        "generated/decorators/pets.decorator.ts",
      );
      expect(sourceFile).toBeDefined();

      // Should have multiple endpoint functions
      expect(sourceFile?.getFunction("ListPetsEndpoint")).toBeDefined();
      expect(sourceFile?.getFunction("CreatePetEndpoint")).toBeDefined();
      expect(sourceFile?.getFunction("GetPetByIdEndpoint")).toBeDefined();
      expect(sourceFile?.getFunction("UpdatePetEndpoint")).toBeDefined();
      expect(sourceFile?.getFunction("DeletePetEndpoint")).toBeDefined();

      // Snapshot the entire file
      expect(sourceFile?.getFullText()).toMatchSnapshot("petstore-decorators");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty operations fixture", () => {
      const fixtureContent = fs.readFileSync(
        path.join(__dirname, "../fixtures/synthetic/empty-operations.yaml"),
        "utf-8",
      );
      const doc = yaml.load(fixtureContent) as OpenAPIV3.Document;

      generator.generate(doc, project);

      const sourceFile = project.getSourceFile(
        "generated/decorators/health.decorator.ts",
      );
      expect(sourceFile).toBeDefined();

      // Should handle operations with no request/response bodies
      // Note: HEAD operations are not supported by HTTP_METHODS, so only POST and GET are generated
      expect(sourceFile?.getFunction("HealthCheckEndpoint")).toBeDefined();
      expect(sourceFile?.getFunction("GetStatusEndpoint")).toBeDefined();

      // HEAD method is not in HTTP_METHODS array, so PingEndpoint won't be generated
      const functions =
        sourceFile?.getFunctions().map((f) => f.getName()) || [];
      expect(functions).toHaveLength(2);
    });

    it("should handle malformed operationIds fixture", () => {
      const fixtureContent = fs.readFileSync(
        path.join(
          __dirname,
          "../fixtures/synthetic/malformed-operationids.yaml",
        ),
        "utf-8",
      );
      const doc = yaml.load(fixtureContent) as OpenAPIV3.Document;

      // Should not throw
      expect(() => generator.generate(doc, project)).not.toThrow();

      const userFile = project.getSourceFile(
        "generated/decorators/user.decorator.ts",
      );
      const specialFile = project.getSourceFile(
        "generated/decorators/special.decorator.ts",
      );

      expect(userFile).toBeDefined();
      expect(specialFile).toBeDefined();

      // Should normalize operationId formats
      expect(userFile?.getFunctions().length).toBeGreaterThan(0);
    });
  });

  describe("Import Organization", () => {
    it("should organize imports correctly", () => {
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
                      $ref: "#/components/schemas/NewPet",
                    },
                  },
                },
              },
              responses: {
                "201": {
                  description: "Created",
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/Pet",
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
            NewPet: {
              type: "object",
              properties: { name: { type: "string" } },
            },
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

      generator.generate(doc, project);

      const sourceFile = project.getSourceFile(
        "generated/decorators/pets.decorator.ts",
      );
      const fullText = sourceFile?.getFullText() || "";

      // Imports should be organized (NestJS imports first, then DTOs)
      const importStatements = fullText.match(/^import .+;$/gm) || [];
      expect(importStatements.length).toBeGreaterThan(0);

      // Should have common imports
      expect(fullText).toContain(
        'import { applyDecorators } from "@nestjs/common"',
      );
      expect(fullText).toContain('from "@nestjs/swagger"');
    });

    it("should only import needed Swagger decorators", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/simple": {
            get: {
              operationId: "simpleGet",
              tags: ["simple"],
              responses: {
                "200": {
                  description: "Success",
                },
              },
            },
          },
        },
      };

      generator.generate(doc, project);

      const sourceFile = project.getSourceFile(
        "generated/decorators/simple.decorator.ts",
      );
      const swaggerImport = sourceFile?.getImportDeclaration(
        (d) => d.getModuleSpecifierValue() === "@nestjs/swagger",
      );

      const namedImports =
        swaggerImport?.getNamedImports().map((i) => i.getName()) || [];

      // Should only have ApiOperation and ApiResponse (not ApiBody, ApiQuery, ApiParam)
      expect(namedImports).toContain("ApiOperation");
      expect(namedImports).toContain("ApiResponse");
      expect(namedImports).not.toContain("ApiBody");
      expect(namedImports).not.toContain("ApiQuery");
      expect(namedImports).not.toContain("ApiParam");
    });
  });

  describe("Complete Snapshot Tests", () => {
    it("should generate correct decorator structure (snapshot)", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Complete Test", version: "1.0.0" },
        paths: {
          "/users/{userId}": {
            put: {
              operationId: "updateUser",
              summary: "Update a user",
              description: "Update user details by ID",
              tags: ["users"],
              security: [{ BearerAuth: [] }],
              parameters: [
                {
                  name: "userId",
                  in: "path",
                  required: true,
                  schema: { type: "integer" },
                  description: "User ID",
                },
                {
                  name: "includeProfile",
                  in: "query",
                  required: false,
                  schema: { type: "string" },
                },
              ],
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/UpdateUserDto",
                    },
                  },
                },
              },
              responses: {
                "200": {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/User",
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
            UpdateUserDto: {
              type: "object",
              properties: { name: { type: "string" } },
            },
            User: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
              },
            },
          },
          securitySchemes: {
            BearerAuth: {
              type: "http",
              scheme: "bearer",
            },
          },
        },
      };

      generator.generate(doc, project);

      const sourceFile = project.getSourceFile(
        "generated/decorators/users.decorator.ts",
      );
      expect(sourceFile?.getFullText()).toMatchSnapshot(
        "complete-decorator-example",
      );
    });
  });

  describe("DecoratorGenerator - Domain-based Structure", () => {
    const domainConfig = { structure: "domain-based" as const };

    it("should generate decorator in domain-specific directory", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/pets": {
            get: {
              operationId: "listPets",
              summary: "List all pets",
              tags: ["pets"],
              responses: {
                "200": { description: "Success" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated", domainConfig);

      const sourceFile = project.getSourceFile(
        "generated/pets/decorators/pets.decorator.ts",
      );
      expect(sourceFile).toBeDefined();

      const functionDecl = sourceFile?.getFunction("ListPetsEndpoint");
      expect(functionDecl).toBeDefined();
      expect(functionDecl?.isExported()).toBe(true);
    });

    it("should separate different domains into different directories", () => {
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
          "/stores": {
            get: {
              operationId: "listStores",
              tags: ["stores"],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      };

      generator.generate(doc, project, "generated", domainConfig);

      const petsFile = project.getSourceFile(
        "generated/pets/decorators/pets.decorator.ts",
      );
      const usersFile = project.getSourceFile(
        "generated/users/decorators/users.decorator.ts",
      );
      const storesFile = project.getSourceFile(
        "generated/stores/decorators/stores.decorator.ts",
      );

      expect(petsFile).toBeDefined();
      expect(usersFile).toBeDefined();
      expect(storesFile).toBeDefined();
    });

    it("should generate identical code to type-based structure", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/products": {
            get: {
              operationId: "listProducts",
              summary: "List all products",
              tags: ["products"],
              responses: {
                "200": { description: "OK" },
              },
            },
          },
        },
      };

      // Generate with type-based structure
      const typeProject = new Project({ useInMemoryFileSystem: true });
      const typeGenerator = new DecoratorGenerator();
      typeGenerator.generate(doc, typeProject, "generated");
      const typeFile = typeProject.getSourceFile(
        "generated/decorators/products.decorator.ts",
      );
      const typeCode = typeFile!.getFullText();

      // Generate with domain-based structure
      const domainProject = new Project({ useInMemoryFileSystem: true });
      const domainGenerator = new DecoratorGenerator();
      domainGenerator.generate(doc, domainProject, "generated", domainConfig);
      const domainFile = domainProject.getSourceFile(
        "generated/products/decorators/products.decorator.ts",
      );
      const domainCode = domainFile!.getFullText();

      // Code should be identical
      expect(typeCode).toBe(domainCode);
    });

    it("should handle parameters in domain-based structure", () => {
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
                  description: "The pet ID",
                },
              ],
              responses: {
                "200": { description: "Success" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated", domainConfig);

      const sourceFile = project.getSourceFile(
        "generated/pets/decorators/pets.decorator.ts",
      );
      const functionDecl = sourceFile?.getFunction("GetPetByIdEndpoint");
      const bodyText = functionDecl?.getBodyText() || "";

      expect(bodyText).toContain("ApiParam");
      expect(bodyText).toContain("name: 'petId'");
      expect(bodyText).toContain("type: Number");
    });

    it("should handle query parameters in domain-based structure", () => {
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
                  required: true,
                  schema: { type: "string" },
                },
              ],
              responses: {
                "200": { description: "Success" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated", domainConfig);

      const sourceFile = project.getSourceFile(
        "generated/pets/decorators/pets.decorator.ts",
      );
      const functionDecl = sourceFile?.getFunction("ListPetsEndpoint");
      const bodyText = functionDecl?.getBodyText() || "";

      expect(bodyText).toContain("ApiQuery");
      expect(bodyText).toContain("name: 'limit'");
      expect(bodyText).toContain("required: false");
      expect(bodyText).toContain("name: 'status'");
      expect(bodyText).toContain("required: true");
    });

    it("should handle request/response bodies in domain-based structure", () => {
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

      generator.generate(doc, project, "generated", domainConfig);

      const sourceFile = project.getSourceFile(
        "generated/pets/decorators/pets.decorator.ts",
      );
      const functionDecl = sourceFile?.getFunction("CreatePetEndpoint");
      const bodyText = functionDecl?.getBodyText() || "";

      expect(bodyText).toContain("ApiBody");
      expect(bodyText).toContain("type: CreatePetDto");
      expect(bodyText).toContain("ApiResponse");
    });

    it("should match snapshot for domain-based simple decorator", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/orders": {
            get: {
              operationId: "listOrders",
              summary: "List all orders",
              description: "Retrieve a paginated list of orders",
              tags: ["orders"],
              parameters: [
                {
                  name: "page",
                  in: "query",
                  schema: { type: "integer" },
                },
              ],
              responses: {
                "200": {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Order" },
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
            Order: {
              type: "object",
              properties: {
                id: { type: "integer" },
                total: { type: "number" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "generated", domainConfig);

      const sourceFile = project.getSourceFile(
        "generated/orders/decorators/orders.decorator.ts",
      );
      expect(sourceFile?.getFullText()).toMatchSnapshot(
        "domain-based-orders-decorator",
      );
    });

    it("should match snapshot for domain-based decorator with auth", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users/me": {
            get: {
              operationId: "getCurrentUser",
              summary: "Get current user",
              tags: ["users"],
              security: [{ BearerAuth: [] }],
              responses: {
                "200": {
                  description: "Success",
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
          },
          securitySchemes: {
            BearerAuth: {
              type: "http",
              scheme: "bearer",
            },
          },
        },
      };

      generator.generate(doc, project, "generated", domainConfig);

      const sourceFile = project.getSourceFile(
        "generated/users/decorators/users.decorator.ts",
      );
      expect(sourceFile?.getFullText()).toMatchSnapshot(
        "domain-based-users-auth-decorator",
      );
    });
  });
});
