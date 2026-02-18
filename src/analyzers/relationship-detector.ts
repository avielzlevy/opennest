/**
 * Relationship Detection Engine
 * Analyzes OpenAPI specifications to detect relationships between entities
 * from three sources: schema $refs, naming patterns, and path patterns
 */

import type { OpenAPIV3 } from "openapi-types";
import {
  RelationshipType,
  DetectionSource,
  ConfidenceLevel,
  type DetectedRelationship,
  type RelationshipEvidence,
  type EntityNode,
  type EndpointInfo,
  type RelationshipGraph,
  type GraphMetadata,
} from "./relationship-types";

/**
 * RelationshipDetector analyzes OpenAPI specifications to identify relationships
 * between entities through multiple detection strategies
 */
export class RelationshipDetector {
  /**
   * Analyze an OpenAPI document to detect entity relationships
   * @param document - OpenAPI 3.0 document to analyze
   * @returns Complete relationship graph with all entities and relationships
   */
  public analyze(document: OpenAPIV3.Document): RelationshipGraph {
    // Detect relationships from all three sources
    const schemaRefRelationships = this.detectSchemaRefRelationships(document);
    const namingPatternRelationships =
      this.detectNamingPatternRelationships(document);
    const pathPatternRelationships = this.detectPathPatternRelationships(
      document
    );

    // Consolidate all detected relationships
    const allDetections = [
      ...schemaRefRelationships,
      ...namingPatternRelationships,
      ...pathPatternRelationships,
    ];
    const consolidatedRelationships = this.consolidateRelationships(
      allDetections
    );

    // Build the complete entity graph
    const graph = this.buildEntityGraph(document, consolidatedRelationships);

    return graph;
  }

  /**
   * Detect relationships from OpenAPI schema $ref references
   * - Array items with $ref → hasMany
   * - Single object $ref → hasOne
   * - Properties ending in Id/_id → belongsTo
   *
   * @param document - OpenAPI document to analyze
   * @returns Array of detected relationships from schema references
   */
  private detectSchemaRefRelationships(
    document: OpenAPIV3.Document
  ): DetectedRelationship[] {
    const relationships: DetectedRelationship[] = [];
    const schemas = document.components?.schemas || {};

    for (const [schemaName, schema] of Object.entries(schemas)) {
      if (!this.isSchemaObject(schema)) continue;

      const schemaObj = schema as Record<string, unknown>;
      const properties = (schemaObj.properties as Record<string, unknown>) || {};

      for (const [propName, prop] of Object.entries(properties)) {
        if (!this.isSchemaObject(prop)) continue;

        const propObj = prop as Record<string, unknown>;

        // Check for belongsTo pattern (ends with Id or _id)
        if (
          propName.endsWith("Id") ||
          propName.endsWith("_id") ||
          propName.endsWith("ID")
        ) {
          const targetEntity = this.deriveEntityNameFromProperty(propName);
          const ref = propObj.$ref || propObj.type;

          if (ref) {
            relationships.push({
              sourceEntity: schemaName,
              targetEntity,
              type: RelationshipType.BELONGS_TO,
              confidence: ConfidenceLevel.MEDIUM,
              detectedBy: [DetectionSource.SCHEMA_REF],
              evidence: [
                {
                  source: DetectionSource.SCHEMA_REF,
                  location: `components.schemas.${schemaName}.properties.${propName}`,
                  details: `ID property pattern: "${propName}" derives entity "${targetEntity}"`,
                },
              ],
            });
          }
        }

        // Check for array $ref (hasMany)
        if (
          propObj.type === "array" &&
          propObj.items &&
          this.isSchemaObject(propObj.items)
        ) {
          const itemObj = propObj.items as Record<string, unknown>;
          const ref = itemObj.$ref;

          if (typeof ref === "string") {
            const targetEntity = this.extractEntityNameFromRef(ref);
            relationships.push({
              sourceEntity: schemaName,
              targetEntity,
              type: RelationshipType.HAS_MANY,
              confidence: ConfidenceLevel.HIGH,
              detectedBy: [DetectionSource.SCHEMA_REF],
              evidence: [
                {
                  source: DetectionSource.SCHEMA_REF,
                  location: `components.schemas.${schemaName}.properties.${propName}.items`,
                  details: `Array reference to "${targetEntity}"`,
                },
              ],
            });
          }
        }

        // Check for single object $ref (hasOne)
        if (
          typeof propObj.$ref === "string" &&
          propObj.type !== "array"
        ) {
          const targetEntity = this.extractEntityNameFromRef(
            propObj.$ref as string
          );
          relationships.push({
            sourceEntity: schemaName,
            targetEntity,
            type: RelationshipType.HAS_ONE,
            confidence: ConfidenceLevel.HIGH,
            detectedBy: [DetectionSource.SCHEMA_REF],
            evidence: [
              {
                source: DetectionSource.SCHEMA_REF,
                location: `components.schemas.${schemaName}.properties.${propName}`,
                details: `Direct reference to "${targetEntity}"`,
              },
            ],
          });
        }

        // Check for allOf compositions
        if (propObj.allOf && Array.isArray(propObj.allOf)) {
          for (const allOfSchema of propObj.allOf) {
            if (this.isSchemaObject(allOfSchema)) {
              const allOfObj = allOfSchema as Record<string, unknown>;
              if (typeof allOfObj.$ref === "string") {
                const targetEntity = this.extractEntityNameFromRef(
                  allOfObj.$ref
                );
                relationships.push({
                  sourceEntity: schemaName,
                  targetEntity,
                  type: RelationshipType.HAS_ONE,
                  confidence: ConfidenceLevel.MEDIUM,
                  detectedBy: [DetectionSource.SCHEMA_REF],
                  evidence: [
                    {
                      source: DetectionSource.SCHEMA_REF,
                      location: `components.schemas.${schemaName}.properties.${propName}.allOf`,
                      details: `Composition reference to "${targetEntity}"`,
                    },
                  ],
                });
              }
            }
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Detect relationships from naming patterns
   * - userId, user_id → belongsTo User
   * - categoryIds → hasMany Category
   *
   * @param document - OpenAPI document to analyze
   * @returns Array of detected relationships from naming patterns
   */
  private detectNamingPatternRelationships(
    document: OpenAPIV3.Document
  ): DetectedRelationship[] {
    const relationships: DetectedRelationship[] = [];
    const schemas = document.components?.schemas || {};

    // Pattern: singular Id/id at end → belongsTo
    const singleIdPattern = /^(.+?)(?:Id|_id|ID)$/;
    // Pattern: plural Ids/ids at end → hasMany
    const pluralIdPattern = /^(.+?)(?:Ids|_ids|IDs)$/;

    for (const [schemaName, schema] of Object.entries(schemas)) {
      if (!this.isSchemaObject(schema)) continue;

      const properties = (schema as OpenAPIV3.SchemaObject).properties || {};

      for (const propName of Object.keys(properties)) {
        // Check singular pattern (belongsTo)
        const singularMatch = singleIdPattern.exec(propName);
        if (singularMatch && !propName.endsWith("Ids") && !propName.endsWith("_ids") && !propName.endsWith("IDs")) {
          const baseName = singularMatch[1];
          const targetEntity = this.capitalize(baseName);

          relationships.push({
            sourceEntity: schemaName,
            targetEntity,
            type: RelationshipType.BELONGS_TO,
            confidence: ConfidenceLevel.MEDIUM,
            detectedBy: [DetectionSource.NAMING_PATTERN],
            evidence: [
              {
                source: DetectionSource.NAMING_PATTERN,
                location: `components.schemas.${schemaName}.properties.${propName}`,
                details: `Foreign key pattern "${propName}" matches singular ID naming convention`,
              },
            ],
          });
        }

        // Check plural pattern (hasMany)
        const pluralMatch = pluralIdPattern.exec(propName);
        if (pluralMatch) {
          const baseName = pluralMatch[1];
          const targetEntity = this.capitalize(this.singularize(baseName));

          relationships.push({
            sourceEntity: schemaName,
            targetEntity,
            type: RelationshipType.HAS_MANY,
            confidence: ConfidenceLevel.MEDIUM,
            detectedBy: [DetectionSource.NAMING_PATTERN],
            evidence: [
              {
                source: DetectionSource.NAMING_PATTERN,
                location: `components.schemas.${schemaName}.properties.${propName}`,
                details: `Foreign key pattern "${propName}" matches plural ID naming convention`,
              },
            ],
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Detect relationships from API path patterns
   * - /users/{id}/orders → User hasMany Order
   * - /orders/{id}/details → Order hasOne Details
   *
   * @param document - OpenAPI document to analyze
   * @returns Array of detected relationships from path patterns
   */
  private detectPathPatternRelationships(
    document: OpenAPIV3.Document
  ): DetectedRelationship[] {
    const relationships: DetectedRelationship[] = [];
    const paths = document.paths || {};

    // Pattern: /parent/{parentId}/children or /parent/{parentId}/child
    const nestedPathPattern = /^\/([^/{\s]+)(?:\/{[^}]+})?\/([^/{\s]+)(?:\/{[^}]+})?(?:\/.*)?$/;

    for (const path of Object.keys(paths)) {
      const match = nestedPathPattern.exec(path);
      if (!match) continue;

      const parentSegment = match[1];
      const childSegment = match[2];

      // Skip if parent segment is a parameter
      if (parentSegment.startsWith("{")) continue;

      const parentEntity = this.singularizePathSegment(parentSegment);
      const childEntity = this.singularizePathSegment(childSegment);

      // Check if path contains param pattern like {parentId}
      if (path.includes("{") && path.includes("}")) {
        // Determine cardinality: plural segments → hasMany, singular → hasOne
        const isChildPlural = this.isPluralPathSegment(childSegment);
        const relationType = isChildPlural
          ? RelationshipType.HAS_MANY
          : RelationshipType.HAS_ONE;

        relationships.push({
          sourceEntity: parentEntity,
          targetEntity: childEntity,
          type: relationType,
          confidence: ConfidenceLevel.HIGH,
          detectedBy: [DetectionSource.PATH_PATTERN],
          evidence: [
            {
              source: DetectionSource.PATH_PATTERN,
              location: `paths."${path}"`,
              details: `Nested path pattern: ${parentEntity} ${relationType} ${childEntity}`,
            },
          ],
        });
      }
    }

    return relationships;
  }

  /**
   * Consolidate relationships from multiple sources using majority voting
   * Merges duplicate relationships and elevates confidence when multiple sources agree
   *
   * @param allRelationships - All relationships from all detection sources
   * @returns Consolidated array of relationships
   */
  private consolidateRelationships(
    allRelationships: DetectedRelationship[]
  ): DetectedRelationship[] {
    // Create a map to group relationships by key (sourceEntity + targetEntity + type)
    const relationshipMap = new Map<string, DetectedRelationship>();

    for (const rel of allRelationships) {
      const key = `${rel.sourceEntity}|${rel.targetEntity}|${rel.type}`;

      if (relationshipMap.has(key)) {
        // Relationship already exists - merge evidence and detection sources
        const existing = relationshipMap.get(key)!;

        // Add new detection sources if not already present
        for (const source of rel.detectedBy) {
          if (!existing.detectedBy.includes(source)) {
            existing.detectedBy.push(source);
          }
        }

        // Add new evidence
        existing.evidence.push(...rel.evidence);

        // Elevate confidence based on number of sources
        if (existing.detectedBy.length >= 2) {
          existing.confidence = ConfidenceLevel.HIGH;
        }
      } else {
        // New relationship - add to map
        relationshipMap.set(key, { ...rel });
      }
    }

    return Array.from(relationshipMap.values());
  }

  /**
   * Build the complete entity graph from relationships and document
   * Extracts entities, creates nodes, attaches endpoints and relationships
   *
   * @param document - OpenAPI document
   * @param relationships - Consolidated relationships
   * @returns Complete RelationshipGraph structure
   */
  private buildEntityGraph(
    document: OpenAPIV3.Document,
    relationships: DetectedRelationship[]
  ): RelationshipGraph {
    const entities = new Map<string, EntityNode>();

    // Extract all unique entity names
    const entityNames = new Set<string>();

    // From schemas
    if (document.components?.schemas) {
      for (const schemaName of Object.keys(document.components.schemas)) {
        entityNames.add(schemaName);
      }
    }

    // From relationships
    for (const rel of relationships) {
      entityNames.add(rel.sourceEntity);
      entityNames.add(rel.targetEntity);
    }

    // From path segments
    if (document.paths) {
      for (const path of Object.keys(document.paths)) {
        const segments = path.split("/").filter((s) => !s.startsWith("{") && s);
        for (const segment of segments) {
          const entityName = this.singularizePathSegment(segment);
          entityNames.add(entityName);
        }
      }
    }

    // Create EntityNode for each entity
    entityNames.forEach((entityName) => {
      entities.set(entityName, {
        name: entityName,
        endpoints: [],
        relationships: [],
      });
    });

    // Attach endpoints to entities
    if (document.paths) {
      for (const [path, pathItem] of Object.entries(document.paths)) {
        if (!this.isPathItemObject(pathItem)) continue;

        const pathItemObj = pathItem as OpenAPIV3.PathItemObject;

        // Infer entity from path segments
        const segments = path.split("/").filter((s) => !s.startsWith("{") && s);
        const primarySegment = segments[0];
        const entityName = primarySegment
          ? this.singularizePathSegment(primarySegment)
          : "Unknown";

        const entity = entities.get(entityName);
        if (!entity) continue;

        // Extract operations
        for (const [method, operation] of Object.entries(pathItemObj)) {
          if (!["get", "post", "put", "delete", "patch", "options"].includes(method.toLowerCase())) {
            continue;
          }

          if (!this.isOperationObject(operation)) continue;

          const opObj = operation as OpenAPIV3.OperationObject;

          const endpoint: EndpointInfo = {
            method: method.toUpperCase() as
              | "GET"
              | "POST"
              | "PUT"
              | "DELETE"
              | "PATCH"
              | "OPTIONS",
            path,
            operationId: opObj.operationId,
            description: opObj.description || opObj.summary,
          };

          entity.endpoints.push(endpoint);
        }
      }
    }

    // Attach relationships to source entities
    for (const rel of relationships) {
      const sourceEntity = entities.get(rel.sourceEntity);
      if (sourceEntity) {
        sourceEntity.relationships.push(rel);
      }
    }

    // Create metadata
    const metadata: GraphMetadata = {
      specTitle: document.info?.title,
      specVersion: document.info?.version,
      generatedAt: new Date().toISOString(),
      totalEntities: entities.size,
      totalRelationships: relationships.length,
    };

    return {
      entities,
      relationships,
      metadata,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Extract entity name from a $ref string
   * Example: "#/components/schemas/User" → "User"
   */
  private extractEntityNameFromRef(ref: string): string {
    const parts = ref.split("/");
    return parts[parts.length - 1] || "Unknown";
  }

  /**
   * Derive entity name from a property name using singularization
   * Example: "userId" → "User", "categoryIds" → "Category"
   */
  private deriveEntityNameFromProperty(propName: string): string {
    // Remove Id, _id, ID, Ids, _ids, IDs suffix
    let baseName = propName;
    baseName = baseName.replace(/(?:Id|_id|ID|Ids|_ids|IDs)$/, "");

    // Singularize if needed
    if (baseName.endsWith("s") && !baseName.endsWith("ss")) {
      baseName = this.singularize(baseName);
    }

    return this.capitalize(baseName);
  }

  /**
   * Singularize a path segment name
   * Example: "users" → "User", "order_items" → "OrderItem"
   */
  private singularizePathSegment(segment: string): string {
    // Handle kebab-case (convert to PascalCase first)
    let name = segment
      .split("-")
      .map((part) => this.capitalize(part))
      .join("");

    // Handle snake_case
    name = name
      .split("_")
      .map((part) => this.capitalize(part))
      .join("");

    // Singularize if ends with 's'
    if (name.endsWith("s") && !name.endsWith("ss")) {
      name = this.singularize(name);
    }

    return this.capitalize(name);
  }

  /**
   * Check if a path segment is plural
   */
  private isPluralPathSegment(segment: string): boolean {
    return segment.endsWith("s") && !segment.endsWith("ss");
  }

  /**
   * Simple singularization (removes trailing 's')
   */
  private singularize(word: string): string {
    if (word.endsWith("ies")) {
      return word.slice(0, -3) + "y";
    }
    if (word.endsWith("sses")) {
      return word.slice(0, -2);
    }
    if (word.endsWith("s") && !word.endsWith("ss")) {
      return word.slice(0, -1);
    }
    return word;
  }

  /**
   * Capitalize first letter of a string
   */
  private capitalize(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Type guard to check if value is a SchemaObject
   */
  private isSchemaObject(value: unknown): value is OpenAPIV3.SchemaObject {
    return typeof value === "object" && value !== null;
  }

  /**
   * Type guard to check if value is a PathItemObject
   */
  private isPathItemObject(value: unknown): value is OpenAPIV3.PathItemObject {
    return typeof value === "object" && value !== null;
  }

  /**
   * Type guard to check if value is an OperationObject
   */
  private isOperationObject(value: unknown): value is OpenAPIV3.OperationObject {
    return typeof value === "object" && value !== null;
  }
}
