/**
 * Tests for RELATIONSHIPS.json Schema and Types
 * Validates TypeScript interfaces, JSON schema, type guards, and validators
 */

import {
  isRelationshipEvidenceDefinition,
  isRelationshipDefinition,
  isEntityDefinition,
  isRelationshipsMetadata,
  isRelationshipsExport,
  validateRelationshipsExportData,
  createRelationshipsExport,
  sortRelationships,
  sortEntities,
  type RelationshipEvidenceDefinition,
  type RelationshipDefinition,
  type EntityDefinition,
  type RelationshipsMetadata,
  type RelationshipsExport,
} from "../../src/generators/relationships-schema";

describe("RELATIONSHIPS.json Schema and Types", () => {
  // ============================================================================
  // Test Data Fixtures
  // ============================================================================

  const createValidEvidence = (): RelationshipEvidenceDefinition => ({
    source: "schema_ref",
    location: 'paths."/users/{id}/orders"',
    details: "Schema reference in response",
  });

  const createValidRelationship = (): RelationshipDefinition => ({
    sourceEntity: "User",
    targetEntity: "Order",
    type: "hasMany",
    confidence: "high",
    detectedBy: ["schema_ref", "path_pattern"],
    evidence: [createValidEvidence()],
  });

  const createValidEndpoint = (): EntityDefinition["endpoints"][0] => ({
    method: "GET",
    path: "/users/{id}/orders",
    operationId: "getUserOrders",
    description: "Get user's orders",
  });

  const createValidEntity = (): EntityDefinition => ({
    name: "User",
    endpoints: [createValidEndpoint()],
    relationships: [createValidRelationship()],
  });

  const createValidMetadata = (): RelationshipsMetadata => ({
    specTitle: "Test API",
    specVersion: "1.0.0",
    generatedAt: "2026-02-03T12:00:00Z",
    totalEntities: 2,
    totalRelationships: 1,
    exportVersion: "1.0.0",
  });

  const createValidExport = (): RelationshipsExport => ({
    metadata: createValidMetadata(),
    entities: {
      User: createValidEntity(),
    },
    relationships: [createValidRelationship()],
  });

  // ============================================================================
  // RelationshipEvidenceDefinition Type Guard Tests
  // ============================================================================

  describe("isRelationshipEvidenceDefinition", () => {
    it("should return true for valid evidence object", () => {
      const evidence = createValidEvidence();
      expect(isRelationshipEvidenceDefinition(evidence)).toBe(true);
    });

    it("should return false for null", () => {
      expect(isRelationshipEvidenceDefinition(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isRelationshipEvidenceDefinition(undefined)).toBe(false);
    });

    it("should return false for non-object", () => {
      expect(isRelationshipEvidenceDefinition("string")).toBe(false);
      expect(isRelationshipEvidenceDefinition(42)).toBe(false);
      expect(isRelationshipEvidenceDefinition([])).toBe(false);
    });

    it("should return false if source is invalid", () => {
      const evidence = createValidEvidence();
      expect(isRelationshipEvidenceDefinition({ ...evidence, source: "invalid" })).toBe(false);
    });

    it("should return false if location is not a string", () => {
      const evidence = createValidEvidence();
      expect(isRelationshipEvidenceDefinition({ ...evidence, location: 123 })).toBe(false);
    });

    it("should return false if location is empty string", () => {
      const evidence = createValidEvidence();
      expect(isRelationshipEvidenceDefinition({ ...evidence, location: "" })).toBe(false);
    });

    it("should return false if details is not a string", () => {
      const evidence = createValidEvidence();
      expect(isRelationshipEvidenceDefinition({ ...evidence, details: null })).toBe(false);
    });

    it("should return false if details is empty string", () => {
      const evidence = createValidEvidence();
      expect(isRelationshipEvidenceDefinition({ ...evidence, details: "" })).toBe(false);
    });

    it("should validate all three sources", () => {
      const baseEvidence = { location: "path", details: "detail" };
      expect(
        isRelationshipEvidenceDefinition({ ...baseEvidence, source: "schema_ref" })
      ).toBe(true);
      expect(
        isRelationshipEvidenceDefinition({ ...baseEvidence, source: "naming_pattern" })
      ).toBe(true);
      expect(
        isRelationshipEvidenceDefinition({ ...baseEvidence, source: "path_pattern" })
      ).toBe(true);
    });
  });

  // ============================================================================
  // RelationshipDefinition Type Guard Tests
  // ============================================================================

  describe("isRelationshipDefinition", () => {
    it("should return true for valid relationship object", () => {
      const rel = createValidRelationship();
      expect(isRelationshipDefinition(rel)).toBe(true);
    });

    it("should return false for null", () => {
      expect(isRelationshipDefinition(null)).toBe(false);
    });

    it("should return false if sourceEntity is missing", () => {
      const rel = createValidRelationship();
      const { sourceEntity, ...rest } = rel;
      expect(isRelationshipDefinition(rest)).toBe(false);
    });

    it("should return false if sourceEntity is empty", () => {
      const rel = createValidRelationship();
      expect(isRelationshipDefinition({ ...rel, sourceEntity: "" })).toBe(false);
    });

    it("should return false if targetEntity is missing", () => {
      const rel = createValidRelationship();
      const { targetEntity, ...rest } = rel;
      expect(isRelationshipDefinition(rest)).toBe(false);
    });

    it("should return false if type is invalid", () => {
      const rel = createValidRelationship();
      expect(isRelationshipDefinition({ ...rel, type: "invalid" })).toBe(false);
    });

    it("should validate all three types", () => {
      const baseRel = createValidRelationship();
      expect(isRelationshipDefinition({ ...baseRel, type: "hasMany" })).toBe(true);
      expect(isRelationshipDefinition({ ...baseRel, type: "hasOne" })).toBe(true);
      expect(isRelationshipDefinition({ ...baseRel, type: "belongsTo" })).toBe(true);
    });

    it("should return false if confidence is invalid", () => {
      const rel = createValidRelationship();
      expect(isRelationshipDefinition({ ...rel, confidence: "invalid" })).toBe(false);
    });

    it("should validate all three confidence levels", () => {
      const baseRel = createValidRelationship();
      expect(isRelationshipDefinition({ ...baseRel, confidence: "high" })).toBe(true);
      expect(isRelationshipDefinition({ ...baseRel, confidence: "medium" })).toBe(true);
      expect(isRelationshipDefinition({ ...baseRel, confidence: "low" })).toBe(true);
    });

    it("should return false if detectedBy is not an array", () => {
      const rel = createValidRelationship();
      expect(isRelationshipDefinition({ ...rel, detectedBy: "not-array" })).toBe(false);
    });

    it("should return false if detectedBy contains invalid sources", () => {
      const rel = createValidRelationship();
      expect(isRelationshipDefinition({ ...rel, detectedBy: ["invalid"] })).toBe(false);
    });

    it("should return false if evidence is not an array", () => {
      const rel = createValidRelationship();
      expect(isRelationshipDefinition({ ...rel, evidence: {} })).toBe(false);
    });

    it("should return false if evidence is empty array", () => {
      const rel = createValidRelationship();
      expect(isRelationshipDefinition({ ...rel, evidence: [] })).toBe(false);
    });

    it("should return false if evidence contains invalid items", () => {
      const rel = createValidRelationship();
      expect(
        isRelationshipDefinition({ ...rel, evidence: [{ invalid: "object" }] })
      ).toBe(false);
    });

    it("should accept relationship with multiple evidence records", () => {
      const rel = createValidRelationship();
      const evidence = [createValidEvidence(), createValidEvidence()];
      expect(isRelationshipDefinition({ ...rel, evidence })).toBe(true);
    });
  });

  // ============================================================================
  // EntityDefinition Type Guard Tests
  // ============================================================================

  describe("isEntityDefinition", () => {
    it("should return true for valid entity object", () => {
      const entity = createValidEntity();
      expect(isEntityDefinition(entity)).toBe(true);
    });

    it("should return false for null", () => {
      expect(isEntityDefinition(null)).toBe(false);
    });

    it("should return false if name is missing", () => {
      const entity = createValidEntity();
      const { name, ...rest } = entity;
      expect(isEntityDefinition(rest)).toBe(false);
    });

    it("should return false if name is empty string", () => {
      const entity = createValidEntity();
      expect(isEntityDefinition({ ...entity, name: "" })).toBe(false);
    });

    it("should return false if endpoints is not an array", () => {
      const entity = createValidEntity();
      expect(isEntityDefinition({ ...entity, endpoints: {} })).toBe(false);
    });

    it("should return true with empty endpoints array", () => {
      const entity = createValidEntity();
      expect(isEntityDefinition({ ...entity, endpoints: [] })).toBe(true);
    });

    it("should return false if endpoints contain invalid items", () => {
      const entity = createValidEntity();
      expect(isEntityDefinition({ ...entity, endpoints: [{ invalid: "obj" }] })).toBe(false);
    });

    it("should return false if relationships is not an array", () => {
      const entity = createValidEntity();
      expect(isEntityDefinition({ ...entity, relationships: {} })).toBe(false);
    });

    it("should return true with empty relationships array", () => {
      const entity = createValidEntity();
      expect(isEntityDefinition({ ...entity, relationships: [] })).toBe(true);
    });

    it("should return false if relationships contain invalid items", () => {
      const entity = createValidEntity();
      expect(isEntityDefinition({ ...entity, relationships: [{ invalid: "obj" }] })).toBe(false);
    });

    it("should validate all HTTP methods", () => {
      const base = { name: "Test", path: "/test" };
      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"];

      methods.forEach((method) => {
        const endpoint = { ...base, method } as EntityDefinition["endpoints"][0];
        expect(
          isEntityDefinition({
            name: "Test",
            endpoints: [endpoint],
            relationships: [],
          })
        ).toBe(true);
      });
    });

    it("should return false for invalid HTTP method", () => {
      const endpoint = { method: "INVALID", path: "/test" };
      expect(
        isEntityDefinition({
          name: "Test",
          endpoints: [endpoint as EntityDefinition["endpoints"][0]],
          relationships: [],
        })
      ).toBe(false);
    });

    it("should accept endpoint with null operationId", () => {
      const endpoint = { ...createValidEndpoint(), operationId: null as unknown as string | undefined };
      expect(
        isEntityDefinition({
          name: "Test",
          endpoints: [endpoint as unknown as EntityDefinition["endpoints"][0]],
          relationships: [],
        })
      ).toBe(true);
    });

    it("should accept endpoint with null description", () => {
      const endpoint = { ...createValidEndpoint(), description: null as unknown as string | undefined };
      expect(
        isEntityDefinition({
          name: "Test",
          endpoints: [endpoint as unknown as EntityDefinition["endpoints"][0]],
          relationships: [],
        })
      ).toBe(true);
    });
  });

  // ============================================================================
  // RelationshipsMetadata Type Guard Tests
  // ============================================================================

  describe("isRelationshipsMetadata", () => {
    it("should return true for valid metadata object", () => {
      const metadata = createValidMetadata();
      expect(isRelationshipsMetadata(metadata)).toBe(true);
    });

    it("should return false for null", () => {
      expect(isRelationshipsMetadata(null)).toBe(false);
    });

    it("should return true with null specTitle", () => {
      const metadata = createValidMetadata();
      expect(isRelationshipsMetadata({ ...metadata, specTitle: null })).toBe(true);
    });

    it("should return true with null specVersion", () => {
      const metadata = createValidMetadata();
      expect(isRelationshipsMetadata({ ...metadata, specVersion: null })).toBe(true);
    });

    it("should return false if generatedAt is missing", () => {
      const metadata = createValidMetadata();
      const { generatedAt, ...rest } = metadata;
      expect(isRelationshipsMetadata(rest)).toBe(false);
    });

    it("should return false if generatedAt is not ISO 8601 format", () => {
      const metadata = createValidMetadata();
      expect(isRelationshipsMetadata({ ...metadata, generatedAt: "2026-02-03" })).toBe(false);
    });

    it("should accept various ISO 8601 formats", () => {
      const metadata = createValidMetadata();
      expect(isRelationshipsMetadata({ ...metadata, generatedAt: "2026-02-03T12:00:00Z" })).toBe(
        true
      );
      expect(isRelationshipsMetadata({ ...metadata, generatedAt: "2026-02-03T12:00:00+00:00" })).toBe(
        true
      );
      expect(isRelationshipsMetadata({ ...metadata, generatedAt: "2026-02-03T12:00:00-05:00" })).toBe(
        true
      );
    });

    it("should return false if totalEntities is not a number", () => {
      const metadata = createValidMetadata();
      expect(isRelationshipsMetadata({ ...metadata, totalEntities: "2" })).toBe(false);
    });

    it("should return false if totalEntities is negative", () => {
      const metadata = createValidMetadata();
      expect(isRelationshipsMetadata({ ...metadata, totalEntities: -1 })).toBe(false);
    });

    it("should return false if totalRelationships is not a number", () => {
      const metadata = createValidMetadata();
      expect(isRelationshipsMetadata({ ...metadata, totalRelationships: "1" })).toBe(false);
    });

    it("should return false if totalRelationships is negative", () => {
      const metadata = createValidMetadata();
      expect(isRelationshipsMetadata({ ...metadata, totalRelationships: -1 })).toBe(false);
    });

    it("should return false if exportVersion is not semantic version", () => {
      const metadata = createValidMetadata();
      expect(isRelationshipsMetadata({ ...metadata, exportVersion: "1.0" })).toBe(false);
      expect(isRelationshipsMetadata({ ...metadata, exportVersion: "v1.0.0" })).toBe(false);
    });

    it("should accept valid semantic versions", () => {
      const metadata = createValidMetadata();
      expect(isRelationshipsMetadata({ ...metadata, exportVersion: "0.0.0" })).toBe(true);
      expect(isRelationshipsMetadata({ ...metadata, exportVersion: "1.2.3" })).toBe(true);
      expect(isRelationshipsMetadata({ ...metadata, exportVersion: "10.20.30" })).toBe(true);
    });
  });

  // ============================================================================
  // RelationshipsExport Type Guard Tests
  // ============================================================================

  describe("isRelationshipsExport", () => {
    it("should return true for valid export object", () => {
      const exportObj = createValidExport();
      expect(isRelationshipsExport(exportObj)).toBe(true);
    });

    it("should return false for null", () => {
      expect(isRelationshipsExport(null)).toBe(false);
    });

    it("should return false if metadata is invalid", () => {
      const exportObj = createValidExport();
      expect(isRelationshipsExport({ ...exportObj, metadata: {} })).toBe(false);
    });

    it("should return false if entities is not an object", () => {
      const exportObj = createValidExport();
      expect(isRelationshipsExport({ ...exportObj, entities: [] })).toBe(false);
    });

    it("should return true with empty entities", () => {
      const exportObj = createValidExport();
      expect(isRelationshipsExport({ ...exportObj, entities: {} })).toBe(true);
    });

    it("should return false if entities contain invalid items", () => {
      const exportObj = createValidExport();
      expect(
        isRelationshipsExport({
          ...exportObj,
          entities: { Test: { invalid: "object" } },
        })
      ).toBe(false);
    });

    it("should return false if relationships is not an array", () => {
      const exportObj = createValidExport();
      expect(isRelationshipsExport({ ...exportObj, relationships: {} })).toBe(false);
    });

    it("should return true with empty relationships", () => {
      const exportObj = createValidExport();
      expect(isRelationshipsExport({ ...exportObj, relationships: [] })).toBe(true);
    });

    it("should return false if relationships contain invalid items", () => {
      const exportObj = createValidExport();
      expect(
        isRelationshipsExport({
          ...exportObj,
          relationships: [{ invalid: "object" }],
        })
      ).toBe(false);
    });

    it("should accept multiple entities and relationships", () => {
      const exportObj = createValidExport();
      const userRel: RelationshipDefinition = {
        sourceEntity: "User",
        targetEntity: "Order",
        type: "hasMany",
        confidence: "high",
        detectedBy: ["schema_ref"],
        evidence: [createValidEvidence()],
      };
      const orderRel: RelationshipDefinition = {
        sourceEntity: "Order",
        targetEntity: "Product",
        type: "hasMany",
        confidence: "medium",
        detectedBy: ["naming_pattern"],
        evidence: [createValidEvidence()],
      };

      expect(
        isRelationshipsExport({
          ...exportObj,
          entities: {
            User: createValidEntity(),
            Order: { ...createValidEntity(), name: "Order" },
          },
          relationships: [userRel, orderRel],
        })
      ).toBe(true);
    });
  });

  // ============================================================================
  // Validator Function Tests
  // ============================================================================

  describe("validateRelationshipsExportData", () => {
    it("should return valid for correct export", () => {
      const exportObj = createValidExport();
      const result = validateRelationshipsExportData(exportObj);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return invalid for non-RelationshipsExport value", () => {
      const result = validateRelationshipsExportData({ invalid: "object" });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain("does not match");
    });

    it("should return invalid for null", () => {
      const result = validateRelationshipsExportData(null);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should include error paths", () => {
      const result = validateRelationshipsExportData({
        metadata: {},
        entities: {},
        relationships: [],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path)).toBe(true);
    });

    it("should validate complex nested structure", () => {
      const exportObj = createValidExport();
      const result = validateRelationshipsExportData(exportObj);

      expect(result.valid).toBe(true);
    });
  });

  // ============================================================================
  // Factory Function Tests
  // ============================================================================

  describe("createRelationshipsExport", () => {
    it("should create valid export from valid parameters", () => {
      const metadata = createValidMetadata();
      const entities = { User: createValidEntity() };
      const relationships = [createValidRelationship()];

      const exportObj = createRelationshipsExport(metadata, entities, relationships);

      expect(exportObj.metadata).toEqual(metadata);
      expect(exportObj.entities).toEqual(entities);
      expect(exportObj.relationships).toEqual(relationships);
    });

    it("should throw for invalid metadata", () => {
      const entities = { User: createValidEntity() };
      const relationships = [createValidRelationship()];

      expect(() => {
        createRelationshipsExport({} as RelationshipsMetadata, entities, relationships);
      }).toThrow();
    });

    it("should throw for invalid entities", () => {
      const metadata = createValidMetadata();
      const relationships = [createValidRelationship()];

      expect(() => {
        createRelationshipsExport(metadata, { User: {} as EntityDefinition }, relationships);
      }).toThrow();
    });

    it("should throw for invalid relationships", () => {
      const metadata = createValidMetadata();
      const entities = { User: createValidEntity() };

      expect(() => {
        createRelationshipsExport(metadata, entities, [
          { invalid: "object" } as unknown as RelationshipDefinition,
        ]);
      }).toThrow();
    });

    it("should include descriptive error messages", () => {
      const metadata = createValidMetadata();
      const entities = { User: createValidEntity() };
      const relationships = [{ invalid: "object" } as unknown as RelationshipDefinition];

      expect(() => {
        createRelationshipsExport(metadata, entities, relationships);
      }).toThrow("Invalid RelationshipsExport structure");
    });
  });

  // ============================================================================
  // Sorting Function Tests
  // ============================================================================

  describe("sortRelationships", () => {
    it("should return new array without mutating input", () => {
      const rel1 = createValidRelationship();
      const rel2 = { ...createValidRelationship(), targetEntity: "Product" };
      const original = [rel2, rel1];
      const originalCopy = [...original];

      sortRelationships(original);

      expect(original).toEqual(originalCopy);
    });

    it("should sort by sourceEntity then targetEntity", () => {
      const rel1: RelationshipDefinition = {
        sourceEntity: "User",
        targetEntity: "Order",
        type: "hasMany",
        confidence: "high",
        detectedBy: ["schema_ref"],
        evidence: [createValidEvidence()],
      };
      const rel2: RelationshipDefinition = {
        sourceEntity: "Order",
        targetEntity: "Product",
        type: "hasMany",
        confidence: "high",
        detectedBy: ["schema_ref"],
        evidence: [createValidEvidence()],
      };
      const rel3: RelationshipDefinition = {
        sourceEntity: "User",
        targetEntity: "Product",
        type: "hasMany",
        confidence: "high",
        detectedBy: ["schema_ref"],
        evidence: [createValidEvidence()],
      };

      const sorted = sortRelationships([rel2, rel1, rel3]);

      // Sorted: Order-Product, User-Order, User-Product (sorted by source then target)
      expect(sorted).toHaveLength(3);
      expect(sorted[0]).toEqual(rel2); // Order-Product comes first
      expect(sorted[1]).toEqual(rel1); // User-Order comes second
      expect(sorted[2]).toEqual(rel3); // User-Product comes third
    });

    it("should handle empty array", () => {
      const sorted = sortRelationships([]);
      expect(sorted).toEqual([]);
    });

    it("should handle single item", () => {
      const rel = createValidRelationship();
      const sorted = sortRelationships([rel]);
      expect(sorted).toEqual([rel]);
    });
  });

  describe("sortEntities", () => {
    it("should return new object without mutating input", () => {
      const entities = {
        Z: createValidEntity(),
        A: { ...createValidEntity(), name: "A" },
      };
      const original = { ...entities };

      sortEntities(entities);

      expect(entities).toEqual(original);
    });

    it("should sort keys alphabetically", () => {
      const entities = {
        User: createValidEntity(),
        Product: { ...createValidEntity(), name: "Product" },
        Order: { ...createValidEntity(), name: "Order" },
      };

      const sorted = sortEntities(entities);
      const keys = Object.keys(sorted);

      expect(keys).toEqual(["Order", "Product", "User"]);
    });

    it("should preserve entity values", () => {
      const userEntity = createValidEntity();
      const productEntity = { ...createValidEntity(), name: "Product" };
      const entities = {
        User: userEntity,
        Product: productEntity,
      };

      const sorted = sortEntities(entities);

      expect(sorted.User).toEqual(userEntity);
      expect(sorted.Product).toEqual(productEntity);
    });

    it("should handle empty object", () => {
      const sorted = sortEntities({});
      expect(sorted).toEqual({});
    });

    it("should handle single entity", () => {
      const entity = createValidEntity();
      const sorted = sortEntities({ User: entity });
      expect(sorted).toEqual({ User: entity });
    });
  });

  // ============================================================================
  // Edge Cases and Integration Tests
  // ============================================================================

  describe("validateRelationshipsExportData with schema errors", () => {
    it("should return errors from schema validation", () => {
      const exportObj = {
        metadata: createValidMetadata(),
        entities: {
          User: {
            name: "User",
            endpoints: [
              { method: "INVALID" as unknown as "GET", path: "/users" },
            ],
            relationships: [],
          },
        },
        relationships: [],
      };

      const result = validateRelationshipsExportData(
        exportObj as unknown
      );
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should include instance path in validation errors", () => {
      const invalidExport = {
        metadata: createValidMetadata(),
        entities: {
          User: { name: "", endpoints: [], relationships: [] },
        },
        relationships: [],
      };

      const result = validateRelationshipsExportData(invalidExport as unknown);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path)).toBe(true);
    });
  });

  describe("Edge cases and integration", () => {
    it("should handle relationships with all confidence levels", () => {
      const confidenceLevels: Array<"high" | "medium" | "low"> = ["high", "medium", "low"];

      confidenceLevels.forEach((confidence) => {
        const rel = { ...createValidRelationship(), confidence };
        expect(isRelationshipDefinition(rel)).toBe(true);
      });
    });

    it("should handle relationships with multiple detected sources", () => {
      const rel = {
        ...createValidRelationship(),
        detectedBy: ["schema_ref", "naming_pattern", "path_pattern"],
      };

      expect(isRelationshipDefinition(rel)).toBe(true);
    });

    it("should handle entities with many endpoints", () => {
      const endpoints = Array(10)
        .fill(null)
        .map((_, i) => ({
          method: "GET" as const,
          path: `/users/{id}/orders/${i}`,
          operationId: `getUserOrder${i}`,
        }));

      const entity = {
        name: "User",
        endpoints,
        relationships: [],
      };

      expect(isEntityDefinition(entity)).toBe(true);
    });

    it("should handle export with many entities and relationships", () => {
      const entities: Record<string, EntityDefinition> = {};
      const relationships: RelationshipDefinition[] = [];

      for (let i = 0; i < 5; i++) {
        const entityName = `Entity${i}`;
        entities[entityName] = {
          name: entityName,
          endpoints: [{ method: "GET", path: `/entity${i}` }],
          relationships: [],
        };
      }

      for (let i = 0; i < 10; i++) {
        relationships.push({
          sourceEntity: `Entity${i % 5}`,
          targetEntity: `Entity${(i + 1) % 5}`,
          type: "hasMany",
          confidence: "high",
          detectedBy: ["schema_ref"],
          evidence: [createValidEvidence()],
        });
      }

      const exportObj = {
        metadata: createValidMetadata(),
        entities,
        relationships,
      };

      expect(isRelationshipsExport(exportObj)).toBe(true);
    });

    it("should validate export with Unicode characters in descriptions", () => {
      const entity = {
        ...createValidEntity(),
        endpoints: [
          {
            method: "GET" as const,
            path: "/users",
            operationId: "getUsers",
            description: "获取用户列表 - Get users list 🚀",
          },
        ],
      };

      expect(isEntityDefinition(entity)).toBe(true);
    });

    it("should maintain type safety through round-trip validation", () => {
      const original = createValidExport();
      const validation = validateRelationshipsExportData(original);

      expect(validation.valid).toBe(true);
      expect(isRelationshipsExport(original)).toBe(true);
    });
  });
});
