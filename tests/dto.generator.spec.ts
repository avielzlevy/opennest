import { Project } from "ts-morph";
import { DtoGenerator } from "../src/generators/dto.generator"; // Adjust path
import { TypeMapper } from "../utils/type-mapper";
import { OpenAPIV3 } from "openapi-types";

describe("DtoGenerator Integration", () => {
  let project: Project;
  let generator: DtoGenerator;

  beforeEach(() => {
    // Initialize an in-memory project (no physical files created)
    project = new Project({ useInMemoryFileSystem: true });
    generator = new DtoGenerator(new TypeMapper());
  });

  it("should generate a valid DTO class with properties", () => {
    // 1. Mock Input
    const doc: Partial<OpenAPIV3.Document> = {
      components: {
        schemas: {
          ProductDto: {
            type: "object",
            required: ["name"],
            properties: {
              name: { type: "string" },
              price: { type: "number" },
            },
          },
        },
      },
    };

    // 2. Execute
    generator.generate(doc as OpenAPIV3.Document, project);

    // 3. Inspect the Virtual File System
    const sourceFile = project.getSourceFileOrThrow(
      "src/dtos/ProductDto.dto.ts",
    );

    // Check Class existence
    const classDecl = sourceFile.getClassOrThrow("ProductDto");
    expect(classDecl.isExported()).toBe(true);

    // Check Properties
    const nameProp = classDecl.getPropertyOrThrow("name");
    expect(nameProp.getType().getText()).toBe("string");
    // Check Decorator existence (rudimentary check)
    expect(nameProp.getDecorator("IsString")).toBeDefined();
    expect(nameProp.getDecorator("IsNotEmpty")).toBeDefined();

    const priceProp = classDecl.getPropertyOrThrow("price");
    expect(priceProp.hasQuestionToken()).toBe(true); // Optional
    expect(priceProp.getDecorator("IsOptional")).toBeDefined();
  });
});
