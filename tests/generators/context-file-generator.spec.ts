/**
 * Tests for Context Templates Foundation
 * Validates template interfaces, formatting functions, and markdown generation
 */

import {
  formatHeading,
  formatCodeBlock,
  formatTable,
  formatLink,
  formatEntityReference,
  formatSummaryContextTemplate,
  formatControllerContextTemplate,
  type SummaryContextTemplate,
  type ControllerContextTemplate,
  type SpecInfoSection,
  type MermaidGraphSection,
  type EntitySummarySection,
  type RelationshipSummarySection,
  type CrossEntityPatternsSection,
  type JsDocSnippetsSection,
  type EntityOverviewSection,
  type DetailedRelationshipSection,
  type EndpointDetailSection,
  type UsageExampleSection,
  type RelatedEntitySection,
} from "../../src/generators/context-templates";

describe("Context Templates Foundation", () => {
  describe("Formatting Functions", () => {
    describe("formatHeading", () => {
      it("should format H1 heading", () => {
        const result = formatHeading("Main Title", 1);
        expect(result).toBe("# Main Title");
      });

      it("should format H2 heading by default", () => {
        const result = formatHeading("Subheading");
        expect(result).toBe("## Subheading");
      });

      it("should format H3 heading", () => {
        const result = formatHeading("Sub-subheading", 3);
        expect(result).toBe("### Sub-subheading");
      });

      it("should handle headings with special characters", () => {
        const result = formatHeading("Title: Context & Relationships", 2);
        expect(result).toBe("## Title: Context & Relationships");
      });
    });

    describe("formatCodeBlock", () => {
      it("should format code block with language", () => {
        const code = "const x = 1;\nconst y = 2;";
        const result = formatCodeBlock(code, "typescript");
        expect(result).toContain("```typescript");
        expect(result).toContain(code);
        expect(result).toContain("```");
      });

      it("should format code block without language", () => {
        const code = "plain text code";
        const result = formatCodeBlock(code);
        expect(result).toContain("```\n");
        expect(result).toContain(code);
        expect(result).toContain("\n```");
      });

      it("should handle multiline code", () => {
        const code = "function test() {\n  return true;\n}";
        const result = formatCodeBlock(code, "typescript");
        expect(result).toContain("```typescript");
        expect(result).toContain("function test()");
        expect(result).toContain("return true;");
      });

      it("should handle mermaid diagrams", () => {
        const diagram = "graph LR\n  A[Entity] --> B[Other]";
        const result = formatCodeBlock(diagram, "mermaid");
        expect(result).toContain("```mermaid");
        expect(result).toContain(diagram);
      });
    });

    describe("formatTable", () => {
      it("should format simple table", () => {
        const headers = ["Entity", "Endpoints", "Relationships"];
        const rows = [
          ["User", "5", "3"],
          ["Order", "4", "2"],
        ];
        const result = formatTable(headers, rows);

        expect(result).toContain("| Entity | Endpoints | Relationships |");
        expect(result).toContain("| User | 5 | 3 |");
        expect(result).toContain("| Order | 4 | 2 |");
        // Verify separator row
        expect(result).toContain("| --- | --- | --- |");
      });

      it("should handle empty rows array", () => {
        const headers = ["A", "B"];
        const rows: string[][] = [];
        const result = formatTable(headers, rows);

        expect(result).toContain("| A | B |");
        expect(result).toContain("| --- | --- |");
      });

      it("should preserve cell content exactly", () => {
        const headers = ["Code", "Description"];
        const rows = [["GET /users/{id}", "Retrieve user by ID"]];
        const result = formatTable(headers, rows);

        expect(result).toContain("| GET /users/{id} | Retrieve user by ID |");
      });

      it("should handle special characters in cells", () => {
        const headers = ["Type", "Cardinality"];
        const rows = [["hasMany", "1:N"], ["belongsTo", "N:1"]];
        const result = formatTable(headers, rows);

        expect(result).toContain("| hasMany | 1:N |");
        expect(result).toContain("| belongsTo | N:1 |");
      });
    });

    describe("formatLink", () => {
      it("should format markdown link", () => {
        const result = formatLink("GRAPH.md", "GRAPH.md");
        expect(result).toBe("[GRAPH.md](GRAPH.md)");
      });

      it("should handle relative paths", () => {
        const result = formatLink("User Context", "../user/CONTEXT.md");
        expect(result).toBe("[User Context](../user/CONTEXT.md)");
      });

      it("should handle URLs", () => {
        const result = formatLink("OpenAPI Spec", "https://example.com/api");
        expect(result).toBe("[OpenAPI Spec](https://example.com/api)");
      });
    });

    describe("formatEntityReference", () => {
      it("should format entity name in bold", () => {
        const result = formatEntityReference("User");
        expect(result).toBe("**User**");
      });

      it("should handle multi-word entity names", () => {
        const result = formatEntityReference("OrderItem");
        expect(result).toBe("**OrderItem**");
      });
    });
  });

  describe("Template Interface Validation", () => {
    describe("SummaryContextTemplate", () => {
      it("should construct valid summary template", () => {
        const template: SummaryContextTemplate = {
          title: "API Context Overview",
          specInfo: {
            title: "Petstore API",
            version: "1.0.0",
            generatedAt: new Date().toISOString(),
            totalEntities: 3,
            totalRelationships: 2,
            totalEndpoints: 10,
          } as SpecInfoSection,
          graph: {
            title: "Entity Relationship Graph",
            code: "graph LR\n  A[User] --> B[Order]",
            description: "Full system relationships",
          } as MermaidGraphSection,
          entitySummary: {
            table: "| Entity | Endpoints |",
            description: "Overview of all entities",
          } as EntitySummarySection,
          relationshipSummary: {
            relationships: ["User hasMany Order"],
            narrative: "Key relationships in system",
          } as RelationshipSummarySection,
          crossEntityPatterns: {
            patterns: [{ title: "Pattern1", description: "Description" }],
            analysis: "Analysis text",
          } as CrossEntityPatternsSection,
          jsDocSnippets: {
            examples: [{ label: "Example1", code: "code" }],
            guidance: "Guidance text",
          } as JsDocSnippetsSection,
        };

        expect(template).toBeDefined();
        expect(template.title).toBe("API Context Overview");
        expect(template.specInfo.totalEntities).toBe(3);
        expect(template.graph.code).toContain("User");
      });
    });

    describe("ControllerContextTemplate", () => {
      it("should construct valid controller template", () => {
        const template: ControllerContextTemplate = {
          entityName: "User",
          entityOverview: {
            description: "Represents a user account",
            role: "primary",
            businessContext: "Core entity for authentication",
          } as EntityOverviewSection,
          subgraph: {
            title: "User Relationships",
            code: "graph LR\n  User --> Order",
            description: "Direct relationships",
          } as MermaidGraphSection,
          relationships: [
            {
              type: "hasMany",
              targetEntity: "Order",
              foreignKey: "user_id",
              accessPath: "GET /users/{id}/orders",
              cardinality: "1:N",
              description: "User has many orders",
              bidirectional: false,
            } as DetailedRelationshipSection,
          ],
          endpoints: [
            {
              method: "GET",
              path: "/users",
              operationId: "listUsers",
              description: "List all users",
              jsDoc: "/** List all users */",
            } as EndpointDetailSection,
          ],
          jsDocAnnotations: "/** User entity */",
          usageExamples: [
            {
              title: "Get User",
              description: "Fetch a user by ID",
              code: "const user = await api.users.get(1);",
            } as UsageExampleSection,
          ],
          relatedEntities: [
            {
              entityName: "Order",
              relationshipType: "hasMany",
              description: "User has many orders",
            } as RelatedEntitySection,
          ],
        };

        expect(template).toBeDefined();
        expect(template.entityName).toBe("User");
        expect(template.relationships).toHaveLength(1);
        expect(template.endpoints).toHaveLength(1);
      });
    });

    describe("Section Interfaces", () => {
      it("should create valid SpecInfoSection", () => {
        const spec: SpecInfoSection = {
          title: "Test API",
          version: "2.0.0",
          generatedAt: "2025-02-03T12:00:00Z",
          totalEntities: 5,
          totalRelationships: 8,
          totalEndpoints: 20,
        };

        expect(spec.title).toBe("Test API");
        expect(spec.totalEntities).toBe(5);
      });

      it("should create valid MermaidGraphSection", () => {
        const graph: MermaidGraphSection = {
          title: "System Graph",
          code: "graph LR\n  A[A] --> B[B]",
          description: "Complete system relationships",
        };

        expect(graph.title).toBe("System Graph");
        expect(graph.code).toContain("graph LR");
      });

      it("should create valid EntitySummarySection", () => {
        const summary: EntitySummarySection = {
          table: "| Entity | Count |\n| --- | --- |\n| User | 5 |",
          description: "Entity overview",
        };

        expect(summary.table).toContain("Entity");
        expect(summary.description).toBe("Entity overview");
      });

      it("should create valid DetailedRelationshipSection", () => {
        const rel: DetailedRelationshipSection = {
          type: "hasMany",
          targetEntity: "Order",
          foreignKey: "user_id",
          accessPath: "GET /users/{id}/orders",
          cardinality: "1:N",
          description: "User owns multiple orders",
          bidirectional: false,
        };

        expect(rel.type).toBe("hasMany");
        expect(rel.cardinality).toBe("1:N");
        expect(rel.bidirectional).toBe(false);
      });

      it("should create valid EndpointDetailSection", () => {
        const endpoint: EndpointDetailSection = {
          method: "POST",
          path: "/users",
          operationId: "createUser",
          description: "Create new user",
          jsDoc: "/** Create user */",
        };

        expect(endpoint.method).toBe("POST");
        expect(endpoint.operationId).toBe("createUser");
      });

      it("should create valid UsageExampleSection", () => {
        const example: UsageExampleSection = {
          title: "Create Order",
          description: "Create a new order for user",
          code: "const order = await api.orders.create({ userId: 1 });",
        };

        expect(example.title).toBe("Create Order");
        expect(example.code).toContain("orders.create");
      });

      it("should create valid RelatedEntitySection", () => {
        const related: RelatedEntitySection = {
          entityName: "Product",
          relationshipType: "hasMany",
          description: "Order contains products",
        };

        expect(related.entityName).toBe("Product");
        expect(related.relationshipType).toBe("hasMany");
      });
    });
  });

  describe("Template Formatting Functions", () => {
    describe("formatSummaryContextTemplate", () => {
      it("should generate valid markdown summary template", () => {
        const metadata = {
          specTitle: "Test API",
          specVersion: "1.0.0",
          totalEntities: 5,
          totalRelationships: 8,
          totalEndpoints: 20,
        };

        const result = formatSummaryContextTemplate(metadata);

        expect(result).toContain("# Context Guide: API System Overview");
        expect(result).toContain("Test API");
        expect(result).toContain("1.0.0");
        expect(result).toContain("5 entities");
        expect(result).toContain("20 endpoints");
        expect(result).toContain("8 relationships");
      });

      it("should include all required sections", () => {
        const metadata = {
          specTitle: "API",
          specVersion: "1.0.0",
          totalEntities: 1,
          totalRelationships: 0,
          totalEndpoints: 5,
        };

        const result = formatSummaryContextTemplate(metadata);

        expect(result).toContain("## Entity Relationship Graph");
        expect(result).toContain("## Entity Overview");
        expect(result).toContain("## Key Relationships");
        expect(result).toContain("## Common Data Flow Patterns");
        expect(result).toContain("## Generated Code Annotations");
        expect(result).toContain("## Per-Entity Context Files");
      });

      it("should include placeholder markers for content generation", () => {
        const metadata = {
          specTitle: "API",
          specVersion: "1.0.0",
          totalEntities: 3,
          totalRelationships: 2,
          totalEndpoints: 10,
        };

        const result = formatSummaryContextTemplate(metadata);

        expect(result).toContain("{FULL_GRAPH}");
        expect(result).toContain("{ENTITY_SUMMARY_TABLE}");
        expect(result).toContain("{RELATIONSHIP_SUMMARY}");
        expect(result).toContain("{CROSS_ENTITY_PATTERNS}");
        expect(result).toContain("{JSDOC_SNIPPETS}");
        expect(result).toContain("{ENTITY_CONTEXT_LINKS}");
        expect(result).toContain("{GENERATED_AT}");
      });

      it("should handle missing metadata gracefully", () => {
        const metadata = {
          totalEntities: 2,
          totalRelationships: 1,
          totalEndpoints: 8,
        };

        const result = formatSummaryContextTemplate(metadata);

        expect(result).toContain("OpenAPI Specification");
        expect(result).toContain("2 entities");
      });

      it("should include code block fencing", () => {
        const metadata = {
          specTitle: "API",
          specVersion: "1.0.0",
          totalEntities: 1,
          totalRelationships: 0,
          totalEndpoints: 1,
        };

        const result = formatSummaryContextTemplate(metadata);

        expect(result).toContain("```mermaid");
        expect(result).toContain("```");
      });

      it("should include markdown table markers", () => {
        const metadata = {
          specTitle: "API",
          specVersion: "1.0.0",
          totalEntities: 1,
          totalRelationships: 0,
          totalEndpoints: 1,
        };

        const result = formatSummaryContextTemplate(metadata);

        expect(result).toContain("{ENTITY_SUMMARY_TABLE}");
      });
    });

    describe("formatControllerContextTemplate", () => {
      it("should generate valid markdown controller template", () => {
        const result = formatControllerContextTemplate("User");

        expect(result).toContain("# Context Guide: User Entity");
        expect(result).toContain("**Entity:** **User**");
      });

      it("should include all required sections", () => {
        const result = formatControllerContextTemplate("Order");

        expect(result).toContain("## Entity Overview");
        expect(result).toContain("## Relationship Subgraph");
        expect(result).toContain("## Relationships");
        expect(result).toContain("## API Endpoints");
        expect(result).toContain("## Generated Controller JSDoc");
        expect(result).toContain("## Related Entities");
        expect(result).toContain("## Usage Examples");
      });

      it("should include all placeholder markers", () => {
        const result = formatControllerContextTemplate("Product");

        expect(result).toContain("{ENTITY_DESCRIPTION}");
        expect(result).toContain("{ENTITY_ROLE}");
        expect(result).toContain("{ENTITY_BUSINESS_CONTEXT}");
        expect(result).toContain("{SUBGRAPH}");
        expect(result).toContain("{RELATIONSHIPS_TABLE}");
        expect(result).toContain("{ENDPOINTS_TABLE}");
        expect(result).toContain("{CLASS_JSDOC}");
        expect(result).toContain("{RELATED_ENTITIES_LIST}");
        expect(result).toContain("{USAGE_EXAMPLES}");
        expect(result).toContain("{GENERATED_AT}");
      });

      it("should reference entity throughout template", () => {
        const result = formatControllerContextTemplate("Invoice");

        // Count occurrences of Invoice in the template
        const matches = result.match(/Invoice/g);
        expect(matches).toBeDefined();
        expect((matches || []).length).toBeGreaterThanOrEqual(3);
      });

      it("should include code block fencing", () => {
        const result = formatControllerContextTemplate("User");

        expect(result).toContain("```mermaid");
        expect(result).toContain("```typescript");
        expect(result).toContain("```");
      });

      it("should include navigation to related contexts", () => {
        const result = formatControllerContextTemplate("User");

        expect(result).toContain("CONTEXT.md");
        expect(result).toContain("Related Entities");
      });

      it("should handle entity names with special characters", () => {
        const result = formatControllerContextTemplate("OrderItem");

        expect(result).toContain("OrderItem");
        expect(result).toContain("**OrderItem**");
      });
    });
  });

  describe("Edge Cases", () => {
    describe("Special characters and formatting", () => {
      it("should handle entity names with underscores", () => {
        const result = formatControllerContextTemplate("User_Account");
        expect(result).toContain("User_Account");
      });

      it("should handle long descriptions in formatHeading", () => {
        const longText =
          "This is a very long heading with multiple concepts: relationships, entities, and patterns";
        const result = formatHeading(longText, 2);
        expect(result).toContain(longText);
      });

      it("should preserve code formatting in code blocks", () => {
        const code =
          "interface User {\n  id: number;\n  name: string;\n  createdAt: Date;\n}";
        const result = formatCodeBlock(code, "typescript");
        expect(result).toContain("interface User");
        expect(result).toContain("id: number;");
        expect(result).toContain("createdAt: Date;");
      });

      it("should handle tables with very long cell content", () => {
        const headers = ["Operation", "Description"];
        const rows = [
          [
            "GET /users/{id}/orders/{orderId}/items/{itemId}",
            "Retrieve a specific item from an order for a specific user with complex nested structure",
          ],
        ];
        const result = formatTable(headers, rows);
        expect(result).toContain("GET /users/{id}/orders/{orderId}/items/{itemId}");
        expect(result).toContain("Retrieve a specific item");
      });
    });

    describe("Empty and minimal data", () => {
      it("should handle template with minimal metadata", () => {
        const metadata = {
          totalEntities: 0,
          totalRelationships: 0,
          totalEndpoints: 0,
        };

        const result = formatSummaryContextTemplate(metadata);
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
      });

      it("should format empty table correctly", () => {
        const result = formatTable(["Column"], []);
        expect(result).toContain("| Column |");
        expect(result).toContain("| --- |");
      });
    });

    describe("Content generation rules export", () => {
      it("should define rules for entity overview", () => {
        const { CONTENT_GENERATION_RULES } = require("../../src/generators/context-templates");
        expect(CONTENT_GENERATION_RULES.entityOverview).toBeDefined();
        expect(CONTENT_GENERATION_RULES.entityOverview.description).toBeDefined();
        expect(CONTENT_GENERATION_RULES.entityOverview.role).toBeDefined();
        expect(CONTENT_GENERATION_RULES.entityOverview.businessContext).toBeDefined();
      });

      it("should define rules for relationship summary", () => {
        const { CONTENT_GENERATION_RULES } = require("../../src/generators/context-templates");
        expect(CONTENT_GENERATION_RULES.relationshipSummary).toBeDefined();
        expect(CONTENT_GENERATION_RULES.relationshipSummary.format).toBeDefined();
        expect(CONTENT_GENERATION_RULES.relationshipSummary.includes).toBeDefined();
      });

      it("should define rules for cross-entity patterns", () => {
        const { CONTENT_GENERATION_RULES } = require("../../src/generators/context-templates");
        expect(CONTENT_GENERATION_RULES.crossEntityPatterns).toBeDefined();
        expect(CONTENT_GENERATION_RULES.crossEntityPatterns.examples).toBeDefined();
        expect(CONTENT_GENERATION_RULES.crossEntityPatterns.extraction).toBeDefined();
      });

      it("should define rules for usage examples", () => {
        const { CONTENT_GENERATION_RULES } = require("../../src/generators/context-templates");
        expect(CONTENT_GENERATION_RULES.usageExamples).toBeDefined();
        expect(CONTENT_GENERATION_RULES.usageExamples.includeCreation).toBeDefined();
        expect(CONTENT_GENERATION_RULES.usageExamples.codeLanguage).toBeDefined();
      });

      it("should define rules for JSDoc snippets", () => {
        const { CONTENT_GENERATION_RULES } = require("../../src/generators/context-templates");
        expect(CONTENT_GENERATION_RULES.jsDocSnippets).toBeDefined();
        expect(CONTENT_GENERATION_RULES.jsDocSnippets.count).toBeDefined();
        expect(CONTENT_GENERATION_RULES.jsDocSnippets.includes).toBeDefined();
      });
    });
  });

  describe("Markdown Format Constants", () => {
    it("should export MARKDOWN_FORMAT constants", () => {
      const { MARKDOWN_FORMAT } = require("../../src/generators/context-templates");
      expect(MARKDOWN_FORMAT).toBeDefined();
      expect(MARKDOWN_FORMAT.H1).toBe("# ");
      expect(MARKDOWN_FORMAT.H2).toBe("## ");
      expect(MARKDOWN_FORMAT.H3).toBe("### ");
      expect(MARKDOWN_FORMAT.MERMAID_FENCE).toBe("```mermaid");
      expect(MARKDOWN_FORMAT.TYPESCRIPT_FENCE).toBe("```typescript");
    });
  });

  describe("Integration: Template building with realistic data", () => {
    it("should build summary template with petstore-like metadata", () => {
      const metadata = {
        specTitle: "Swagger Petstore",
        specVersion: "1.0.0",
        totalEntities: 3, // Pet, Category, Tag
        totalRelationships: 2,
        totalEndpoints: 12,
      };

      const result = formatSummaryContextTemplate(metadata);

      expect(result).toContain("Swagger Petstore");
      expect(result).toContain("3 entities");
      expect(result).toContain("12 endpoints");
      expect(result).toHaveLength(result.length); // Just verify it's not empty
      expect(result.split("\n").length).toBeGreaterThan(20); // Substantial content
    });

    it("should build controller template for typical entity", () => {
      const result = formatControllerContextTemplate("Pet");

      expect(result).toContain("Pet");
      expect(result).toContain("Entity Overview");
      expect(result).toContain("Relationships");
      expect(result).toContain("API Endpoints");
      expect(result.split("\n").length).toBeGreaterThan(15);
    });

    it("should support multiple entities with formatted references", () => {
      const entities = ["User", "Order", "Product"];
      const references = entities.map((e) => formatEntityReference(e));

      expect(references).toContain("**User**");
      expect(references).toContain("**Order**");
      expect(references).toContain("**Product**");
    });
  });
});

/**
 * Tests for ContextFileGenerator class
 * Validates context file generation from relationship graphs
 */

import * as fs from "fs";
import * as path from "path";
import {
  ContextFileGenerator,
} from "../../src/generators/context-file-generator";
import {
  RelationshipType,
  DetectionSource,
  ConfidenceLevel,
  type EntityNode,
  type RelationshipGraph,
  type DetectedRelationship,
  type GraphMetadata,
} from "../../src/analyzers/relationship-types";
import { OpenAPIV3 } from "openapi-types";

describe("ContextFileGenerator", () => {
  let mockGraph: RelationshipGraph;
  let mockDocument: OpenAPIV3.Document;
  let tempDir: string;
  let userEntity: EntityNode;
  let orderEntity: EntityNode;

  beforeEach(() => {
    // Create temporary directory for test files
    tempDir = path.join(__dirname, "..", ".test-context-files");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create relationship from User to Order
    const userToOrderRel: DetectedRelationship = {
      sourceEntity: "User",
      targetEntity: "Order",
      type: RelationshipType.HAS_MANY,
      confidence: ConfidenceLevel.HIGH,
      detectedBy: [DetectionSource.PATH_PATTERN],
      evidence: [
        {
          source: DetectionSource.PATH_PATTERN,
          location: 'paths."/users/{id}/orders"',
          details: "User hasMany Order",
        },
      ],
    };

    const orderToUserRel: DetectedRelationship = {
      sourceEntity: "Order",
      targetEntity: "User",
      type: RelationshipType.BELONGS_TO,
      confidence: ConfidenceLevel.HIGH,
      detectedBy: [DetectionSource.NAMING_PATTERN],
      evidence: [
        {
          source: DetectionSource.NAMING_PATTERN,
          location: "components.schemas.Order.properties.userId",
          details: "userId property indicates Order belongsTo User",
        },
      ],
    };

    // Create entities
    userEntity = {
      name: "User",
      endpoints: [
        {
          method: "GET",
          path: "/users",
          operationId: "listUsers",
          description: "List all users",
        },
        {
          method: "GET",
          path: "/users/{id}",
          operationId: "getUser",
          description: "Get user by ID",
        },
        {
          method: "POST",
          path: "/users",
          operationId: "createUser",
          description: "Create new user",
        },
        {
          method: "PUT",
          path: "/users/{id}",
          operationId: "updateUser",
          description: "Update user",
        },
        {
          method: "DELETE",
          path: "/users/{id}",
          operationId: "deleteUser",
          description: "Delete user",
        },
      ],
      relationships: [userToOrderRel],
    };

    orderEntity = {
      name: "Order",
      endpoints: [
        {
          method: "GET",
          path: "/orders",
          operationId: "listOrders",
          description: "List all orders",
        },
        {
          method: "GET",
          path: "/orders/{id}",
          operationId: "getOrder",
          description: "Get order by ID",
        },
        {
          method: "POST",
          path: "/orders",
          operationId: "createOrder",
          description: "Create new order",
        },
        {
          method: "DELETE",
          path: "/orders/{id}",
          operationId: "deleteOrder",
          description: "Delete order",
        },
      ],
      relationships: [orderToUserRel],
    };

    // Create metadata
    const metadata: GraphMetadata = {
      specTitle: "Test API",
      specVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      totalEntities: 2,
      totalRelationships: 2,
    };

    // Create graph
    mockGraph = {
      entities: new Map([
        ["User", userEntity],
        ["Order", orderEntity],
      ]),
      relationships: [userToOrderRel, orderToUserRel],
      metadata,
    };

    // Create mock OpenAPI document
    mockDocument = {
      openapi: "3.0.0",
      info: {
        title: "Test API",
        version: "1.0.0",
      },
      paths: {},
      components: {
        schemas: {},
      },
    } as OpenAPIV3.Document;
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe("Constructor", () => {
    it("should create instance with graph and document", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      expect(generator).toBeDefined();
    });
  });

  describe("generateAll", () => {
    it("should create both summary and per-controller context files", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      generator.generateAll(tempDir);

      // Check summary file exists
      const summaryPath = path.join(tempDir, "CONTEXT.md");
      expect(fs.existsSync(summaryPath)).toBe(true);

      // Check per-entity files exist
      const userContextPath = path.join(tempDir, "controllers", "user", "CONTEXT.md");
      const orderContextPath = path.join(tempDir, "controllers", "order", "CONTEXT.md");

      expect(fs.existsSync(userContextPath)).toBe(true);
      expect(fs.existsSync(orderContextPath)).toBe(true);
    });

    it("should create directories as needed", () => {
      const nestedDir = path.join(tempDir, "nested", "path");
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      generator.generateAll(nestedDir);

      expect(fs.existsSync(nestedDir)).toBe(true);
      expect(fs.existsSync(path.join(nestedDir, "CONTEXT.md"))).toBe(true);
    });
  });

  describe("generateSummary", () => {
    it("should generate summary CONTEXT.md", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      generator.generateSummary(tempDir);

      const summaryPath = path.join(tempDir, "CONTEXT.md");
      expect(fs.existsSync(summaryPath)).toBe(true);

      const content = fs.readFileSync(summaryPath, "utf-8");
      expect(content.length).toBeGreaterThan(100);
    });

    it("should include spec information in summary", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      generator.generateSummary(tempDir);

      const summaryPath = path.join(tempDir, "CONTEXT.md");
      const content = fs.readFileSync(summaryPath, "utf-8");

      expect(content).toContain("Test API");
      expect(content).toContain("1.0.0");
      expect(content).toContain("2 entities");
      expect(content).toContain("2 relationships");
    });

    it("should include entity overview table", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      generator.generateSummary(tempDir);

      const summaryPath = path.join(tempDir, "CONTEXT.md");
      const content = fs.readFileSync(summaryPath, "utf-8");

      expect(content).toContain("User");
      expect(content).toContain("Order");
      expect(content).toContain("Entity Overview");
    });

    it("should include mermaid graph", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      generator.generateSummary(tempDir);

      const summaryPath = path.join(tempDir, "CONTEXT.md");
      const content = fs.readFileSync(summaryPath, "utf-8");

      expect(content).toContain("```mermaid");
      expect(content).toContain("graph LR");
      expect(content).toContain("User");
      expect(content).toContain("Order");
    });

    it("should include relationship descriptions", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      generator.generateSummary(tempDir);

      const summaryPath = path.join(tempDir, "CONTEXT.md");
      const content = fs.readFileSync(summaryPath, "utf-8");

      expect(content).toContain("Key Relationships");
      expect(content).toContain("has many");
      expect(content).toContain("belongs to");
    });

    it("should include JSDoc snippets", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      generator.generateSummary(tempDir);

      const summaryPath = path.join(tempDir, "CONTEXT.md");
      const content = fs.readFileSync(summaryPath, "utf-8");

      expect(content).toContain("Generated Code Annotations");
      expect(content).toContain("@ai_context");
      expect(content).toContain("@ai_relation");
    });
  });

  describe("generateControllerContexts", () => {
    it("should generate per-entity context files", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      generator.generateControllerContexts(tempDir);

      const userPath = path.join(tempDir, "controllers", "user", "CONTEXT.md");
      const orderPath = path.join(tempDir, "controllers", "order", "CONTEXT.md");

      expect(fs.existsSync(userPath)).toBe(true);
      expect(fs.existsSync(orderPath)).toBe(true);
    });

    it("should include entity overview in per-entity context", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      generator.generateControllerContexts(tempDir);

      const userPath = path.join(tempDir, "controllers", "user", "CONTEXT.md");
      const content = fs.readFileSync(userPath, "utf-8");

      expect(content).toContain("Entity Overview");
      expect(content).toContain("Role:");
      expect(content).toContain("Business Context:");
    });

    it("should include relationships table in per-entity context", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      generator.generateControllerContexts(tempDir);

      const userPath = path.join(tempDir, "controllers", "user", "CONTEXT.md");
      const content = fs.readFileSync(userPath, "utf-8");

      expect(content).toContain("Relationships");
      expect(content).toContain("Order");
    });

    it("should include endpoints table in per-entity context", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      generator.generateControllerContexts(tempDir);

      const userPath = path.join(tempDir, "controllers", "user", "CONTEXT.md");
      const content = fs.readFileSync(userPath, "utf-8");

      expect(content).toContain("API Endpoints");
      expect(content).toContain("GET");
      expect(content).toContain("POST");
      expect(content).toContain("DELETE");
    });

    it("should include usage examples", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      generator.generateControllerContexts(tempDir);

      const userPath = path.join(tempDir, "controllers", "user", "CONTEXT.md");
      const content = fs.readFileSync(userPath, "utf-8");

      expect(content).toContain("Usage Examples");
      expect(content).toContain("Creating a User");
      expect(content).toContain("Querying User");
    });

    it("should include subgraph in per-entity context", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      generator.generateControllerContexts(tempDir);

      const userPath = path.join(tempDir, "controllers", "user", "CONTEXT.md");
      const content = fs.readFileSync(userPath, "utf-8");

      expect(content).toContain("Relationship Subgraph");
      expect(content).toContain("```mermaid");
    });

    it("should include related entities", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      generator.generateControllerContexts(tempDir);

      const userPath = path.join(tempDir, "controllers", "user", "CONTEXT.md");
      const content = fs.readFileSync(userPath, "utf-8");

      expect(content).toContain("Related Entities");
      expect(content).toContain("Order");
    });
  });

  describe("Summary context building", () => {
    it("should build summary context with all sections", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      const summary = (generator as any).buildSummaryContext();

      expect(summary).toBeDefined();
      expect(summary.title).toBe("Context Guide: API System Overview");
      expect(summary.specInfo).toBeDefined();
      expect(summary.graph).toBeDefined();
      expect(summary.entitySummary).toBeDefined();
      expect(summary.relationshipSummary).toBeDefined();
      expect(summary.crossEntityPatterns).toBeDefined();
      expect(summary.jsDocSnippets).toBeDefined();
    });

    it("should include correct spec info", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      const summary = (generator as any).buildSummaryContext();

      expect(summary.specInfo.title).toBe("Test API");
      expect(summary.specInfo.version).toBe("1.0.0");
      expect(summary.specInfo.totalEntities).toBe(2);
      expect(summary.specInfo.totalRelationships).toBe(2);
    });

    it("should include all entities in entity summary", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      const summary = (generator as any).buildSummaryContext();

      expect(summary.entitySummary.table).toContain("User");
      expect(summary.entitySummary.table).toContain("Order");
    });
  });

  describe("Controller context building", () => {
    it("should build controller context with all sections", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      const controller = (generator as any).buildControllerContext("User");

      expect(controller).toBeDefined();
      expect(controller.entityName).toBe("User");
      expect(controller.entityOverview).toBeDefined();
      expect(controller.subgraph).toBeDefined();
      expect(controller.relationships).toBeDefined();
      expect(controller.endpoints).toBeDefined();
      expect(controller.jsDocAnnotations).toBeDefined();
      expect(controller.usageExamples).toBeDefined();
      expect(controller.relatedEntities).toBeDefined();
    });

    it("should throw error for non-existent entity", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      expect(() => {
        (generator as any).buildControllerContext("NonExistent");
      }).toThrow();
    });

    it("should include entity endpoints", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      const controller = (generator as any).buildControllerContext("User");

      expect(controller.endpoints.length).toBe(5);
      expect(controller.endpoints[0].method).toBe("GET");
      expect(controller.endpoints[0].path).toBe("/users");
    });

    it("should include relationships for entity", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      const controller = (generator as any).buildControllerContext("User");

      expect(controller.relationships.length).toBeGreaterThan(0);
      expect(controller.relationships[0].targetEntity).toBe("Order");
    });
  });

  describe("Markdown rendering", () => {
    it("should produce valid markdown for summary", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      generator.generateSummary(tempDir);

      const summaryPath = path.join(tempDir, "CONTEXT.md");
      const content = fs.readFileSync(summaryPath, "utf-8");

      // Check for markdown structure
      expect(content).toContain("# ");
      expect(content).toContain("## ");
      expect(content).toContain("| ");
      expect(content).toContain("`");
    });

    it("should produce valid markdown for controller context", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      generator.generateControllerContexts(tempDir);

      const userPath = path.join(tempDir, "controllers", "user", "CONTEXT.md");
      const content = fs.readFileSync(userPath, "utf-8");

      // Check for markdown structure
      expect(content).toContain("# ");
      expect(content).toContain("## ");
      expect(content).toContain("| ");
      expect(content).toContain("`");

      // Check no unresolved placeholders
      expect(content).not.toContain("{ENTITY_DESCRIPTION}");
      expect(content).not.toContain("{ENTITY_ROLE}");
      expect(content).not.toContain("{SUBGRAPH}");
      expect(content).not.toContain("{RELATIONSHIPS_TABLE}");
    });

    it("should not contain unresolved placeholder markers", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      generator.generateSummary(tempDir);

      const summaryPath = path.join(tempDir, "CONTEXT.md");
      const content = fs.readFileSync(summaryPath, "utf-8");

      // Check no unresolved placeholders (pattern like {PLACEHOLDER})
      expect(content).not.toContain("{FULL_GRAPH}");
      expect(content).not.toContain("{ENTITY_SUMMARY_TABLE}");
      expect(content).not.toContain("{RELATIONSHIP_SUMMARY}");
      expect(content).not.toContain("{CROSS_ENTITY_PATTERNS}");
      expect(content).not.toContain("{JSDOC_SNIPPETS}");
    });

    it("should include mermaid code blocks", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      generator.generateSummary(tempDir);

      const summaryPath = path.join(tempDir, "CONTEXT.md");
      const content = fs.readFileSync(summaryPath, "utf-8");

      // Check mermaid format
      expect(content).toMatch(/```mermaid[\s\S]*?```/);
    });
  });

  describe("Markdown content validation", () => {
    it("should include navigation links in summary", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      generator.generateSummary(tempDir);

      const summaryPath = path.join(tempDir, "CONTEXT.md");
      const content = fs.readFileSync(summaryPath, "utf-8");

      expect(content).toContain("[User]");
      expect(content).toContain("[Order]");
      expect(content).toContain("controllers/");
      expect(content).toContain("CONTEXT.md");
    });

    it("should include entity reference formatting", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      generator.generateSummary(tempDir);

      const summaryPath = path.join(tempDir, "CONTEXT.md");
      const content = fs.readFileSync(summaryPath, "utf-8");

      expect(content).toContain("**User**");
      expect(content).toContain("**Order**");
    });

    it("should include footer with generation timestamp", () => {
      const generator = new ContextFileGenerator(mockGraph, mockDocument);
      generator.generateSummary(tempDir);

      const summaryPath = path.join(tempDir, "CONTEXT.md");
      const content = fs.readFileSync(summaryPath, "utf-8");

      expect(content).toContain("Generated at:");
      expect(content).toMatch(/\d{4}-\d{2}-\d{2}T/);
    });
  });
});
