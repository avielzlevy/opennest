/**
 * RELATIONSHIPS.json Generator
 * Converts RelationshipGraph to machine-readable RELATIONSHIPS.json export
 * Generates deterministic, validated JSON exports consumable by downstream systems
 */

import * as fs from "fs";
import * as path from "path";
import type {
  RelationshipGraph,
  DetectedRelationship,
  EntityNode,
} from "../analyzers/relationship-types";
import { RelationshipType } from "../analyzers/relationship-types";
import {
  type RelationshipsExport,
  type EntityDefinition,
  type RelationshipDefinition,
  type RelationshipsMetadata,
  validateRelationshipsExportData,
  sortRelationships,
  sortEntities,
} from "./relationships-schema";

/**
 * RelationshipsJsonGenerator converts a RelationshipGraph to RELATIONSHIPS.json format
 */
export class RelationshipsJsonGenerator {
  /**
   * Generate a RELATIONSHIPS.json file from a relationship graph
   * @param graph - The relationship graph to export
   * @param outputPath - Directory where RELATIONSHIPS.json will be written
   * @returns Path to the generated RELATIONSHIPS.json file
   * @throws Error if validation fails
   */
  public generate(graph: RelationshipGraph, outputPath: string): string {
    // Transform graph to export format
    const relationshipsExport = this.transformGraphToExport(graph);

    // Validate the export
    const validation = validateRelationshipsExportData(relationshipsExport);
    if (!validation.valid) {
      const errorMessages = validation.errors
        .map((e) => `${e.path}: ${e.message}`)
        .join("\n");
      throw new Error(`Invalid RELATIONSHIPS.json structure:\n${errorMessages}`);
    }

    // Pretty-print JSON with 2-space indentation
    const jsonContent = JSON.stringify(relationshipsExport, null, 2);

    // Write to file
    const outputFile = path.join(outputPath, "RELATIONSHIPS.json");
    fs.mkdirSync(outputPath, { recursive: true });
    fs.writeFileSync(outputFile, jsonContent, "utf-8");

    return outputFile;
  }

  /**
   * Transform a RelationshipGraph to RelationshipsExport format
   * @param graph - The relationship graph to transform
   * @returns Validated RelationshipsExport object
   */
  private transformGraphToExport(graph: RelationshipGraph): RelationshipsExport {
    // Create metadata
    const metadata = this.createMetadata(graph);

    // Transform entities
    const entities = this.transformEntities(graph);

    // Transform relationships
    const relationships = this.transformRelationships(graph);

    return {
      metadata,
      entities: sortEntities(entities),
      relationships: sortRelationships(relationships),
    };
  }

  /**
   * Create metadata for the export
   * @param graph - The relationship graph
   * @returns RelationshipsMetadata object
   */
  private createMetadata(graph: RelationshipGraph): RelationshipsMetadata {
    return {
      specTitle: graph.metadata.specTitle,
      specVersion: graph.metadata.specVersion,
      generatedAt: new Date().toISOString(),
      totalEntities: graph.metadata.totalEntities,
      totalRelationships: graph.metadata.totalRelationships,
      exportVersion: "1.0.0",
    };
  }

  /**
   * Transform entity nodes to entity definitions
   * @param graph - The relationship graph
   * @returns Record of entity name to EntityDefinition
   */
  private transformEntities(
    graph: RelationshipGraph
  ): Record<string, EntityDefinition> {
    const entities: Record<string, EntityDefinition> = {};

    for (const [, node] of graph.entities) {
      entities[node.name] = this.transformEntityNode(node);
    }

    return entities;
  }

  /**
   * Transform a single entity node to entity definition
   * @param node - The entity node
   * @returns EntityDefinition
   */
  private transformEntityNode(node: EntityNode): EntityDefinition {
    return {
      name: node.name,
      endpoints: node.endpoints.map((ep) => ({
        method: ep.method,
        path: ep.path,
        operationId: ep.operationId,
        description: ep.description,
      })),
      relationships: node.relationships.map((rel) =>
        this.transformRelationship(rel)
      ),
    };
  }

  /**
   * Transform detected relationships to relationship definitions
   * @param graph - The relationship graph
   * @returns Array of RelationshipDefinition
   */
  private transformRelationships(
    graph: RelationshipGraph
  ): RelationshipDefinition[] {
    return graph.relationships.map((rel) => this.transformRelationship(rel));
  }

  /**
   * Transform a single detected relationship to relationship definition
   * @param rel - The detected relationship
   * @returns RelationshipDefinition
   */
  private transformRelationship(
    rel: DetectedRelationship
  ): RelationshipDefinition {
    // Map RelationshipType enum to string literals
    let typeString: "hasMany" | "hasOne" | "belongsTo";
    if (rel.type === RelationshipType.HAS_MANY) {
      typeString = "hasMany";
    } else if (rel.type === RelationshipType.HAS_ONE) {
      typeString = "hasOne";
    } else {
      typeString = "belongsTo";
    }

    // Map ConfidenceLevel enum to string literals
    let confidenceString: "high" | "medium" | "low";
    if (rel.confidence === "high") {
      confidenceString = "high";
    } else if (rel.confidence === "medium") {
      confidenceString = "medium";
    } else {
      confidenceString = "low";
    }

    // Map DetectionSource enum to string literals
    const detectedByStrings: Array<"schema_ref" | "naming_pattern" | "path_pattern"> =
      rel.detectedBy.map((source) => {
        if (source === "schema_ref") return "schema_ref";
        if (source === "naming_pattern") return "naming_pattern";
        return "path_pattern";
      });

    return {
      sourceEntity: rel.sourceEntity,
      targetEntity: rel.targetEntity,
      type: typeString,
      confidence: confidenceString,
      detectedBy: detectedByStrings,
      evidence: rel.evidence.map((ev) => ({
        source: ev.source === "schema_ref" ? "schema_ref" :
                ev.source === "naming_pattern" ? "naming_pattern" : "path_pattern",
        location: ev.location,
        details: ev.details,
      })),
    };
  }
}
