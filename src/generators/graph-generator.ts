/**
 * Mermaid Graph Generator
 * Converts RelationshipGraph to Mermaid markdown diagram format
 * Generates GRAPH.md with entity relationship diagrams
 */

import * as fs from "fs";
import * as path from "path";
import type {
  RelationshipGraph,
  DetectedRelationship,
  EntityNode,
} from "../analyzers/relationship-types";
import { RelationshipType } from "../analyzers/relationship-types";

/**
 * GraphGenerator converts a RelationshipGraph to Mermaid markdown format
 */
export class GraphGenerator {
  /**
   * Generate a Mermaid graph and write to GRAPH.md file
   * @param graph - The relationship graph to visualize
   * @param outputPath - Directory where GRAPH.md will be written
   * @returns Path to the generated GRAPH.md file
   */
  public generate(graph: RelationshipGraph, outputPath: string): string {
    // Generate Mermaid diagram
    const mermaidDiagram = this.generateMermaidDiagram(graph);

    // Generate entity summary table
    const summaryTable = this.generateSummaryTable(graph);

    // Combine into markdown
    const markdown = this.generateMarkdown(
      mermaidDiagram,
      summaryTable,
      graph.metadata
    );

    // Write to file
    const outputFile = path.join(outputPath, "GRAPH.md");
    fs.mkdirSync(outputPath, { recursive: true });
    fs.writeFileSync(outputFile, markdown, "utf-8");

    return outputFile;
  }

  /**
   * Generate the Mermaid diagram code
   */
  private generateMermaidDiagram(graph: RelationshipGraph): string {
    const lines: string[] = [];

    // Start flowchart
    lines.push("graph LR");
    lines.push("");

    // Add entity nodes
    for (const [, entity] of graph.entities) {
      lines.push(`  ${entity.name}["${entity.name}"]:::entityStyle`);
    }

    if (graph.entities.size > 0) {
      lines.push("");
    }

    // Add relationship edges, tracking bidirectional pairs
    const processedEdges = new Set<string>();
    const bidirectionalEdges: Array<{
      entity1: string;
      entity2: string;
      rel1: DetectedRelationship;
      rel2: DetectedRelationship;
    }> = [];

    // First pass: identify bidirectional pairs
    for (let i = 0; i < graph.relationships.length; i++) {
      const rel1 = graph.relationships[i];
      const edgeKey1 = `${rel1.sourceEntity}|${rel1.targetEntity}`;

      if (processedEdges.has(edgeKey1)) continue;

      // Look for reverse relationship
      const reverseRel = graph.relationships.find(
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
          rel1,
          rel2: reverseRel,
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
    for (const rel of graph.relationships) {
      const edgeKey = `${rel.sourceEntity}|${rel.targetEntity}`;
      const reverseKey = `${rel.targetEntity}|${rel.sourceEntity}`;

      // Skip if this is part of a bidirectional pair
      if (processedEdges.has(edgeKey) || processedEdges.has(reverseKey)) {
        continue;
      }

      const arrowType = this.getArrowType(rel.type);
      const label = rel.type;

      lines.push(`  ${rel.sourceEntity} ${arrowType}|${label}| ${rel.targetEntity}`);
    }

    if (graph.relationships.length > 0) {
      lines.push("");
    }

    // Add styling
    lines.push("  classDef entityStyle fill:#4A90E2,stroke:#2E5C8A,stroke-width:2px,color:#fff,font-weight:bold");
    lines.push("");
    lines.push("  %% Bidirectional edges indicate mutual relationships");

    return lines.join("\n");
  }

  /**
   * Get the Mermaid arrow syntax for a relationship type
   */
  private getArrowType(type: RelationshipType): string {
    switch (type) {
      case RelationshipType.HAS_MANY:
      case RelationshipType.HAS_ONE:
      case RelationshipType.BELONGS_TO:
        return "-->";
      default:
        return "-->";
    }
  }

  /**
   * Generate the entity summary table
   */
  private generateSummaryTable(graph: RelationshipGraph): string {
    const lines: string[] = [];

    lines.push("## Entity Summary");
    lines.push("");
    lines.push(
      "| Entity | Endpoints | Relationships | Bidirectional |"
    );
    lines.push(
      "|--------|-----------|---------------|---------------|"
    );

    // Count bidirectional relationships per entity
    const bidirectionalCounts = new Map<string, number>();

    for (const rel of graph.relationships) {
      const reverseRel = graph.relationships.find(
        (r) =>
          r.sourceEntity === rel.targetEntity &&
          r.targetEntity === rel.sourceEntity
      );

      if (reverseRel) {
        const key = [rel.sourceEntity, rel.targetEntity].sort().join("|");
        const count = (bidirectionalCounts.get(key) || 0) + 1;
        // Only count once per pair
        if (rel.sourceEntity < rel.targetEntity) {
          bidirectionalCounts.set(key, count);
        }
      }
    }

    // Sort entities by name for consistent output
    const entities = Array.from(graph.entities.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    for (const entity of entities) {
      const endpointCount = entity.endpoints.length;
      const relationshipCount = entity.relationships.length;
      const bidirectionalKey = Array.from(graph.entities.keys())
        .filter((name) => {
          const reverseRel = graph.relationships.find(
            (r) =>
              (r.sourceEntity === entity.name && r.targetEntity === name) ||
              (r.sourceEntity === name && r.targetEntity === entity.name)
          );
          return (
            reverseRel &&
            graph.relationships.find(
              (r) =>
                (r.sourceEntity === name && r.targetEntity === entity.name) ||
                (r.sourceEntity === entity.name && r.targetEntity === name)
            )
          );
        })
        .length;

      lines.push(
        `| ${entity.name} | ${endpointCount} | ${relationshipCount} | ${bidirectionalKey > 0 ? "Yes" : "No"} |`
      );
    }

    return lines.join("\n");
  }

  /**
   * Generate the complete markdown document
   */
  private generateMarkdown(
    mermaidDiagram: string,
    summaryTable: string,
    metadata: { specTitle?: string; specVersion?: string; generatedAt: string }
  ): string {
    const lines: string[] = [];

    lines.push("# Entity Relationship Graph");
    lines.push("");

    if (metadata.specTitle) {
      lines.push(`Generated from: **${metadata.specTitle}**`);
      if (metadata.specVersion) {
        lines.push(` v${metadata.specVersion}`);
      }
      lines.push("");
    }

    lines.push(`Generated at: ${new Date(metadata.generatedAt).toISOString()}`);
    lines.push("");

    lines.push("## Mermaid Diagram");
    lines.push("");
    lines.push("```mermaid");
    lines.push(mermaidDiagram);
    lines.push("```");
    lines.push("");

    lines.push(summaryTable);

    return lines.join("\n");
  }
}
