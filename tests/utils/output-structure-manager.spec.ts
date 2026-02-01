/**
 * OutputStructureManager Unit Tests
 *
 * Test Coverage:
 * - resolveOutputPath() for type-based and domain-based structures
 * - extractResourceNameFromTag() with various inputs
 * - getDirectoryPath() for both structures
 * - Edge cases: empty paths, undefined configs, special characters
 */

import {
  resolveOutputPath,
  extractResourceNameFromTag,
  getDirectoryPath,
  OutputStructureConfig,
} from "../../src/utils/output-structure-manager";
import * as path from "path";

describe("OutputStructureManager Unit Tests", () => {
  describe("resolveOutputPath - Type-based Structure", () => {
    const config: OutputStructureConfig = { structure: "type-based" };

    it("should generate type-based path for DTOs", () => {
      const result = resolveOutputPath("./generated", "dtos", "pet", config);
      expect(result).toBe(path.join("./generated", "dtos", "pet.dto.ts"));
    });

    it("should generate type-based path for controllers", () => {
      const result = resolveOutputPath("./generated", "controllers", "user", config);
      expect(result).toBe(path.join("./generated", "controllers", "user.controller.ts"));
    });

    it("should generate type-based path for decorators", () => {
      const result = resolveOutputPath("./generated", "decorators", "store", config);
      expect(result).toBe(path.join("./generated", "decorators", "store.decorator.ts"));
    });

    it("should generate type-based path for common files", () => {
      const result = resolveOutputPath("./generated", "common", "errors", config);
      expect(result).toBe(path.join("./generated", "common", "errors.ts"));
    });

    it("should handle different base paths", () => {
      const result = resolveOutputPath("./output", "dtos", "pet", config);
      expect(result).toBe(path.join("./output", "dtos", "pet.dto.ts"));
    });

    it("should handle absolute base paths", () => {
      const result = resolveOutputPath("/app/generated", "dtos", "pet", config);
      expect(result).toBe(path.join("/app/generated", "dtos", "pet.dto.ts"));
    });
  });

  describe("resolveOutputPath - Domain-based Structure", () => {
    const config: OutputStructureConfig = { structure: "domain-based" };

    it("should generate domain-based path for DTOs", () => {
      const result = resolveOutputPath("./generated", "dtos", "pet", config);
      expect(result).toBe(path.join("./generated", "pet", "dtos", "pet.dto.ts"));
    });

    it("should generate domain-based path for controllers", () => {
      const result = resolveOutputPath("./generated", "controllers", "user", config);
      expect(result).toBe(path.join("./generated", "user", "controllers", "user.controller.ts"));
    });

    it("should generate domain-based path for decorators", () => {
      const result = resolveOutputPath("./generated", "decorators", "store", config);
      expect(result).toBe(path.join("./generated", "store", "decorators", "store.decorator.ts"));
    });

    it("should generate domain-based path for common files", () => {
      const result = resolveOutputPath("./generated", "common", "errors", config);
      expect(result).toBe(path.join("./generated", "errors", "common", "errors.ts"));
    });

    it("should handle different base paths", () => {
      const result = resolveOutputPath("./output", "dtos", "pet", config);
      expect(result).toBe(path.join("./output", "pet", "dtos", "pet.dto.ts"));
    });

    it("should handle absolute base paths", () => {
      const result = resolveOutputPath("/app/generated", "dtos", "pet", config);
      expect(result).toBe(path.join("/app/generated", "pet", "dtos", "pet.dto.ts"));
    });

    it("should organize different resources into separate directories", () => {
      const petPath = resolveOutputPath("./generated", "dtos", "pet", config);
      const userPath = resolveOutputPath("./generated", "dtos", "user", config);
      const storePath = resolveOutputPath("./generated", "dtos", "store", config);

      expect(petPath).toBe(path.join("./generated", "pet", "dtos", "pet.dto.ts"));
      expect(userPath).toBe(path.join("./generated", "user", "dtos", "user.dto.ts"));
      expect(storePath).toBe(path.join("./generated", "store", "dtos", "store.dto.ts"));
    });
  });

  describe("extractResourceNameFromTag", () => {
    it("should extract simple lowercase tag", () => {
      const result = extractResourceNameFromTag("pet");
      expect(result).toBe("pet");
    });

    it("should convert PascalCase to kebab-case", () => {
      const result = extractResourceNameFromTag("PetStore");
      expect(result).toBe("pet-store");
    });

    it("should handle single word PascalCase", () => {
      const result = extractResourceNameFromTag("Pet");
      expect(result).toBe("pet");
    });

    it("should remove Controller suffix", () => {
      const result = extractResourceNameFromTag("PetController");
      expect(result).toBe("pet");
    });

    it("should remove Service suffix", () => {
      const result = extractResourceNameFromTag("UserService");
      expect(result).toBe("user");
    });

    it("should remove Api suffix", () => {
      const result = extractResourceNameFromTag("StoreApi");
      expect(result).toBe("store");
    });

    it("should handle multiple capital letters in sequence", () => {
      const result = extractResourceNameFromTag("HTTPService");
      expect(result).toBe("h-t-t-p");
    });

    it("should handle complex PascalCase names", () => {
      const result = extractResourceNameFromTag("StoreInventory");
      expect(result).toBe("store-inventory");
    });

    it("should handle names with suffixes and PascalCase", () => {
      const result = extractResourceNameFromTag("PetStoreController");
      expect(result).toBe("pet-store");
    });

    it("should handle camelCase (first letter lowercase)", () => {
      const result = extractResourceNameFromTag("petStore");
      expect(result).toBe("pet-store");
    });

    it("should handle all lowercase", () => {
      const result = extractResourceNameFromTag("petstore");
      expect(result).toBe("petstore");
    });

    it("should handle single character", () => {
      const result = extractResourceNameFromTag("P");
      expect(result).toBe("p");
    });

    it("should handle empty string", () => {
      const result = extractResourceNameFromTag("");
      expect(result).toBe("");
    });
  });

  describe("getDirectoryPath - Type-based Structure", () => {
    const config: OutputStructureConfig = { structure: "type-based" };

    it("should return directory for DTOs", () => {
      const result = getDirectoryPath("./generated", "dtos", "pet", config);
      expect(result).toBe(path.join("./generated", "dtos"));
    });

    it("should return directory for controllers", () => {
      const result = getDirectoryPath("./generated", "controllers", "user", config);
      expect(result).toBe(path.join("./generated", "controllers"));
    });

    it("should return directory for decorators", () => {
      const result = getDirectoryPath("./generated", "decorators", "store", config);
      expect(result).toBe(path.join("./generated", "decorators"));
    });

    it("should ignore resource name in type-based structure", () => {
      const result1 = getDirectoryPath("./generated", "dtos", "pet", config);
      const result2 = getDirectoryPath("./generated", "dtos", "user", config);
      expect(result1).toBe(result2);
    });
  });

  describe("getDirectoryPath - Domain-based Structure", () => {
    const config: OutputStructureConfig = { structure: "domain-based" };

    it("should return directory for DTOs with resource", () => {
      const result = getDirectoryPath("./generated", "dtos", "pet", config);
      expect(result).toBe(path.join("./generated", "pet", "dtos"));
    });

    it("should return directory for controllers with resource", () => {
      const result = getDirectoryPath("./generated", "controllers", "user", config);
      expect(result).toBe(path.join("./generated", "user", "controllers"));
    });

    it("should return directory for decorators with resource", () => {
      const result = getDirectoryPath("./generated", "decorators", "store", config);
      expect(result).toBe(path.join("./generated", "store", "decorators"));
    });

    it("should create different directories for different resources", () => {
      const petDir = getDirectoryPath("./generated", "dtos", "pet", config);
      const userDir = getDirectoryPath("./generated", "dtos", "user", config);

      expect(petDir).toBe(path.join("./generated", "pet", "dtos"));
      expect(userDir).toBe(path.join("./generated", "user", "dtos"));
      expect(petDir).not.toBe(userDir);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty base path with type-based", () => {
      const config: OutputStructureConfig = { structure: "type-based" };
      const result = resolveOutputPath("", "dtos", "pet", config);
      expect(result).toBe(path.join("dtos", "pet.dto.ts"));
    });

    it("should handle empty base path with domain-based", () => {
      const config: OutputStructureConfig = { structure: "domain-based" };
      const result = resolveOutputPath("", "dtos", "pet", config);
      expect(result).toBe(path.join("pet", "dtos", "pet.dto.ts"));
    });

    it("should handle special characters in resource name", () => {
      const config: OutputStructureConfig = { structure: "domain-based" };
      const result = resolveOutputPath("./generated", "dtos", "pet-store", config);
      expect(result).toBe(path.join("./generated", "pet-store", "dtos", "pet-store.dto.ts"));
    });

    it("should handle unknown file types", () => {
      const config: OutputStructureConfig = { structure: "type-based" };
      const result = resolveOutputPath("./generated", "unknown", "test", config);
      expect(result).toBe(path.join("./generated", "unknown", "test.ts"));
    });

    it("should handle path with trailing slash", () => {
      const config: OutputStructureConfig = { structure: "type-based" };
      const result = resolveOutputPath("./generated/", "dtos", "pet", config);
      // path.join normalizes trailing slashes
      expect(result).toBe(path.join("./generated/", "dtos", "pet.dto.ts"));
    });

    it("should handle resource names with numbers", () => {
      const result = extractResourceNameFromTag("Pet123");
      expect(result).toBe("pet123");
    });

    it("should handle resource names with underscores", () => {
      const result = extractResourceNameFromTag("pet_store");
      expect(result).toBe("pet_store");
    });
  });

  describe("Consistency Tests", () => {
    it("type-based paths should be consistent regardless of resource", () => {
      const config: OutputStructureConfig = { structure: "type-based" };

      const petDto = resolveOutputPath("./generated", "dtos", "pet", config);
      const userDto = resolveOutputPath("./generated", "dtos", "user", config);

      // Both should be in the same directory
      expect(path.dirname(petDto)).toBe(path.dirname(userDto));
      expect(path.dirname(petDto)).toBe(path.join("./generated", "dtos"));
    });

    it("domain-based paths should separate resources", () => {
      const config: OutputStructureConfig = { structure: "domain-based" };

      const petDto = resolveOutputPath("./generated", "dtos", "pet", config);
      const userDto = resolveOutputPath("./generated", "dtos", "user", config);

      // Should be in different directories
      expect(path.dirname(petDto)).not.toBe(path.dirname(userDto));
      expect(path.dirname(petDto)).toBe(path.join("./generated", "pet", "dtos"));
      expect(path.dirname(userDto)).toBe(path.join("./generated", "user", "dtos"));
    });

    it("file names should be identical between structures", () => {
      const typeConfig: OutputStructureConfig = { structure: "type-based" };
      const domainConfig: OutputStructureConfig = { structure: "domain-based" };

      const typePath = resolveOutputPath("./generated", "dtos", "pet", typeConfig);
      const domainPath = resolveOutputPath("./generated", "dtos", "pet", domainConfig);

      // Base names should be the same
      expect(path.basename(typePath)).toBe(path.basename(domainPath));
      expect(path.basename(typePath)).toBe("pet.dto.ts");
    });
  });
});
