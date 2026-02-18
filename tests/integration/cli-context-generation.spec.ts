/**
 * Integration Tests: Context File Generation from Relationship Graphs
 * Tests the context generation from real OpenAPI specifications
 */

import * as fs from "fs";
import * as path from "path";
import { OpenAPIV3 } from "openapi-types";
import { RelationshipDetector } from "../../src/analyzers/relationship-detector";
import { GraphGenerator } from "../../src/generators/graph-generator";
import { ContextFileGenerator } from "../../src/generators/context-file-generator";
import { loadSpec } from "../../src/cli/spec-loader";

describe("Context File Generation from Real Specs", () => {
  let tempDir: string;
  let petstorePath: string;

  // Increase timeout for integration tests
  jest.setTimeout(30000);

  beforeEach(() => {
    // Setup temporary directory for test outputs
    tempDir = path.join(__dirname, "..", ".test-context-integration");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Petstore fixture path
    petstorePath = path.join(__dirname, "..", "fixtures", "real-world", "petstore.yaml");
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe("Petstore specification analysis", () => {
    it("should load and analyze Petstore", async () => {
      const spec = await loadSpec(petstorePath);
      expect(spec).toBeDefined();
      expect(spec.openapi).toBeDefined();

      const document = spec as unknown as OpenAPIV3.Document;
      const detector = new RelationshipDetector();
      const graph = detector.analyze(document);

      expect(graph).toBeDefined();
      expect(graph.entities.size).toBeGreaterThan(0);
    });

    it("should detect relationships in Petstore", async () => {
      const spec = await loadSpec(petstorePath);
      const document = spec as unknown as OpenAPIV3.Document;
      const detector = new RelationshipDetector();
      const graph = detector.analyze(document);

      // Petstore should have some relationships
      expect(graph.relationships).toBeDefined();
      expect(Array.isArray(graph.relationships)).toBe(true);
    });
  });

  describe("Graph generation from Petstore", () => {
    it("should generate GRAPH.md from Petstore relationship graph", async () => {
      const spec = await loadSpec(petstorePath);
      const document = spec as unknown as OpenAPIV3.Document;
      const detector = new RelationshipDetector();
      const graph = detector.analyze(document);

      const graphGen = new GraphGenerator();
      const graphPath = graphGen.generate(graph, tempDir);

      expect(fs.existsSync(graphPath)).toBe(true);

      const content = fs.readFileSync(graphPath, "utf-8");
      expect(content.length).toBeGreaterThan(0);
      expect(content).toContain("graph LR");
    });

    it("should include all entities in Petstore graph", async () => {
      const spec = await loadSpec(petstorePath);
      const document = spec as unknown as OpenAPIV3.Document;
      const detector = new RelationshipDetector();
      const graph = detector.analyze(document);

      const graphGen = new GraphGenerator();
      const graphPath = graphGen.generate(graph, tempDir);

      const content = fs.readFileSync(graphPath, "utf-8");

      // Should include entity nodes
      for (const [, entity] of graph.entities) {
        expect(content).toContain(entity.name);
      }
    });
  });

  describe("Context file generation from Petstore", () => {
    it("should generate summary CONTEXT.md from Petstore", async () => {
      const spec = await loadSpec(petstorePath);
      const document = spec as unknown as OpenAPIV3.Document;
      const detector = new RelationshipDetector();
      const graph = detector.analyze(document);

      const contextGen = new ContextFileGenerator(graph, document);
      contextGen.generateSummary(tempDir);

      const contextPath = path.join(tempDir, "CONTEXT.md");
      expect(fs.existsSync(contextPath)).toBe(true);

      const content = fs.readFileSync(contextPath, "utf-8");
      expect(content.length).toBeGreaterThan(100);
      expect(content).toContain("Context Guide");
    });

    it("should generate per-entity context files from Petstore", async () => {
      const spec = await loadSpec(petstorePath);
      const document = spec as unknown as OpenAPIV3.Document;
      const detector = new RelationshipDetector();
      const graph = detector.analyze(document);

      const contextGen = new ContextFileGenerator(graph, document);
      contextGen.generateControllerContexts(tempDir);

      const controllerPath = path.join(tempDir, "controllers");
      expect(fs.existsSync(controllerPath)).toBe(true);

      // Should have entity folders
      const entries = fs.readdirSync(controllerPath);
      const hasContextFiles = entries.some((entry) => {
        const contextFile = path.join(controllerPath, entry, "CONTEXT.md");
        return fs.existsSync(contextFile);
      });

      expect(hasContextFiles).toBe(true);
    });

    it("should generate all context files in one call", async () => {
      const spec = await loadSpec(petstorePath);
      const document = spec as unknown as OpenAPIV3.Document;
      const detector = new RelationshipDetector();
      const graph = detector.analyze(document);

      const contextGen = new ContextFileGenerator(graph, document);
      contextGen.generateAll(tempDir);

      // Check summary
      const summaryPath = path.join(tempDir, "CONTEXT.md");
      expect(fs.existsSync(summaryPath)).toBe(true);

      // Check per-entity files
      const controllerPath = path.join(tempDir, "controllers");
      expect(fs.existsSync(controllerPath)).toBe(true);

      const entries = fs.readdirSync(controllerPath);
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe("Markdown output quality from Petstore", () => {
    it("should produce valid markdown structure", async () => {
      const spec = await loadSpec(petstorePath);
      const document = spec as unknown as OpenAPIV3.Document;
      const detector = new RelationshipDetector();
      const graph = detector.analyze(document);

      const contextGen = new ContextFileGenerator(graph, document);
      contextGen.generateSummary(tempDir);

      const contextPath = path.join(tempDir, "CONTEXT.md");
      const content = fs.readFileSync(contextPath, "utf-8");

      // Check markdown elements
      expect(content).toMatch(/^# /m); // H1 heading
      expect(content).toMatch(/^## /m); // H2 heading
      expect(content).toContain("```mermaid"); // Code blocks
      expect(content).toContain("`"); // Inline code
      expect(content).toContain("|"); // Tables
    });

    it("should include complete entity information", async () => {
      const spec = await loadSpec(petstorePath);
      const document = spec as unknown as OpenAPIV3.Document;
      const detector = new RelationshipDetector();
      const graph = detector.analyze(document);

      const contextGen = new ContextFileGenerator(graph, document);
      contextGen.generateSummary(tempDir);

      const contextPath = path.join(tempDir, "CONTEXT.md");
      const content = fs.readFileSync(contextPath, "utf-8");

      // Should have all key sections
      expect(content).toContain("Entity Relationship Graph");
      expect(content).toContain("Entity Overview");
      expect(content).toContain("Key Relationships");
      expect(content).toContain("Common Data Flow Patterns");
      expect(content).toContain("Generated Code Annotations");
      expect(content).toContain("Per-Entity Context Files");
    });

    it("should include specification metadata", async () => {
      const spec = await loadSpec(petstorePath);
      const document = spec as unknown as OpenAPIV3.Document;
      const detector = new RelationshipDetector();
      const graph = detector.analyze(document);

      const contextGen = new ContextFileGenerator(graph, document);
      contextGen.generateSummary(tempDir);

      const contextPath = path.join(tempDir, "CONTEXT.md");
      const content = fs.readFileSync(contextPath, "utf-8");

      // Should reference the spec
      expect(content).toContain("Generated from:");
      expect(content).toMatch(/\d+ entities/);
      expect(content).toMatch(/\d+ endpoints/);
      expect(content).toMatch(/\d+ relationships/);
    });

    it("should include valid Mermaid diagrams", async () => {
      const spec = await loadSpec(petstorePath);
      const document = spec as unknown as OpenAPIV3.Document;
      const detector = new RelationshipDetector();
      const graph = detector.analyze(document);

      const contextGen = new ContextFileGenerator(graph, document);
      contextGen.generateSummary(tempDir);

      const contextPath = path.join(tempDir, "CONTEXT.md");
      const content = fs.readFileSync(contextPath, "utf-8");

      // Should have mermaid block
      expect(content).toContain("```mermaid");
      expect(content).toContain("graph LR");
      expect(content).toContain("classDef");

      // Extract and validate mermaid syntax
      const mermaidMatch = content.match(/```mermaid\n([\s\S]*?)\n```/);
      expect(mermaidMatch).toBeTruthy();

      if (mermaidMatch) {
        const mermaidCode = mermaidMatch[1];
        expect(mermaidCode).toContain("graph LR");
      }
    });

    it("should not have unresolved placeholders", async () => {
      const spec = await loadSpec(petstorePath);
      const document = spec as unknown as OpenAPIV3.Document;
      const detector = new RelationshipDetector();
      const graph = detector.analyze(document);

      const contextGen = new ContextFileGenerator(graph, document);
      contextGen.generateAll(tempDir);

      // Check all generated files
      const summaryPath = path.join(tempDir, "CONTEXT.md");
      const summaryContent = fs.readFileSync(summaryPath, "utf-8");

      // No placeholder markers should remain
      expect(summaryContent).not.toContain("{FULL_GRAPH}");
      expect(summaryContent).not.toContain("{ENTITY_SUMMARY_TABLE}");
      expect(summaryContent).not.toContain("{RELATIONSHIP_SUMMARY}");
      expect(summaryContent).not.toContain("{CROSS_ENTITY_PATTERNS}");
      expect(summaryContent).not.toContain("{JSDOC_SNIPPETS}");
      expect(summaryContent).not.toContain("{GENERATED_AT}");
      expect(summaryContent).not.toContain("{ENTITY_CONTEXT_LINKS}");

      // Check per-entity files
      const controllerPath = path.join(tempDir, "controllers");
      const entries = fs.readdirSync(controllerPath);

      for (const entry of entries) {
        const contextFile = path.join(controllerPath, entry, "CONTEXT.md");
        if (fs.existsSync(contextFile)) {
          const content = fs.readFileSync(contextFile, "utf-8");
          expect(content).not.toContain("{ENTITY_DESCRIPTION}");
          expect(content).not.toContain("{ENTITY_ROLE}");
          expect(content).not.toContain("{ENTITY_BUSINESS_CONTEXT}");
          expect(content).not.toContain("{SUBGRAPH}");
        }
      }
    });
  });

  describe("Per-entity context file content", () => {
    it("should include entity overview section", async () => {
      const spec = await loadSpec(petstorePath);
      const document = spec as unknown as OpenAPIV3.Document;
      const detector = new RelationshipDetector();
      const graph = detector.analyze(document);

      const contextGen = new ContextFileGenerator(graph, document);
      contextGen.generateControllerContexts(tempDir);

      const controllerPath = path.join(tempDir, "controllers");
      const entries = fs.readdirSync(controllerPath);

      for (const entry of entries) {
        const contextFile = path.join(controllerPath, entry, "CONTEXT.md");
        if (fs.existsSync(contextFile)) {
          const content = fs.readFileSync(contextFile, "utf-8");

          expect(content).toContain("Entity Overview");
          expect(content).toContain("Role:");
          expect(content).toContain("Business Context:");
          break; // Check at least one
        }
      }
    });

    it("should include relationship information", async () => {
      const spec = await loadSpec(petstorePath);
      const document = spec as unknown as OpenAPIV3.Document;
      const detector = new RelationshipDetector();
      const graph = detector.analyze(document);

      const contextGen = new ContextFileGenerator(graph, document);
      contextGen.generateControllerContexts(tempDir);

      const controllerPath = path.join(tempDir, "controllers");
      const entries = fs.readdirSync(controllerPath);

      for (const entry of entries) {
        const contextFile = path.join(controllerPath, entry, "CONTEXT.md");
        if (fs.existsSync(contextFile)) {
          const content = fs.readFileSync(contextFile, "utf-8");

          expect(content).toContain("Relationships");
          expect(content).toContain("Related Entities");
          break;
        }
      }
    });

    it("should include API endpoints", async () => {
      const spec = await loadSpec(petstorePath);
      const document = spec as unknown as OpenAPIV3.Document;
      const detector = new RelationshipDetector();
      const graph = detector.analyze(document);

      const contextGen = new ContextFileGenerator(graph, document);
      contextGen.generateControllerContexts(tempDir);

      const controllerPath = path.join(tempDir, "controllers");
      const entries = fs.readdirSync(controllerPath);

      for (const entry of entries) {
        const contextFile = path.join(controllerPath, entry, "CONTEXT.md");
        if (fs.existsSync(contextFile)) {
          const content = fs.readFileSync(contextFile, "utf-8");

          expect(content).toContain("API Endpoints");
          break;
        }
      }
    });

    it("should include usage examples", async () => {
      const spec = await loadSpec(petstorePath);
      const document = spec as unknown as OpenAPIV3.Document;
      const detector = new RelationshipDetector();
      const graph = detector.analyze(document);

      const contextGen = new ContextFileGenerator(graph, document);
      contextGen.generateControllerContexts(tempDir);

      const controllerPath = path.join(tempDir, "controllers");
      const entries = fs.readdirSync(controllerPath);

      for (const entry of entries) {
        const contextFile = path.join(controllerPath, entry, "CONTEXT.md");
        if (fs.existsSync(contextFile)) {
          const content = fs.readFileSync(contextFile, "utf-8");

          expect(content).toContain("Usage Examples");
          break;
        }
      }
    });

    it("should include subgraph visualization", async () => {
      const spec = await loadSpec(petstorePath);
      const document = spec as unknown as OpenAPIV3.Document;
      const detector = new RelationshipDetector();
      const graph = detector.analyze(document);

      const contextGen = new ContextFileGenerator(graph, document);
      contextGen.generateControllerContexts(tempDir);

      const controllerPath = path.join(tempDir, "controllers");
      const entries = fs.readdirSync(controllerPath);

      for (const entry of entries) {
        const contextFile = path.join(controllerPath, entry, "CONTEXT.md");
        if (fs.existsSync(contextFile)) {
          const content = fs.readFileSync(contextFile, "utf-8");

          expect(content).toContain("Relationship Subgraph");
          expect(content).toContain("```mermaid");
          break;
        }
      }
    });
  });

  describe("Summary file content from Petstore", () => {
    it("should include all entities in summary", async () => {
      const spec = await loadSpec(petstorePath);
      const document = spec as unknown as OpenAPIV3.Document;
      const detector = new RelationshipDetector();
      const graph = detector.analyze(document);

      const contextGen = new ContextFileGenerator(graph, document);
      contextGen.generateSummary(tempDir);

      const summaryPath = path.join(tempDir, "CONTEXT.md");
      const content = fs.readFileSync(summaryPath, "utf-8");

      // All entities should be referenced
      for (const [, entity] of graph.entities) {
        expect(content).toContain(entity.name);
      }
    });

    it("should include navigation links to entity contexts", async () => {
      const spec = await loadSpec(petstorePath);
      const document = spec as unknown as OpenAPIV3.Document;
      const detector = new RelationshipDetector();
      const graph = detector.analyze(document);

      const contextGen = new ContextFileGenerator(graph, document);
      contextGen.generateAll(tempDir);

      const summaryPath = path.join(tempDir, "CONTEXT.md");
      const content = fs.readFileSync(summaryPath, "utf-8");

      // Should have links to entity contexts
      expect(content).toContain("controllers/");
      expect(content).toContain("CONTEXT.md");
      expect(content).toContain("[");
      expect(content).toContain("]");
    });

    it("should include generation timestamp", async () => {
      const spec = await loadSpec(petstorePath);
      const document = spec as unknown as OpenAPIV3.Document;
      const detector = new RelationshipDetector();
      const graph = detector.analyze(document);

      const contextGen = new ContextFileGenerator(graph, document);
      contextGen.generateSummary(tempDir);

      const summaryPath = path.join(tempDir, "CONTEXT.md");
      const content = fs.readFileSync(summaryPath, "utf-8");

      // Should have timestamp
      expect(content).toContain("Generated at:");
      expect(content).toMatch(/\d{4}-\d{2}-\d{2}T/);
    });
  });
});
