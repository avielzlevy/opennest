/**
 * Integration Tests for RELATIONSHIPS.json Generation
 * Tests end-to-end JSON generation with real OpenAPI specs
 */

import { describe, it, expect, beforeAll, afterEach } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as yaml from "js-yaml";
import { OpenAPIV3 } from "openapi-types";
import { RelationshipDetector } from "../../src/analyzers/relationship-detector";
import { RelationshipsJsonGenerator } from "../../src/generators/relationships-json-generator";
import {
  validateRelationshipsExportData,
  isRelationshipsExport,
  type RelationshipsExport,
} from "../../src/generators/relationships-schema";

describe("RELATIONSHIPS.json Generation Integration", () => {
  let tempDir: string;
  let petstoreSpec: OpenAPIV3.Document;
  let petstoreExpandedSpec: OpenAPIV3.Document;

  // Helper: Load OpenAPI spec from fixture file
  function loadSpecFromFile(filename: string): OpenAPIV3.Document {
    const fixturePath = path.resolve(__dirname, "../fixtures/real-world", filename);
    const fileContent = fs.readFileSync(fixturePath, "utf8");
    return yaml.load(fileContent) as OpenAPIV3.Document;
  }

  beforeAll(() => {
    // Load specs once for all tests
    petstoreSpec = loadSpecFromFile("petstore.yaml");
    petstoreExpandedSpec = loadSpecFromFile("petstore-expanded.yaml");
  });

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `rel-json-integration-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ============================================================================
  // Petstore Spec Tests
  // ============================================================================

  describe("Petstore Spec Integration", () => {
    it("should generate valid RELATIONSHIPS.json from petstore.yaml", () => {
      // Detect relationships
      const detector = new RelationshipDetector();
      const graph = detector.analyze(petstoreSpec as any);

      // Generate RELATIONSHIPS.json
      const generator = new RelationshipsJsonGenerator();
      const outputPath = generator.generate(graph, tempDir);

      // Verify file exists
      expect(fs.existsSync(outputPath)).toBe(true);
      expect(outputPath).toContain("RELATIONSHIPS.json");
    });

    it("should parse generated JSON correctly", () => {
      const detector = new RelationshipDetector();
      const graph = detector.analyze(petstoreSpec as any);

      const generator = new RelationshipsJsonGenerator();
      generator.generate(graph, tempDir);

      const content = fs.readFileSync(
        path.join(tempDir, "RELATIONSHIPS.json"),
        "utf-8"
      );

      // Should parse without errors
      const parsed = JSON.parse(content);
      expect(typeof parsed).toBe("object");
      expect(parsed).not.toBeNull();
    });

    it("should validate generated JSON against schema", () => {
      const detector = new RelationshipDetector();
      const graph = detector.analyze(petstoreSpec as any);

      const generator = new RelationshipsJsonGenerator();
      generator.generate(graph, tempDir);

      const content = fs.readFileSync(
        path.join(tempDir, "RELATIONSHIPS.json"),
        "utf-8"
      );
      const parsed = JSON.parse(content);

      const validation = validateRelationshipsExportData(parsed);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it("should have correct metadata structure", () => {
      const detector = new RelationshipDetector();
      const graph = detector.analyze(petstoreSpec as any);

      const generator = new RelationshipsJsonGenerator();
      generator.generate(graph, tempDir);

      const content = fs.readFileSync(
        path.join(tempDir, "RELATIONSHIPS.json"),
        "utf-8"
      );
      const parsed: RelationshipsExport = JSON.parse(content);

      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.specTitle).toBe("Swagger Petstore");
      expect(parsed.metadata.specVersion).toBe("1.0.0");
      expect(parsed.metadata.exportVersion).toBe("1.0.0");
      expect(typeof parsed.metadata.generatedAt).toBe("string");
      expect(parsed.metadata.totalEntities).toBeGreaterThan(0);
      expect(parsed.metadata.totalRelationships).toBeGreaterThanOrEqual(0);
    });

    it("should have entities with endpoints", () => {
      const detector = new RelationshipDetector();
      const graph = detector.analyze(petstoreSpec as any);

      const generator = new RelationshipsJsonGenerator();
      generator.generate(graph, tempDir);

      const content = fs.readFileSync(
        path.join(tempDir, "RELATIONSHIPS.json"),
        "utf-8"
      );
      const parsed: RelationshipsExport = JSON.parse(content);

      expect(Object.keys(parsed.entities).length).toBeGreaterThan(0);

      // Each entity should have endpoints array
      for (const entity of Object.values(parsed.entities)) {
        expect(Array.isArray(entity.endpoints)).toBe(true);
        expect(entity.endpoints.length).toBeGreaterThanOrEqual(0);

        // Each endpoint should have method and path
        for (const endpoint of entity.endpoints) {
          expect(["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]).toContain(
            endpoint.method
          );
          expect(typeof endpoint.path).toBe("string");
          expect(endpoint.path.length).toBeGreaterThan(0);
        }
      }
    });

    it("should have relationships with complete structure", () => {
      const detector = new RelationshipDetector();
      const graph = detector.analyze(petstoreSpec as any);

      const generator = new RelationshipsJsonGenerator();
      generator.generate(graph, tempDir);

      const content = fs.readFileSync(
        path.join(tempDir, "RELATIONSHIPS.json"),
        "utf-8"
      );
      const parsed: RelationshipsExport = JSON.parse(content);

      expect(Array.isArray(parsed.relationships)).toBe(true);

      // Each relationship should have required fields
      for (const rel of parsed.relationships) {
        expect(typeof rel.sourceEntity).toBe("string");
        expect(typeof rel.targetEntity).toBe("string");
        expect(["hasMany", "hasOne", "belongsTo"]).toContain(rel.type);
        expect(["high", "medium", "low"]).toContain(rel.confidence);
        expect(Array.isArray(rel.detectedBy)).toBe(true);
        expect(rel.detectedBy.length).toBeGreaterThan(0);
        expect(Array.isArray(rel.evidence)).toBe(true);
        expect(rel.evidence.length).toBeGreaterThan(0);

        // Each evidence should have required fields
        for (const ev of rel.evidence) {
          expect(["schema_ref", "naming_pattern", "path_pattern"]).toContain(
            ev.source
          );
          expect(typeof ev.location).toBe("string");
          expect(typeof ev.details).toBe("string");
        }
      }
    });

    it("should be recognized as valid RelationshipsExport type", () => {
      const detector = new RelationshipDetector();
      const graph = detector.analyze(petstoreSpec as any);

      const generator = new RelationshipsJsonGenerator();
      generator.generate(graph, tempDir);

      const content = fs.readFileSync(
        path.join(tempDir, "RELATIONSHIPS.json"),
        "utf-8"
      );
      const parsed = JSON.parse(content);

      expect(isRelationshipsExport(parsed)).toBe(true);
    });

    it("should generate ISO 8601 timestamp", () => {
      const detector = new RelationshipDetector();
      const graph = detector.analyze(petstoreSpec as any);

      const generator = new RelationshipsJsonGenerator();
      generator.generate(graph, tempDir);

      const content = fs.readFileSync(
        path.join(tempDir, "RELATIONSHIPS.json"),
        "utf-8"
      );
      const parsed: RelationshipsExport = JSON.parse(content);

      const timestamp = parsed.metadata.generatedAt;
      const date = new Date(timestamp);

      // Should be valid ISO 8601
      expect(!isNaN(date.getTime())).toBe(true);
      expect(timestamp).toContain("T");
      expect(timestamp).toMatch(/Z|[+-]\d{2}:\d{2}$/);
    });

    it("should have semantic versioning format", () => {
      const detector = new RelationshipDetector();
      const graph = detector.analyze(petstoreSpec as any);

      const generator = new RelationshipsJsonGenerator();
      generator.generate(graph, tempDir);

      const content = fs.readFileSync(
        path.join(tempDir, "RELATIONSHIPS.json"),
        "utf-8"
      );
      const parsed: RelationshipsExport = JSON.parse(content);

      expect(parsed.metadata.exportVersion).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  // ============================================================================
  // Petstore Expanded Spec Tests
  // ============================================================================

  describe("Petstore Expanded Spec Integration", () => {
    it("should generate valid RELATIONSHIPS.json from petstore-expanded.yaml", () => {
      const detector = new RelationshipDetector();
      const graph = detector.analyze(petstoreExpandedSpec as any);

      const generator = new RelationshipsJsonGenerator();
      const outputPath = generator.generate(graph, tempDir);

      expect(fs.existsSync(outputPath)).toBe(true);
    });

    it("should validate expanded spec output against schema", () => {
      const detector = new RelationshipDetector();
      const graph = detector.analyze(petstoreExpandedSpec as any);

      const generator = new RelationshipsJsonGenerator();
      generator.generate(graph, tempDir);

      const content = fs.readFileSync(
        path.join(tempDir, "RELATIONSHIPS.json"),
        "utf-8"
      );
      const parsed = JSON.parse(content);

      const validation = validateRelationshipsExportData(parsed);
      expect(validation.valid).toBe(true);
    });

    it("should handle expanded spec with complex relationships", () => {
      const detector = new RelationshipDetector();
      const graph = detector.analyze(petstoreExpandedSpec as any);

      const generator = new RelationshipsJsonGenerator();
      generator.generate(graph, tempDir);

      const content = fs.readFileSync(
        path.join(tempDir, "RELATIONSHIPS.json"),
        "utf-8"
      );
      const parsed: RelationshipsExport = JSON.parse(content);

      // Should have entities and potentially relationships
      expect(Object.keys(parsed.entities).length).toBeGreaterThan(0);
      expect(Array.isArray(parsed.relationships)).toBe(true);

      // Verify structure integrity
      for (const entity of Object.values(parsed.entities)) {
        expect(typeof entity.name).toBe("string");
        expect(Array.isArray(entity.endpoints)).toBe(true);
        expect(Array.isArray(entity.relationships)).toBe(true);
      }
    });
  });

  // ============================================================================
  // Full Pipeline Integration Tests
  // ============================================================================

  describe("Full Generation Pipeline", () => {
    it("should generate consistent results on multiple runs", () => {
      const detector = new RelationshipDetector();
      const graph = detector.analyze(petstoreSpec as any);

      // Generate first time
      const tempDir1 = path.join(tempDir, "run1");
      const generator1 = new RelationshipsJsonGenerator();
      generator1.generate(graph, tempDir1);

      // Generate second time with same graph
      const tempDir2 = path.join(tempDir, "run2");
      const generator2 = new RelationshipsJsonGenerator();
      generator2.generate(graph, tempDir2);

      // Parse both outputs
      const content1 = fs.readFileSync(
        path.join(tempDir1, "RELATIONSHIPS.json"),
        "utf-8"
      );
      const content2 = fs.readFileSync(
        path.join(tempDir2, "RELATIONSHIPS.json"),
        "utf-8"
      );

      const parsed1 = JSON.parse(content1);
      const parsed2 = JSON.parse(content2);

      // Compare structure (generatedAt will differ, so check everything else)
      expect(parsed1.metadata.specTitle).toBe(parsed2.metadata.specTitle);
      expect(parsed1.metadata.specVersion).toBe(parsed2.metadata.specVersion);
      expect(parsed1.metadata.totalEntities).toBe(parsed2.metadata.totalEntities);
      expect(parsed1.metadata.totalRelationships).toBe(
        parsed2.metadata.totalRelationships
      );
      expect(Object.keys(parsed1.entities)).toEqual(Object.keys(parsed2.entities));
      expect(parsed1.relationships.length).toBe(parsed2.relationships.length);
    });

    it("should be readable after Detector and before schema validation", () => {
      // Full pipeline
      const detector = new RelationshipDetector();
      const graph = detector.analyze(petstoreSpec as any);

      const generator = new RelationshipsJsonGenerator();
      generator.generate(graph, tempDir);

      const content = fs.readFileSync(
        path.join(tempDir, "RELATIONSHIPS.json"),
        "utf-8"
      );
      const parsed = JSON.parse(content);

      // Should validate
      expect(validateRelationshipsExportData(parsed).valid).toBe(true);
      expect(isRelationshipsExport(parsed)).toBe(true);
    });

    it("should create properly formatted JSON with indentation", () => {
      const detector = new RelationshipDetector();
      const graph = detector.analyze(petstoreSpec as any);

      const generator = new RelationshipsJsonGenerator();
      generator.generate(graph, tempDir);

      const content = fs.readFileSync(
        path.join(tempDir, "RELATIONSHIPS.json"),
        "utf-8"
      );

      // Should have newlines and indentation
      expect(content).toContain("\n");
      expect(content).toMatch(/\n  "/); // 2-space indent for top-level keys

      // Split by lines and verify structure
      const lines = content.split("\n");
      expect(lines.length).toBeGreaterThan(10);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe("Error Handling", () => {
    it("should create valid JSON even with minimal entities", () => {
      const detector = new RelationshipDetector();
      const graph = detector.analyze(petstoreSpec as any);

      const generator = new RelationshipsJsonGenerator();
      const outputPath = generator.generate(graph, tempDir);

      // File should exist and be valid
      expect(fs.existsSync(outputPath)).toBe(true);

      const content = fs.readFileSync(outputPath, "utf-8");
      const parsed = JSON.parse(content); // Should parse without error

      expect(parsed).toBeDefined();
    });
  });
});
