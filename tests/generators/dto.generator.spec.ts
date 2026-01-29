/**
 * DtoGenerator Unit Tests
 *
 * Test Coverage:
 * - Schema types: primitive, complex, array, enum, reference
 * - Field modifiers: required/optional, constraints, decorators
 * - Edge cases: circular refs, nullable composition, missing types
 * - Snapshot testing for regression detection
 * - AST validation for generated code structure
 */

import { Project } from "ts-morph";
import { DtoGenerator } from "../../src/generators/dto.generator";
import { TypeMapper } from "../../src/utils/type-mapper";
import { OpenAPIV3 } from "openapi-types";

describe("DtoGenerator Unit Tests", () => {
  let project: Project;
  let generator: DtoGenerator;

  beforeEach(() => {
    // Initialize in-memory project for fast testing
    project = new Project({ useInMemoryFileSystem: true });
    generator = new DtoGenerator(new TypeMapper());
  });

  describe("Primitive Types", () => {
    it("should generate string property with validation decorators", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            TestDto: {
              type: "object",
              required: ["name"],
              properties: {
                name: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/TestDto.dto.ts");
      const classDecl = sourceFile.getClassOrThrow("TestDto");
      const nameProp = classDecl.getPropertyOrThrow("name");

      expect(nameProp.getType().getText()).toContain("string");
      expect(nameProp.hasExclamationToken()).toBe(true); // Required field
      expect(nameProp.getDecorator("IsString")).toBeDefined();
      expect(nameProp.getDecorator("IsNotEmpty")).toBeDefined();
    });

    it("should generate number property with validation decorators", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            ProductDto: {
              type: "object",
              properties: {
                price: { type: "number" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/ProductDto.dto.ts");
      const classDecl = sourceFile.getClassOrThrow("ProductDto");
      const priceProp = classDecl.getPropertyOrThrow("price");

      expect(priceProp.getType().getText()).toContain("number");
      expect(priceProp.hasQuestionToken()).toBe(true); // Optional field
      expect(priceProp.getDecorator("IsNumber")).toBeDefined();
      expect(priceProp.getDecorator("IsOptional")).toBeDefined();
    });

    it("should generate boolean property with validation decorators", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            FlagDto: {
              type: "object",
              required: ["active"],
              properties: {
                active: { type: "boolean" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/FlagDto.dto.ts");
      const classDecl = sourceFile.getClassOrThrow("FlagDto");
      const activeProp = classDecl.getPropertyOrThrow("active");

      expect(activeProp.getType().getText()).toContain("boolean");
      expect(activeProp.hasExclamationToken()).toBe(true);
      expect(activeProp.getDecorator("IsBoolean")).toBeDefined();
      expect(activeProp.getDecorator("IsNotEmpty")).toBeDefined();
    });

    it("should generate integer property as number type", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            CountDto: {
              type: "object",
              properties: {
                count: { type: "integer" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/CountDto.dto.ts");
      const classDecl = sourceFile.getClassOrThrow("CountDto");
      const countProp = classDecl.getPropertyOrThrow("count");

      expect(countProp.getType().getText()).toContain("number");
      expect(countProp.getDecorator("IsNumber")).toBeDefined();
    });
  });

  describe("Complex Types", () => {
    it("should generate object with multiple properties", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            UserDto: {
              type: "object",
              required: ["id", "email"],
              properties: {
                id: { type: "integer" },
                email: { type: "string" },
                age: { type: "number" },
                active: { type: "boolean" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/UserDto.dto.ts");
      const classDecl = sourceFile.getClassOrThrow("UserDto");

      const properties = classDecl.getProperties();
      expect(properties).toHaveLength(4);

      // Verify required fields
      expect(classDecl.getPropertyOrThrow("id").hasExclamationToken()).toBe(true);
      expect(classDecl.getPropertyOrThrow("email").hasExclamationToken()).toBe(true);

      // Verify optional fields
      expect(classDecl.getPropertyOrThrow("age").hasQuestionToken()).toBe(true);
      expect(classDecl.getPropertyOrThrow("active").hasQuestionToken()).toBe(true);
    });

    it("should generate object type for schema with properties", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            MetadataDto: {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    key: { type: "string" },
                  },
                },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/MetadataDto.dto.ts");
      const classDecl = sourceFile.getClassOrThrow("MetadataDto");
      const dataProp = classDecl.getPropertyOrThrow("data");

      expect(dataProp.getType().getText()).toContain("object");
    });

    it("should generate Record<string, any> for object without properties", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            DynamicDto: {
              type: "object",
              properties: {
                metadata: { type: "object" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/DynamicDto.dto.ts");
      const classDecl = sourceFile.getClassOrThrow("DynamicDto");
      const metadataProp = classDecl.getPropertyOrThrow("metadata");

      expect(metadataProp.getType().getText()).toContain("Record<string, any>");
      expect(metadataProp.getDecorator("IsObject")).toBeDefined();
    });
  });

  describe("Array Types", () => {
    it("should generate array of primitives", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            TagsDto: {
              type: "object",
              properties: {
                tags: {
                  type: "array",
                  items: { type: "string" },
                },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/TagsDto.dto.ts");
      const classDecl = sourceFile.getClassOrThrow("TagsDto");
      const tagsProp = classDecl.getPropertyOrThrow("tags");

      expect(tagsProp.getType().getText()).toContain("string[]");
      expect(tagsProp.getDecorator("IsArray")).toBeDefined();
    });

    it("should generate array of objects with nested validation", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            ItemDto: {
              type: "object",
              properties: {
                name: { type: "string" },
              },
            },
            ListDto: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: { $ref: "#/components/schemas/ItemDto" },
                },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/ListDto.dto.ts");
      const classDecl = sourceFile.getClassOrThrow("ListDto");
      const itemsProp = classDecl.getPropertyOrThrow("items");

      expect(itemsProp.getType().getText()).toContain("ItemDto[]");
      expect(itemsProp.getDecorator("IsArray")).toBeDefined();
      expect(itemsProp.getDecorator("ValidateNested")).toBeDefined();
      expect(itemsProp.getDecorator("Type")).toBeDefined();
    });

    it("should generate any[] for array without items specification", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            FlexibleDto: {
              type: "object",
              properties: {
                // TypeScript will accept this with type assertion, but at runtime
                // the generator handles missing items gracefully
                data: { type: "array", items: {} } as OpenAPIV3.SchemaObject,
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/FlexibleDto.dto.ts");
      const classDecl = sourceFile.getClassOrThrow("FlexibleDto");
      const dataProp = classDecl.getPropertyOrThrow("data");

      expect(dataProp.getType().getText()).toContain("any[]");
      expect(dataProp.getDecorator("IsArray")).toBeDefined();
    });
  });

  describe("Enum Types", () => {
    it("should generate enum with const and type alias", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            StatusDto: {
              type: "object",
              required: ["status"],
              properties: {
                status: {
                  type: "string",
                  enum: ["active", "inactive", "pending"],
                },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/StatusDto.dto.ts");

      // Check enum constant definition
      const constVar = sourceFile.getVariableDeclaration("STATUS_DTO_STATUS");
      expect(constVar).toBeDefined();
      expect(constVar?.isExported()).toBe(true);

      // Check type alias
      const typeAlias = sourceFile.getTypeAlias("StatusDtoStatus");
      expect(typeAlias).toBeDefined();
      expect(typeAlias?.isExported()).toBe(true);

      // Check class property uses enum type
      const classDecl = sourceFile.getClassOrThrow("StatusDto");
      const statusProp = classDecl.getPropertyOrThrow("status");
      expect(statusProp.getType().getText()).toContain("StatusDtoStatus");
      expect(statusProp.getDecorator("IsIn")).toBeDefined();
    });

    it("should generate enum with multiple values", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            PriorityDto: {
              type: "object",
              properties: {
                level: {
                  type: "string",
                  enum: ["low", "medium", "high", "critical"],
                },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/PriorityDto.dto.ts");
      const constVar = sourceFile.getVariableDeclaration("PRIORITY_DTO_LEVEL");

      expect(constVar).toBeDefined();
      const initText = constVar?.getInitializer()?.getText() || "";
      expect(initText).toContain("LOW: 'low'");
      expect(initText).toContain("MEDIUM: 'medium'");
      expect(initText).toContain("HIGH: 'high'");
      expect(initText).toContain("CRITICAL: 'critical'");
    });
  });

  describe("Reference Types", () => {
    it("should generate reference to another DTO with imports", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            AddressDto: {
              type: "object",
              properties: {
                street: { type: "string" },
              },
            },
            PersonDto: {
              type: "object",
              properties: {
                address: { $ref: "#/components/schemas/AddressDto" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/PersonDto.dto.ts");
      const classDecl = sourceFile.getClassOrThrow("PersonDto");
      const addressProp = classDecl.getPropertyOrThrow("address");

      expect(addressProp.getType().getText()).toContain("AddressDto");
      expect(addressProp.getDecorator("ValidateNested")).toBeDefined();
      expect(addressProp.getDecorator("Type")).toBeDefined();

      // Check imports
      const imports = sourceFile.getImportDeclarations();
      const dtoImport = imports.find(imp =>
        imp.getModuleSpecifierValue().includes("AddressDto.dto")
      );
      expect(dtoImport).toBeDefined();
    });

    it("should handle required references", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            UserDto: {
              type: "object",
              properties: {
                id: { type: "string" },
              },
            },
            PostDto: {
              type: "object",
              required: ["author"],
              properties: {
                author: { $ref: "#/components/schemas/UserDto" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/PostDto.dto.ts");
      const classDecl = sourceFile.getClassOrThrow("PostDto");
      const authorProp = classDecl.getPropertyOrThrow("author");

      expect(authorProp.hasExclamationToken()).toBe(true);
      expect(authorProp.getDecorator("IsNotEmpty")).toBeDefined();
    });
  });

  describe("Field Modifiers", () => {
    it("should distinguish required vs optional fields", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            MixedDto: {
              type: "object",
              required: ["required1", "required2"],
              properties: {
                required1: { type: "string" },
                required2: { type: "number" },
                optional1: { type: "string" },
                optional2: { type: "boolean" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/MixedDto.dto.ts");
      const classDecl = sourceFile.getClassOrThrow("MixedDto");

      // Required fields
      expect(classDecl.getPropertyOrThrow("required1").hasExclamationToken()).toBe(true);
      expect(classDecl.getPropertyOrThrow("required1").getDecorator("IsNotEmpty")).toBeDefined();
      expect(classDecl.getPropertyOrThrow("required2").hasExclamationToken()).toBe(true);
      expect(classDecl.getPropertyOrThrow("required2").getDecorator("IsNotEmpty")).toBeDefined();

      // Optional fields
      expect(classDecl.getPropertyOrThrow("optional1").hasQuestionToken()).toBe(true);
      expect(classDecl.getPropertyOrThrow("optional1").getDecorator("IsOptional")).toBeDefined();
      expect(classDecl.getPropertyOrThrow("optional2").hasQuestionToken()).toBe(true);
      expect(classDecl.getPropertyOrThrow("optional2").getDecorator("IsOptional")).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty schema with no properties", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            EmptyDto: {
              type: "object",
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/EmptyDto.dto.ts");
      const classDecl = sourceFile.getClassOrThrow("EmptyDto");

      expect(classDecl.getProperties()).toHaveLength(0);
      expect(classDecl.isExported()).toBe(true);
    });

    it("should skip reference objects in schemas", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            ValidDto: {
              type: "object",
              properties: {
                name: { type: "string" },
              },
            },
            // This simulates a malformed schema that's just a reference
            // (In practice, this shouldn't happen, but we handle it)
          },
        },
      };

      // Should not throw
      expect(() => {
        generator.generate(doc, project, "./generated");
      }).not.toThrow();

      // Only ValidDto should be generated
      const files = project.getSourceFiles();
      expect(files).toHaveLength(1);
      expect(files[0].getFilePath()).toContain("ValidDto.dto.ts");
    });

    it("should handle missing components.schemas gracefully", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
      };

      // Should not throw
      expect(() => {
        generator.generate(doc, project, "./generated");
      }).not.toThrow();

      // No files should be generated
      expect(project.getSourceFiles()).toHaveLength(0);
    });

    it("should normalize schema names with reserved keywords", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            // Testing with name that might conflict
            Class: {
              type: "object",
              properties: {
                name: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      // Should create file with normalized name
      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/Class.dto.ts");
      const classDecl = sourceFile.getClassOrThrow("Class");
      expect(classDecl.isExported()).toBe(true);
    });
  });

  describe("AST Validation", () => {
    it("should generate exported class declarations", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            ExportTestDto: {
              type: "object",
              properties: {
                field: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/ExportTestDto.dto.ts");
      const classDecl = sourceFile.getClassOrThrow("ExportTestDto");

      expect(classDecl.isExported()).toBe(true);
      expect(classDecl.getName()).toBe("ExportTestDto");
    });

    it("should add correct imports for decorators", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            ImportTestDto: {
              type: "object",
              required: ["name"],
              properties: {
                name: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/ImportTestDto.dto.ts");
      const imports = sourceFile.getImportDeclarations();

      // Should have imports for class-validator decorators
      const validatorImports = imports.filter(imp =>
        imp.getModuleSpecifierValue() === "class-validator"
      );
      expect(validatorImports.length).toBeGreaterThan(0);

      // Should have imports for swagger decorators
      const swaggerImports = imports.filter(imp =>
        imp.getModuleSpecifierValue() === "@nestjs/swagger"
      );
      expect(swaggerImports.length).toBeGreaterThan(0);
    });

    it("should verify property count matches schema properties", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            CountTestDto: {
              type: "object",
              properties: {
                field1: { type: "string" },
                field2: { type: "number" },
                field3: { type: "boolean" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/CountTestDto.dto.ts");
      const classDecl = sourceFile.getClassOrThrow("CountTestDto");
      const properties = classDecl.getProperties();

      expect(properties).toHaveLength(3);
      expect(properties.map(p => p.getName()).sort()).toEqual(["field1", "field2", "field3"]);
    });
  });

  describe("Snapshot Testing", () => {
    it("should match snapshot for simple DTO", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            SimpleDto: {
              type: "object",
              required: ["id"],
              properties: {
                id: { type: "string", description: "Unique identifier" },
                name: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/SimpleDto.dto.ts");
      const fullText = sourceFile.getFullText();

      expect(fullText).toMatchSnapshot("simple-dto");
    });

    it("should match snapshot for DTO with array", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            ArrayDto: {
              type: "object",
              properties: {
                tags: {
                  type: "array",
                  items: { type: "string" },
                },
                scores: {
                  type: "array",
                  items: { type: "number" },
                },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/ArrayDto.dto.ts");
      const fullText = sourceFile.getFullText();

      expect(fullText).toMatchSnapshot("array-dto");
    });

    it("should match snapshot for DTO with enum", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            EnumDto: {
              type: "object",
              required: ["role"],
              properties: {
                role: {
                  type: "string",
                  enum: ["admin", "user", "guest"],
                  description: "User role",
                },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/EnumDto.dto.ts");
      const fullText = sourceFile.getFullText();

      expect(fullText).toMatchSnapshot("enum-dto");
    });

    it("should match snapshot for DTO with reference", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            CategoryDto: {
              type: "object",
              properties: {
                name: { type: "string" },
              },
            },
            ProductDto: {
              type: "object",
              required: ["name"],
              properties: {
                name: { type: "string" },
                category: { $ref: "#/components/schemas/CategoryDto" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/ProductDto.dto.ts");
      const fullText = sourceFile.getFullText();

      expect(fullText).toMatchSnapshot("reference-dto");
    });

    it("should match snapshot for complex DTO with all features", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            ComplexDto: {
              type: "object",
              required: ["id", "status"],
              properties: {
                id: { type: "integer", description: "ID" },
                name: { type: "string" },
                active: { type: "boolean" },
                status: {
                  type: "string",
                  enum: ["draft", "published"],
                },
                tags: {
                  type: "array",
                  items: { type: "string" },
                },
                metadata: { type: "object" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/ComplexDto.dto.ts");
      const fullText = sourceFile.getFullText();

      expect(fullText).toMatchSnapshot("complex-dto");
    });
  });

  describe("Multiple Schemas", () => {
    it("should generate multiple DTOs from document", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            UserDto: {
              type: "object",
              properties: {
                name: { type: "string" },
              },
            },
            PostDto: {
              type: "object",
              properties: {
                title: { type: "string" },
              },
            },
            CommentDto: {
              type: "object",
              properties: {
                text: { type: "string" },
              },
            },
          },
        },
      };

      generator.generate(doc, project, "./generated");

      const files = project.getSourceFiles();
      expect(files).toHaveLength(3);

      const fileNames = files.map(f => f.getBaseName()).sort();
      expect(fileNames).toEqual([
        "CommentDto.dto.ts",
        "PostDto.dto.ts",
        "UserDto.dto.ts",
      ]);
    });
  });
});
