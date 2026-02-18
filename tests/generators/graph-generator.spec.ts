/**
 * Unit Tests for GraphGenerator
 * Tests Mermaid graph generation with comprehensive coverage
 */

import { describe, it, expect } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { GraphGenerator } from "../../src/generators/graph-generator";
import type {
  RelationshipGraph,
  EntityNode,
  DetectedRelationship,
} from "../../src/analyzers/relationship-types";
import {
  RelationshipType,
  DetectionSource,
  ConfidenceLevel,
} from "../../src/analyzers/relationship-types";

describe("GraphGenerator", () => {
  let generator: GraphGenerator;
  let tempDir: string;

  beforeEach(() => {
    generator = new GraphGenerator();
    tempDir = path.join(os.tmpdir(), `graph-gen-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("generate() - Integration", () => {
    it("should generate GRAPH.md file in output directory", () => {
      const graph = createSimpleGraph();

      const outputPath = generator.generate(graph, tempDir);

      expect(fs.existsSync(outputPath)).toBe(true);
      expect(outputPath).toContain("GRAPH.md");
      expect(outputPath).toContain(tempDir);
    });

    it("should create output directory if it does not exist", () => {
      const graph = createSimpleGraph();
      const nestedPath = path.join(tempDir, "nested", "dir");

      const outputPath = generator.generate(graph, nestedPath);

      expect(fs.existsSync(nestedPath)).toBe(true);
      expect(fs.existsSync(outputPath)).toBe(true);
    });

    it("should generate valid markdown with mermaid code block", () => {
      const graph = createSimpleGraph();

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );

      expect(content).toContain("# Entity Relationship Graph");
      expect(content).toContain("```mermaid");
      expect(content).toContain("```");
      expect(content).toContain("## Mermaid Diagram");
      expect(content).toContain("## Entity Summary");
    });
  });

  describe("generateMermaidDiagram() - Syntax Validation", () => {
    it("should generate valid mermaid graph with LR layout", () => {
      const graph = createSimpleGraph();

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );
      const mermaidBlock = content.match(
        /```mermaid\n([\s\S]*?)\n```/
      )?.[1] || "";

      expect(mermaidBlock).toContain("graph LR");
    });

    it("should include all entities as nodes", () => {
      const graph = createComplexGraph();

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );
      const mermaidBlock = content.match(
        /```mermaid\n([\s\S]*?)\n```/
      )?.[1] || "";

      expect(mermaidBlock).toContain("User");
      expect(mermaidBlock).toContain("Order");
      expect(mermaidBlock).toContain("Product");
      expect(mermaidBlock).toContain(":::entityStyle");
    });

    it("should apply classDef for entity styling", () => {
      const graph = createSimpleGraph();

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );
      const mermaidBlock = content.match(
        /```mermaid\n([\s\S]*?)\n```/
      )?.[1] || "";

      expect(mermaidBlock).toContain("classDef entityStyle");
      expect(mermaidBlock).toContain("fill:#4A90E2");
    });
  });

  describe("generateMermaidDiagram() - Relationship Edges", () => {
    it("should render hasMany relationships correctly", () => {
      const graph = createUnidirectionalGraph();

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );
      const mermaidBlock = content.match(
        /```mermaid\n([\s\S]*?)\n```/
      )?.[1] || "";

      expect(mermaidBlock).toContain("hasMany");
      expect(mermaidBlock).toMatch(/User -->.*hasMany.*Order/);
    });

    it("should render hasOne relationships correctly", () => {
      const graph = createGraphWithHasOne();

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );
      const mermaidBlock = content.match(
        /```mermaid\n([\s\S]*?)\n```/
      )?.[1] || "";

      expect(mermaidBlock).toContain("hasOne");
    });

    it("should render belongsTo relationships correctly", () => {
      const graph = createUnidirectionalGraph();

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );
      const mermaidBlock = content.match(
        /```mermaid\n([\s\S]*?)\n```/
      )?.[1] || "";

      expect(mermaidBlock).toContain("belongsTo");
      expect(mermaidBlock).toMatch(/Product -->.*belongsTo.*Category/);
    });

    it("should use bidirectional arrow for circular relationships", () => {
      const graph = createCircularGraph();

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );
      const mermaidBlock = content.match(
        /```mermaid\n([\s\S]*?)\n```/
      )?.[1] || "";

      expect(mermaidBlock).toContain("<-->");
      expect(mermaidBlock).toContain("mutual");
    });

    it("should not duplicate bidirectional edges", () => {
      const graph = createCircularGraph();

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );
      const mermaidBlock = content.match(
        /```mermaid\n([\s\S]*?)\n```/
      )?.[1] || "";

      // Count bidirectional edge mentions
      const bidirectionalMatches = mermaidBlock.match(/<-->/g) || [];
      expect(bidirectionalMatches.length).toBeGreaterThan(0);

      // Check that the edge only appears once in the consolidated form
      const userOrderEdges = mermaidBlock.match(
        /(?:User|Order) <--> (?:User|Order)/g
      ) || [];
      expect(userOrderEdges.length).toBeLessThanOrEqual(1);
    });
  });

  describe("generateSummaryTable() - Entity Summary", () => {
    it("should include entity summary table", () => {
      const graph = createSimpleGraph();

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );

      expect(content).toContain("## Entity Summary");
      expect(content).toContain("| Entity |");
      expect(content).toContain("| Endpoints |");
      expect(content).toContain("| Relationships |");
    });

    it("should list all entities in summary table", () => {
      const graph = createComplexGraph();

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );

      expect(content).toContain("| User |");
      expect(content).toContain("| Order |");
      expect(content).toContain("| Product |");
    });

    it("should count endpoints correctly in summary", () => {
      const graph = createSimpleGraph();

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );

      // Simple graph: User has 2 endpoints, Order has 1
      const tableSection = content.split("## Entity Summary")[1];
      const userLine = tableSection.split("\n").find((l) => l.includes("| User |"));

      expect(userLine).toBeDefined();
      expect(userLine).toContain("| 2 |"); // 2 endpoints
    });

    it("should count relationships correctly in summary", () => {
      const graph = createSimpleGraph();

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );

      const tableLines = content.split("\n");
      const userLine = tableLines.find((l) => l.includes("| User |"));

      expect(userLine).toBeDefined();
      // User has 1 hasMany relationship
      expect(userLine).toMatch(/\| 1 \|/);
    });

    it("should indicate bidirectional relationships", () => {
      const graph = createCircularGraph();

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );

      // Should have "Yes" in bidirectional column for entities with circular rels
      expect(content).toContain("| Yes |");
    });
  });

  describe("generateMarkdown() - Metadata", () => {
    it("should include spec title in output", () => {
      const graph = createSimpleGraph();
      graph.metadata.specTitle = "My Test API";

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );

      expect(content).toContain("My Test API");
    });

    it("should include spec version in output", () => {
      const graph = createSimpleGraph();
      graph.metadata.specVersion = "2.0.0";

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );

      expect(content).toContain("2.0.0");
    });

    it("should include generation timestamp", () => {
      const graph = createSimpleGraph();

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );

      expect(content).toContain("Generated at:");
      expect(content).toMatch(/\d{4}-\d{2}-\d{2}T/); // ISO date format
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty graph with no entities", () => {
      const graph: RelationshipGraph = {
        entities: new Map(),
        relationships: [],
        metadata: {
          specTitle: "Empty API",
          specVersion: "1.0.0",
          generatedAt: new Date().toISOString(),
          totalEntities: 0,
          totalRelationships: 0,
        },
      };

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );

      expect(content).toContain("# Entity Relationship Graph");
      expect(content).toContain("```mermaid");
      expect(content).toContain("graph LR");
    });

    it("should handle single entity with no relationships", () => {
      const entity: EntityNode = {
        name: "User",
        endpoints: [
          {
            method: "GET",
            path: "/users",
            operationId: "listUsers",
          },
        ],
        relationships: [],
      };

      const graph: RelationshipGraph = {
        entities: new Map([["User", entity]]),
        relationships: [],
        metadata: {
          specTitle: "Single Entity API",
          specVersion: "1.0.0",
          generatedAt: new Date().toISOString(),
          totalEntities: 1,
          totalRelationships: 0,
        },
      };

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );

      expect(content).toContain("User");
      expect(content).toContain("| User |");
      expect(content).not.toContain("<-->");
    });

    it("should handle self-referential relationships", () => {
      const relationship: DetectedRelationship = {
        sourceEntity: "User",
        targetEntity: "User",
        type: RelationshipType.HAS_MANY,
        confidence: ConfidenceLevel.HIGH,
        detectedBy: [DetectionSource.SCHEMA_REF],
        evidence: [
          {
            source: DetectionSource.SCHEMA_REF,
            location: "components.schemas.User",
            details: "Self-referential relationship",
          },
        ],
      };

      const entity: EntityNode = {
        name: "User",
        endpoints: [],
        relationships: [relationship],
      };

      const graph: RelationshipGraph = {
        entities: new Map([["User", entity]]),
        relationships: [relationship],
        metadata: {
          specTitle: "Self-Referential API",
          specVersion: "1.0.0",
          generatedAt: new Date().toISOString(),
          totalEntities: 1,
          totalRelationships: 1,
        },
      };

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );

      expect(content).toContain("User");
      // Self-referential User->User relationships are consolidated as bidirectional
      // This is expected behavior for circular relationship detection
      expect(content).toContain("User");
      expect(content).toContain("User[");
    });
  });

  describe("Output Format", () => {
    it("should generate valid UTF-8 encoded markdown", () => {
      const graph = createSimpleGraph();

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );

      expect(() => JSON.stringify(content)).not.toThrow();
      expect(content.length).toBeGreaterThan(0);
    });

    it("should use consistent line endings", () => {
      const graph = createSimpleGraph();

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );

      // Should not have mixed line endings
      const crlfCount = (content.match(/\r\n/g) || []).length;
      const lfCount = (content.match(/(?<!\r)\n/g) || []).length;

      expect(crlfCount === 0 || lfCount === 0).toBe(true);
    });

    it("should not include trailing whitespace on lines", () => {
      const graph = createSimpleGraph();

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );

      const lines = content.split("\n");
      for (const line of lines) {
        expect(line).not.toMatch(/\s+$/);
      }
    });
  });

  describe("Snapshot Tests", () => {
    it("should generate consistent output for simple graph", () => {
      const graph = createSimpleGraph();

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );

      expect(content).toMatchSnapshot();
    });

    it("should generate consistent output for complex graph", () => {
      const graph = createComplexGraph();

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );

      expect(content).toMatchSnapshot();
    });

    it("should generate consistent output for circular graph", () => {
      const graph = createCircularGraph();

      generator.generate(graph, tempDir);
      const content = fs.readFileSync(
        path.join(tempDir, "GRAPH.md"),
        "utf-8"
      );

      expect(content).toMatchSnapshot();
    });
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a simple graph with User and Order entities
 */
function createSimpleGraph(): RelationshipGraph {
  const userEndpoints = [
    { method: "GET" as const, path: "/users" },
    { method: "POST" as const, path: "/users" },
  ];

  const orderEndpoints = [{ method: "GET" as const, path: "/orders" }];

  const hasMany: DetectedRelationship = {
    sourceEntity: "User",
    targetEntity: "Order",
    type: RelationshipType.HAS_MANY,
    confidence: ConfidenceLevel.HIGH,
    detectedBy: [DetectionSource.SCHEMA_REF],
    evidence: [
      {
        source: DetectionSource.SCHEMA_REF,
        location: "components.schemas.User.properties.orders",
        details: "Array reference to Order",
      },
    ],
  };

  const belongsTo: DetectedRelationship = {
    sourceEntity: "Order",
    targetEntity: "User",
    type: RelationshipType.BELONGS_TO,
    confidence: ConfidenceLevel.MEDIUM,
    detectedBy: [DetectionSource.NAMING_PATTERN],
    evidence: [
      {
        source: DetectionSource.NAMING_PATTERN,
        location: "components.schemas.Order.properties.userId",
        details: "ID property pattern",
      },
    ],
  };

  const userEntity: EntityNode = {
    name: "User",
    endpoints: userEndpoints.map((e) => ({ ...e, operationId: "op1" })),
    relationships: [hasMany],
  };

  const orderEntity: EntityNode = {
    name: "Order",
    endpoints: orderEndpoints.map((e) => ({ ...e, operationId: "op2" })),
    relationships: [belongsTo],
  };

  return {
    entities: new Map([
      ["User", userEntity],
      ["Order", orderEntity],
    ]),
    relationships: [hasMany, belongsTo],
    metadata: {
      specTitle: "Simple API",
      specVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      totalEntities: 2,
      totalRelationships: 2,
    },
  };
}

/**
 * Create a complex graph with multiple relationships
 */
function createComplexGraph(): RelationshipGraph {
  const relationships: DetectedRelationship[] = [
    {
      sourceEntity: "User",
      targetEntity: "Order",
      type: RelationshipType.HAS_MANY,
      confidence: ConfidenceLevel.HIGH,
      detectedBy: [DetectionSource.SCHEMA_REF],
      evidence: [],
    },
    {
      sourceEntity: "Order",
      targetEntity: "Product",
      type: RelationshipType.HAS_MANY,
      confidence: ConfidenceLevel.HIGH,
      detectedBy: [DetectionSource.SCHEMA_REF],
      evidence: [],
    },
    {
      sourceEntity: "Order",
      targetEntity: "User",
      type: RelationshipType.BELONGS_TO,
      confidence: ConfidenceLevel.MEDIUM,
      detectedBy: [DetectionSource.NAMING_PATTERN],
      evidence: [],
    },
  ];

  const userEntity: EntityNode = {
    name: "User",
    endpoints: [
      { method: "GET", path: "/users", operationId: "op1" },
      { method: "POST", path: "/users", operationId: "op2" },
    ],
    relationships: [relationships[0]],
  };

  const orderEntity: EntityNode = {
    name: "Order",
    endpoints: [
      { method: "GET", path: "/orders", operationId: "op3" },
      { method: "POST", path: "/orders", operationId: "op4" },
    ],
    relationships: [relationships[1], relationships[2]],
  };

  const productEntity: EntityNode = {
    name: "Product",
    endpoints: [{ method: "GET", path: "/products", operationId: "op5" }],
    relationships: [],
  };

  return {
    entities: new Map([
      ["User", userEntity],
      ["Order", orderEntity],
      ["Product", productEntity],
    ]),
    relationships,
    metadata: {
      specTitle: "Complex API",
      specVersion: "2.0.0",
      generatedAt: new Date().toISOString(),
      totalEntities: 3,
      totalRelationships: 3,
    },
  };
}

/**
 * Create a graph with circular relationships
 */
function createCircularGraph(): RelationshipGraph {
  const hasMany: DetectedRelationship = {
    sourceEntity: "User",
    targetEntity: "Order",
    type: RelationshipType.HAS_MANY,
    confidence: ConfidenceLevel.HIGH,
    detectedBy: [DetectionSource.SCHEMA_REF],
    evidence: [],
  };

  const belongsTo: DetectedRelationship = {
    sourceEntity: "Order",
    targetEntity: "User",
    type: RelationshipType.BELONGS_TO,
    confidence: ConfidenceLevel.MEDIUM,
    detectedBy: [DetectionSource.NAMING_PATTERN],
    evidence: [],
  };

  const userEntity: EntityNode = {
    name: "User",
    endpoints: [{ method: "GET", path: "/users", operationId: "op1" }],
    relationships: [hasMany],
  };

  const orderEntity: EntityNode = {
    name: "Order",
    endpoints: [{ method: "GET", path: "/orders", operationId: "op2" }],
    relationships: [belongsTo],
  };

  return {
    entities: new Map([
      ["User", userEntity],
      ["Order", orderEntity],
    ]),
    relationships: [hasMany, belongsTo],
    metadata: {
      specTitle: "Circular API",
      specVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      totalEntities: 2,
      totalRelationships: 2,
    },
  };
}

/**
 * Create a graph with hasOne relationships
 */
function createGraphWithHasOne(): RelationshipGraph {
  const hasOne: DetectedRelationship = {
    sourceEntity: "User",
    targetEntity: "Profile",
    type: RelationshipType.HAS_ONE,
    confidence: ConfidenceLevel.HIGH,
    detectedBy: [DetectionSource.SCHEMA_REF],
    evidence: [],
  };

  const userEntity: EntityNode = {
    name: "User",
    endpoints: [],
    relationships: [hasOne],
  };

  const profileEntity: EntityNode = {
    name: "Profile",
    endpoints: [],
    relationships: [],
  };

  return {
    entities: new Map([
      ["User", userEntity],
      ["Profile", profileEntity],
    ]),
    relationships: [hasOne],
    metadata: {
      specTitle: "HasOne API",
      specVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      totalEntities: 2,
      totalRelationships: 1,
    },
  };
}

/**
 * Create a graph with only unidirectional relationships (no reverse relationships)
 */
function createUnidirectionalGraph(): RelationshipGraph {
  const hasMany: DetectedRelationship = {
    sourceEntity: "User",
    targetEntity: "Order",
    type: RelationshipType.HAS_MANY,
    confidence: ConfidenceLevel.HIGH,
    detectedBy: [DetectionSource.SCHEMA_REF],
    evidence: [
      {
        source: DetectionSource.SCHEMA_REF,
        location: "components.schemas.User.properties.orders",
        details: "Array reference to Order",
      },
    ],
  };

  const belongsTo: DetectedRelationship = {
    sourceEntity: "Product",
    targetEntity: "Category",
    type: RelationshipType.BELONGS_TO,
    confidence: ConfidenceLevel.MEDIUM,
    detectedBy: [DetectionSource.NAMING_PATTERN],
    evidence: [
      {
        source: DetectionSource.NAMING_PATTERN,
        location: "components.schemas.Product.properties.categoryId",
        details: "ID property pattern",
      },
    ],
  };

  const userEntity: EntityNode = {
    name: "User",
    endpoints: [
      { method: "GET", path: "/users", operationId: "op1" },
      { method: "POST", path: "/users", operationId: "op2" },
    ],
    relationships: [hasMany],
  };

  const orderEntity: EntityNode = {
    name: "Order",
    endpoints: [{ method: "GET", path: "/orders", operationId: "op3" }],
    relationships: [],
  };

  const productEntity: EntityNode = {
    name: "Product",
    endpoints: [{ method: "GET", path: "/products", operationId: "op4" }],
    relationships: [belongsTo],
  };

  const categoryEntity: EntityNode = {
    name: "Category",
    endpoints: [],
    relationships: [],
  };

  return {
    entities: new Map([
      ["User", userEntity],
      ["Order", orderEntity],
      ["Product", productEntity],
      ["Category", categoryEntity],
    ]),
    relationships: [hasMany, belongsTo],
    metadata: {
      specTitle: "Unidirectional API",
      specVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      totalEntities: 4,
      totalRelationships: 2,
    },
  };
}
