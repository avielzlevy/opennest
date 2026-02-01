import { TypeMapper } from "../src/utils/type-mapper"; // Adjust path as needed
import { OpenAPIV3 } from "openapi-types";

describe("TypeMapper", () => {
  let mapper: TypeMapper;

  beforeEach(() => {
    mapper = new TypeMapper();
  });

  it("should map a simple string to TypeScript string with validation", () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: "string",
      description: "A test string",
    };

    const result = mapper.mapSchemaToType(schema, true); // true = required

    expect(result.tsType).toBe("string");
    expect(result.decorators).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "IsString" }),
        expect.objectContaining({ name: "IsNotEmpty" }), // Because it's required
        expect.objectContaining({ name: "ApiProperty" }),
      ]),
    );
  });

  it("should handle optional integers with minimum validation", () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: "integer",
      minimum: 18,
    };

    const result = mapper.mapSchemaToType(schema, false); // false = optional

    expect(result.tsType).toBe("number | undefined");
    expect(result.decorators).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "IsNumber" }),
        expect.objectContaining({ name: "Min", arguments: ["18"] }),
        expect.objectContaining({ name: "IsOptional" }),
      ]),
    );
  });

  it("should handle references (DTOs)", () => {
    const schema: OpenAPIV3.ReferenceObject = {
      $ref: "#/components/schemas/UserDto",
    };

    const result = mapper.mapSchemaToType(schema, true);

    expect(result.tsType).toBe("UserDto");
    expect(result.imports).toContainEqual({
      named: "UserDto",
      moduleSpecifier: "./UserDto",
    });
  });
});
