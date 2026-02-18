/**
 * Context File Generator
 * Generates CONTEXT.md files at summary and per-controller levels
 * Consumes templates from Plan 09-03a and relationship data to create structured context
 */

import * as fs from "fs";
import * as path from "path";
import { OpenAPIV3 } from "openapi-types";
import type {
  RelationshipGraph,
  EntityNode,
  DetectedRelationship,
  EndpointInfo,
} from "../analyzers/relationship-types";
import { RelationshipType } from "../analyzers/relationship-types";
import {
  SummaryContextTemplate,
  ControllerContextTemplate,
  SpecInfoSection,
  MermaidGraphSection,
  EntitySummarySection,
  RelationshipSummarySection,
  CrossEntityPatternsSection,
  JsDocSnippetsSection,
  EntityOverviewSection,
  DetailedRelationshipSection,
  EndpointDetailSection,
  UsageExampleSection,
  RelatedEntitySection,
  formatHeading,
  formatCodeBlock,
  formatTable,
  formatLink,
  formatEntityReference,
} from "./context-templates";

/**
 * ContextFileGenerator creates CONTEXT.md files from relationship graphs
 */
export class ContextFileGenerator {
  private graph: RelationshipGraph;
  private document: OpenAPIV3.Document;

  /**
   * Create a new ContextFileGenerator
   * @param graph - The relationship graph containing entities and relationships
   * @param document - The OpenAPI document
   */
  constructor(graph: RelationshipGraph, document: OpenAPIV3.Document) {
    this.graph = graph;
    this.document = document;
  }

  /**
   * Generate all context files (summary + per-controller)
   * @param outputPath - Directory to write context files
   */
  public generateAll(outputPath: string): void {
    this.generateSummary(outputPath);
    this.generateControllerContexts(outputPath);
  }

  /**
   * Generate summary-level CONTEXT.md with full graph overview
   * @param outputPath - Directory to write summary CONTEXT.md
   */
  public generateSummary(outputPath: string): void {
    const template = this.buildSummaryContext();
    const markdown = this.renderSummaryTemplate(template);

    // Write to root CONTEXT.md
    fs.mkdirSync(outputPath, { recursive: true });
    const summaryPath = path.join(outputPath, "CONTEXT.md");
    fs.writeFileSync(summaryPath, markdown, "utf-8");
  }

  /**
   * Generate per-controller CONTEXT.md files in resource folders
   * @param outputPath - Base output directory (will create entity folders)
   */
  public generateControllerContexts(outputPath: string): void {
    for (const [, entity] of this.graph.entities) {
      const template = this.buildControllerContext(entity.name);
      const markdown = this.renderControllerTemplate(template);

      // Create entity-specific folder and write CONTEXT.md
      const entityFolder = path.join(outputPath, "controllers", entity.name.toLowerCase());
      fs.mkdirSync(entityFolder, { recursive: true });
      const contextPath = path.join(entityFolder, "CONTEXT.md");
      fs.writeFileSync(contextPath, markdown, "utf-8");
    }
  }

  /**
   * Build SummaryContextTemplate from the relationship graph
   */
  private buildSummaryContext(): SummaryContextTemplate {
    const specInfo = this.buildSpecInfo();
    const graph = this.buildMermaidGraphSection();
    const entitySummary = this.buildEntitySummarySection();
    const relationshipSummary = this.buildRelationshipSummarySection();
    const crossEntityPatterns = this.buildCrossEntityPatternsSection();
    const jsDocSnippets = this.buildJsDocSnippetsSection();

    return {
      title: "Context Guide: API System Overview",
      specInfo,
      graph,
      entitySummary,
      relationshipSummary,
      crossEntityPatterns,
      jsDocSnippets,
    };
  }

  /**
   * Build SpecInfoSection from graph metadata
   */
  private buildSpecInfo(): SpecInfoSection {
    const totalEndpoints = Array.from(this.graph.entities.values()).reduce(
      (sum, entity) => sum + entity.endpoints.length,
      0
    );

    return {
      title: this.document.info?.title || "OpenAPI Specification",
      version: this.document.info?.version || "unknown",
      generatedAt: new Date().toISOString(),
      totalEntities: this.graph.entities.size,
      totalRelationships: this.graph.relationships.length,
      totalEndpoints,
    };
  }

  /**
   * Build MermaidGraphSection with full diagram
   */
  private buildMermaidGraphSection(): MermaidGraphSection {
    const lines: string[] = [];

    // Start flowchart
    lines.push("graph LR");
    lines.push("");

    // Add entity nodes
    for (const [, entity] of this.graph.entities) {
      lines.push(`  ${entity.name}["${entity.name}"]:::entityStyle`);
    }

    if (this.graph.entities.size > 0) {
      lines.push("");
    }

    // Add relationship edges, tracking bidirectional pairs
    const processedEdges = new Set<string>();
    const bidirectionalEdges: Array<{
      entity1: string;
      entity2: string;
    }> = [];

    // First pass: identify bidirectional pairs
    for (let i = 0; i < this.graph.relationships.length; i++) {
      const rel1 = this.graph.relationships[i];
      const edgeKey1 = `${rel1.sourceEntity}|${rel1.targetEntity}`;

      if (processedEdges.has(edgeKey1)) continue;

      // Look for reverse relationship
      const reverseRel = this.graph.relationships.find(
        (rel2) =>
          rel2.sourceEntity === rel1.targetEntity &&
          rel2.targetEntity === rel1.sourceEntity
      );

      if (reverseRel) {
        const edgeKey2 = `${reverseRel.sourceEntity}|${reverseRel.targetEntity}`;
        processedEdges.add(edgeKey1);
        processedEdges.add(edgeKey2);

        bidirectionalEdges.push({
          entity1: rel1.sourceEntity,
          entity2: rel1.targetEntity,
        });
      }
    }

    // Add bidirectional edges
    for (const { entity1, entity2 } of bidirectionalEdges) {
      lines.push(`  ${entity1} <-->|mutual| ${entity2}`);
    }

    if (bidirectionalEdges.length > 0) {
      lines.push("");
    }

    // Second pass: add remaining unidirectional edges
    for (const rel of this.graph.relationships) {
      const edgeKey = `${rel.sourceEntity}|${rel.targetEntity}`;
      const reverseKey = `${rel.targetEntity}|${rel.sourceEntity}`;

      // Skip if this is part of a bidirectional pair
      if (processedEdges.has(edgeKey) || processedEdges.has(reverseKey)) {
        continue;
      }

      const arrowType = "-->";
      const label = rel.type;

      lines.push(`  ${rel.sourceEntity} ${arrowType}|${label}| ${rel.targetEntity}`);
    }

    if (this.graph.relationships.length > 0) {
      lines.push("");
    }

    // Add styling
    lines.push(
      "  classDef entityStyle fill:#4A90E2,stroke:#2E5C8A,stroke-width:2px,color:#fff,font-weight:bold"
    );
    lines.push("");
    lines.push("  %% Bidirectional edges indicate mutual relationships");

    return {
      title: "Entity Relationship Graph",
      code: lines.join("\n"),
      description:
        "Complete view of all entities and relationships in the system",
    };
  }

  /**
   * Build EntitySummarySection as a markdown table
   */
  private buildEntitySummarySection(): EntitySummarySection {
    const headers = ["Entity", "Endpoints", "Relationships"];
    const rows: string[][] = [];

    for (const [, entity] of this.graph.entities) {
      const endpoints = entity.endpoints.length;
      const relationships = entity.relationships.length;
      rows.push([
        formatEntityReference(entity.name),
        String(endpoints),
        String(relationships),
      ]);
    }

    const table = formatTable(headers, rows);
    const description = "Quick reference for all entities in the system";

    return {
      table,
      description,
    };
  }

  /**
   * Build RelationshipSummarySection with narrative descriptions
   */
  private buildRelationshipSummarySection(): RelationshipSummarySection {
    const relationships: string[] = [];

    for (const rel of this.graph.relationships) {
      const typeLabel = {
        hasMany: "has many",
        hasOne: "has one",
        belongsTo: "belongs to",
      }[rel.type];

      const description = `${formatEntityReference(rel.sourceEntity)} ${typeLabel} ${formatEntityReference(
        rel.targetEntity
      )}`;
      relationships.push(description);
    }

    const narrative =
      relationships.length > 0
        ? `The system contains ${relationships.length} detected relationships defining how entities connect and interact.`
        : "No explicit relationships detected in this specification.";

    return {
      relationships,
      narrative,
    };
  }

  /**
   * Build CrossEntityPatternsSection identifying common patterns
   */
  private buildCrossEntityPatternsSection(): CrossEntityPatternsSection {
    const patterns: Array<{ title: string; description: string }> = [];

    // Identify patterns based on relationship types
    const hasMany = this.graph.relationships.filter(
      (r) => r.type === RelationshipType.HAS_MANY
    );
    const hasOne = this.graph.relationships.filter(
      (r) => r.type === RelationshipType.HAS_ONE
    );
    const belongsTo = this.graph.relationships.filter(
      (r) => r.type === RelationshipType.BELONGS_TO
    );

    if (hasMany.length > 0) {
      patterns.push({
        title: "One-to-Many Relationships",
        description: `${hasMany.length} one-to-many relationships detected. Typical pattern: parent entity can have multiple child entities.`,
      });
    }

    if (hasOne.length > 0) {
      patterns.push({
        title: "One-to-One Relationships",
        description: `${hasOne.length} one-to-one relationships detected. Typical pattern: exclusive relationship between entities.`,
      });
    }

    if (belongsTo.length > 0) {
      patterns.push({
        title: "Belongs-To Relationships",
        description: `${belongsTo.length} belongs-to relationships detected. Typical pattern: child entity references parent.`,
      });
    }

    const analysis =
      patterns.length > 0
        ? "Common patterns identified in entity relationships help with API navigation and understanding data flows."
        : "No clear patterns detected in the current relationship set.";

    return {
      patterns,
      analysis,
    };
  }

  /**
   * Build JsDocSnippetsSection with key examples
   */
  private buildJsDocSnippetsSection(): JsDocSnippetsSection {
    const examples: Array<{ label: string; code: string }> = [];

    // Select 3-5 most connected entities
    const sortedEntities = Array.from(this.graph.entities.values())
      .sort((a, b) => b.relationships.length - a.relationships.length)
      .slice(0, 5);

    for (const entity of sortedEntities) {
      const example = `/**
 * @ai_context: Entity "${entity.name}" with ${entity.endpoints.length} endpoints
 * @ai_relation: Participates in ${entity.relationships.length} relationships
 * @ai_endpoints: ${entity.endpoints.map((e) => `${e.method} ${e.path}`).join(", ")}
 */`;

      examples.push({
        label: entity.name,
        code: example,
      });
    }

    const guidance =
      "Generated code includes @ai_context, @ai_relation, and @ai_endpoints annotations to help AI agents understand entity structure and relationships.";

    return {
      examples,
      guidance,
    };
  }

  /**
   * Build ControllerContextTemplate for a specific entity
   */
  private buildControllerContext(
    entityName: string
  ): ControllerContextTemplate {
    const entity = this.graph.entities.get(entityName);
    if (!entity) {
      throw new Error(`Entity not found: ${entityName}`);
    }

    const overview = this.buildEntityOverviewSection(entity);
    const subgraph = this.buildSubgraph(entity);
    const relationships = this.buildDetailedRelationshipSections(entity);
    const endpoints = this.buildEndpointDetailSections(entity);
    const jsDocAnnotations = this.buildClassJsDoc(entity);
    const usageExamples = this.buildUsageExamples(entity);
    const relatedEntities = this.buildRelatedEntitySections(entity);

    return {
      entityName,
      entityOverview: overview,
      subgraph,
      relationships,
      endpoints,
      jsDocAnnotations,
      usageExamples,
      relatedEntities,
    };
  }

  /**
   * Build EntityOverviewSection for an entity
   */
  private buildEntityOverviewSection(entity: EntityNode): EntityOverviewSection {
    // Infer role from relationship patterns
    let role = "Entity";
    const incomingCount = this.graph.relationships.filter(
      (r) => r.targetEntity === entity.name
    ).length;
    const outgoingCount = entity.relationships.length;

    if (incomingCount === 0 && outgoingCount > 2) {
      role = "Primary";
    } else if (incomingCount > 0 && outgoingCount > 0) {
      role = "Junction";
    } else if (incomingCount > 0 && outgoingCount === 0) {
      role = "Lookup";
    }

    // Extract description from endpoints
    const descriptions: string[] = [];
    for (const endpoint of entity.endpoints) {
      if (endpoint.description) {
        descriptions.push(endpoint.description);
      }
    }

    const description =
      descriptions.length > 0
        ? descriptions[0]
        : `The ${entity.name} entity with ${entity.endpoints.length} endpoints`;

    const businessContext = `${entity.name} serves as a ${role.toLowerCase()} entity in this API, with ${entity.endpoints.length} endpoints and ${entity.relationships.length} defined relationships.`;

    return {
      description,
      role,
      businessContext,
    };
  }

  /**
   * Build subgraph showing only immediate relationships for entity
   */
  private buildSubgraph(entity: EntityNode): MermaidGraphSection {
    const lines: string[] = [];

    lines.push("graph LR");
    lines.push("");

    // Center node
    lines.push(`  ${entity.name}["${entity.name}"]:::centerStyle`);

    // Related entities
    const relatedEntities = new Set<string>();
    for (const rel of entity.relationships) {
      relatedEntities.add(rel.targetEntity);
    }

    // Reverse relationships
    for (const rel of this.graph.relationships) {
      if (rel.targetEntity === entity.name) {
        relatedEntities.add(rel.sourceEntity);
      }
    }

    if (relatedEntities.size > 0) {
      lines.push("");
      for (const related of relatedEntities) {
        lines.push(`  ${related}["${related}"]:::entityStyle`);
      }
    }

    if (relatedEntities.size > 0) {
      lines.push("");
    }

    // Outgoing edges
    for (const rel of entity.relationships) {
      lines.push(`  ${entity.name} -->|${rel.type}| ${rel.targetEntity}`);
    }

    // Incoming edges
    for (const rel of this.graph.relationships) {
      if (rel.targetEntity === entity.name) {
        lines.push(`  ${rel.sourceEntity} -->|${rel.type}| ${entity.name}`);
      }
    }

    lines.push("");
    lines.push(
      "  classDef centerStyle fill:#E94B3C,stroke:#8B2F26,stroke-width:3px,color:#fff,font-weight:bold"
    );
    lines.push(
      "  classDef entityStyle fill:#4A90E2,stroke:#2E5C8A,stroke-width:2px,color:#fff,font-weight:bold"
    );

    return {
      title: `${entity.name} Relationship Subgraph`,
      code: lines.join("\n"),
      description: `Shows ${entity.name} and its direct relationships`,
    };
  }

  /**
   * Build DetailedRelationshipSection for each relationship
   */
  private buildDetailedRelationshipSections(
    entity: EntityNode
  ): DetailedRelationshipSection[] {
    const sections: DetailedRelationshipSection[] = [];

    for (const rel of entity.relationships) {
      const cardinality = this.inferCardinality(rel.type);
      const accessPath = this.getAccessPath(entity.name, rel.targetEntity);
      const bidirectional = !!this.graph.relationships.find(
        (r) =>
          r.sourceEntity === rel.targetEntity &&
          r.targetEntity === entity.name
      );

      sections.push({
        type: rel.type as "hasMany" | "hasOne" | "belongsTo",
        targetEntity: rel.targetEntity,
        foreignKey: this.inferForeignKey(entity.name, rel.targetEntity),
        accessPath,
        cardinality,
        description: `${entity.name} ${this.getRelationshipLabel(rel.type)} ${rel.targetEntity}`,
        bidirectional,
      });
    }

    return sections;
  }

  /**
   * Build EndpointDetailSection for each endpoint
   */
  private buildEndpointDetailSections(
    entity: EntityNode
  ): EndpointDetailSection[] {
    return entity.endpoints.map((endpoint) => ({
      method: endpoint.method,
      path: endpoint.path,
      operationId: endpoint.operationId || "unknown",
      description: endpoint.description || "No description provided",
    }));
  }

  /**
   * Build class-level JSDoc annotation string
   */
  private buildClassJsDoc(entity: EntityNode): string {
    const lines: string[] = [];

    lines.push("/**");
    lines.push(` * ${entity.name} Controller`);
    lines.push(` * @ai_context: Manages ${entity.name} operations`);

    if (entity.relationships.length > 0) {
      lines.push(
        ` * @ai_relation: Connects to ${entity.relationships.map((r) => r.targetEntity).join(", ")}`
      );
    }

    lines.push(` * @ai_endpoints: ${entity.endpoints.length} endpoints`);
    lines.push(" */");

    return lines.join("\n");
  }

  /**
   * Build UsageExampleSection with practical code snippets
   */
  private buildUsageExamples(entity: EntityNode): UsageExampleSection[] {
    const examples: UsageExampleSection[] = [];

    // Example 1: Create
    if (entity.endpoints.some((e) => e.method === "POST")) {
      examples.push({
        title: `Creating a ${entity.name}`,
        description: `Example of creating a new ${entity.name} instance`,
        code: `const new${entity.name} = await api.post('/${entity.name.toLowerCase()}', {
  // ... field values
});
console.log(new${entity.name});`,
      });
    }

    // Example 2: Query
    if (entity.endpoints.some((e) => e.method === "GET")) {
      examples.push({
        title: `Querying ${entity.name}`,
        description: `Example of fetching ${entity.name} records`,
        code: `const ${entity.name.toLowerCase()} = await api.get('/${entity.name.toLowerCase()}');
console.log(${entity.name.toLowerCase()});`,
      });
    }

    // Example 3: Relationships
    if (entity.relationships.length > 0) {
      examples.push({
        title: `Accessing Related Entities`,
        description: `Example of traversing relationships from ${entity.name}`,
        code: `const related = await api.get('/${entity.name.toLowerCase()}/{id}/${entity.relationships[0].targetEntity.toLowerCase()}');
console.log(related);`,
      });
    }

    return examples;
  }

  /**
   * Build RelatedEntitySection for connected entities
   */
  private buildRelatedEntitySections(
    entity: EntityNode
  ): RelatedEntitySection[] {
    const sections: RelatedEntitySection[] = [];
    const seen = new Set<string>();

    // Outgoing relationships
    for (const rel of entity.relationships) {
      if (!seen.has(rel.targetEntity)) {
        seen.add(rel.targetEntity);
        sections.push({
          entityName: rel.targetEntity,
          relationshipType: rel.type as "hasMany" | "hasOne" | "belongsTo",
          description: `${entity.name} ${this.getRelationshipLabel(rel.type)} ${rel.targetEntity}`,
        });
      }
    }

    // Incoming relationships
    for (const rel of this.graph.relationships) {
      if (rel.targetEntity === entity.name && !seen.has(rel.sourceEntity)) {
        seen.add(rel.sourceEntity);
        sections.push({
          entityName: rel.sourceEntity,
          relationshipType: rel.type as "hasMany" | "hasOne" | "belongsTo",
          description: `${rel.sourceEntity} ${this.getRelationshipLabel(rel.type)} ${entity.name}`,
        });
      }
    }

    return sections;
  }

  /**
   * Render SummaryContextTemplate to markdown
   */
  private renderSummaryTemplate(template: SummaryContextTemplate): string {
    const lines: string[] = [];

    // Title
    lines.push(formatHeading(template.title, 1));
    lines.push("");

    // Spec info
    lines.push(
      `Generated from: **${template.specInfo.title}** v${template.specInfo.version}`
    );
    lines.push("");
    lines.push(
      `**Coverage:** ${template.specInfo.totalEntities} entities | ${template.specInfo.totalEndpoints} endpoints | ${template.specInfo.totalRelationships} relationships`
    );
    lines.push("");

    // Graph section
    lines.push(formatHeading(template.graph.title, 2));
    lines.push("");
    lines.push(template.graph.description);
    lines.push("");
    lines.push(formatCodeBlock(template.graph.code, "mermaid"));
    lines.push("");

    // Entity summary
    lines.push(formatHeading("Entity Overview", 2));
    lines.push("");
    lines.push(template.entitySummary.description);
    lines.push("");
    lines.push(template.entitySummary.table);
    lines.push("");

    // Relationships
    lines.push(formatHeading("Key Relationships", 2));
    lines.push("");
    lines.push(template.relationshipSummary.narrative);
    lines.push("");
    for (const rel of template.relationshipSummary.relationships) {
      lines.push(`- ${rel}`);
    }
    lines.push("");

    // Patterns
    lines.push(formatHeading("Common Data Flow Patterns", 2));
    lines.push("");
    lines.push(template.crossEntityPatterns.analysis);
    lines.push("");
    for (const pattern of template.crossEntityPatterns.patterns) {
      lines.push(`**${pattern.title}:** ${pattern.description}`);
    }
    lines.push("");

    // JSDoc snippets
    lines.push(formatHeading("Generated Code Annotations", 2));
    lines.push("");
    lines.push(template.jsDocSnippets.guidance);
    lines.push("");
    for (const example of template.jsDocSnippets.examples) {
      lines.push(`**${example.label}:**`);
      lines.push(formatCodeBlock(example.code, "typescript"));
      lines.push("");
    }

    // Entity links
    lines.push(formatHeading("Per-Entity Context Files", 2));
    lines.push("");
    lines.push("For detailed information about specific entities, see:");
    lines.push("");
    for (const [, entity] of this.graph.entities) {
      const link = formatLink(
        entity.name,
        `controllers/${entity.name.toLowerCase()}/CONTEXT.md`
      );
      lines.push(`- ${link}`);
    }
    lines.push("");

    // Footer
    lines.push("---");
    lines.push("");
    lines.push(`_Generated at: ${template.specInfo.generatedAt}_`);
    lines.push(
      "_For entity-specific details, see CONTEXT.md in each controller folder_"
    );

    return lines.join("\n");
  }

  /**
   * Render ControllerContextTemplate to markdown
   */
  private renderControllerTemplate(template: ControllerContextTemplate): string {
    const lines: string[] = [];

    // Title
    lines.push(
      formatHeading(`Context Guide: ${template.entityName} Entity`, 1)
    );
    lines.push("");
    lines.push(`**Entity:** ${formatEntityReference(template.entityName)}`);
    lines.push("");

    // Overview
    lines.push(formatHeading("Entity Overview", 2));
    lines.push("");
    lines.push(template.entityOverview.description);
    lines.push("");
    lines.push(`**Role:** ${template.entityOverview.role}`);
    lines.push("");
    lines.push(`**Business Context:** ${template.entityOverview.businessContext}`);
    lines.push("");

    // Subgraph
    lines.push(formatHeading("Relationship Subgraph", 2));
    lines.push("");
    lines.push(
      `This diagram shows ${template.entityName} and its direct relationships:`
    );
    lines.push("");
    lines.push(formatCodeBlock(template.subgraph.code, "mermaid"));
    lines.push("");

    // Relationships
    lines.push(formatHeading("Relationships", 2));
    lines.push("");
    if (template.relationships.length > 0) {
      lines.push(
        `${formatEntityReference(template.entityName)} participates in these relationships:`
      );
      lines.push("");

      const headers = [
        "Target Entity",
        "Type",
        "Cardinality",
        "Bidirectional",
        "Description",
      ];
      const rows: string[][] = template.relationships.map((rel) => [
        formatEntityReference(rel.targetEntity),
        rel.type,
        rel.cardinality,
        rel.bidirectional ? "Yes" : "No",
        rel.description,
      ]);
      lines.push(formatTable(headers, rows));
    } else {
      lines.push("No explicit relationships defined for this entity.");
    }
    lines.push("");

    // Endpoints
    lines.push(formatHeading("API Endpoints", 2));
    lines.push("");
    lines.push(`Available endpoints for managing ${template.entityName}:`);
    lines.push("");

    if (template.endpoints.length > 0) {
      const headers = ["Method", "Path", "Operation ID", "Description"];
      const rows: string[][] = template.endpoints.map((ep) => [
        ep.method,
        ep.path,
        ep.operationId,
        ep.description,
      ]);
      lines.push(formatTable(headers, rows));
    } else {
      lines.push("No endpoints defined for this entity.");
    }
    lines.push("");

    // JSDoc
    lines.push(formatHeading("Generated Controller JSDoc", 2));
    lines.push("");
    lines.push("Class-level annotations providing AI agent context:");
    lines.push("");
    lines.push(formatCodeBlock(template.jsDocAnnotations, "typescript"));
    lines.push("");

    // Related entities
    lines.push(formatHeading("Related Entities", 2));
    lines.push("");
    if (template.relatedEntities.length > 0) {
      lines.push(
        `Entities that ${formatEntityReference(template.entityName)} connects to:`
      );
      lines.push("");
      const headers = ["Entity", "Relationship Type", "Description"];
      const rows: string[][] = template.relatedEntities.map((rel) => [
        formatEntityReference(rel.entityName),
        rel.relationshipType,
        rel.description,
      ]);
      lines.push(formatTable(headers, rows));
    } else {
      lines.push(`No related entities found for ${template.entityName}.`);
    }
    lines.push("");

    // Usage examples
    lines.push(formatHeading("Usage Examples", 2));
    lines.push("");
    lines.push(
      `Common patterns for working with ${formatEntityReference(template.entityName)}:`
    );
    lines.push("");
    for (const example of template.usageExamples) {
      lines.push(`**${example.title}**`);
      lines.push("");
      lines.push(example.description);
      lines.push("");
      lines.push(formatCodeBlock(example.code, "typescript"));
      lines.push("");
    }

    // Footer
    lines.push("---");
    lines.push("");
    lines.push("_Generated at: " + new Date().toISOString() + "_");
    lines.push("_See CONTEXT.md in the root for system-wide overview_");

    return lines.join("\n");
  }

  /**
   * Helper: Get relationship label text
   */
  private getRelationshipLabel(type: RelationshipType): string {
    const labels = {
      hasMany: "has many",
      hasOne: "has one",
      belongsTo: "belongs to",
    };
    return labels[type];
  }

  /**
   * Helper: Infer cardinality from relationship type
   */
  private inferCardinality(
    type: RelationshipType
  ): "1:1" | "1:N" | "N:1" | "N:M" {
    switch (type) {
      case RelationshipType.HAS_MANY:
        return "1:N";
      case RelationshipType.HAS_ONE:
        return "1:1";
      case RelationshipType.BELONGS_TO:
        return "N:1";
      default:
        return "N:M";
    }
  }

  /**
   * Helper: Infer foreign key name from entity names
   */
  private inferForeignKey(source: string, target: string): string {
    return `${target.toLowerCase()}_id`;
  }

  /**
   * Helper: Get access path for relationship
   */
  private getAccessPath(source: string, target: string): string {
    return `/${source.toLowerCase()}/{id}/${target.toLowerCase()}`;
  }
}
