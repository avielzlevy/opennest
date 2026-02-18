/**
 * Relationship Detection Type System
 * Defines types and interfaces for detecting, analyzing, and representing relationships
 * between entities in OpenAPI specifications
 */

import type { OpenAPIV3 } from "openapi-types";

/**
 * Enumeration of relationship types between entities
 */
export enum RelationshipType {
  /** One entity has many of another (e.g., User hasMany Order) */
  HAS_MANY = "hasMany",
  /** One entity has one of another (e.g., User hasOne Profile) */
  HAS_ONE = "hasOne",
  /** One entity belongs to another (e.g., Order belongsTo User) */
  BELONGS_TO = "belongsTo",
}

/**
 * Enumeration of sources where relationships are detected
 */
export enum DetectionSource {
  /** Detected from OpenAPI schema $ref references */
  SCHEMA_REF = "schema_ref",
  /** Detected from naming patterns (userId, user_id, etc.) */
  NAMING_PATTERN = "naming_pattern",
  /** Detected from API path patterns (/users/{id}/orders) */
  PATH_PATTERN = "path_pattern",
}

/**
 * Confidence levels for relationship detections
 */
export enum ConfidenceLevel {
  /** Highest confidence (explicit schema references) */
  HIGH = "high",
  /** Medium confidence (patterns with some interpretation) */
  MEDIUM = "medium",
  /** Lower confidence (ambiguous patterns) */
  LOW = "low",
}

/**
 * Evidence supporting a detected relationship
 * Provides traceability for how a relationship was discovered
 */
export interface RelationshipEvidence {
  /** Source where evidence originated (schema_ref, naming_pattern, path_pattern) */
  source: DetectionSource;
  /** Specific location in the spec where evidence was found */
  location: string;
  /** Details about the evidence (property name, ref path, pattern matched, etc.) */
  details: string;
}

/**
 * A detected relationship between two entities
 * Includes confidence levels and evidence for validation and debugging
 */
export interface DetectedRelationship {
  /** Name of the entity that owns/sources this relationship */
  sourceEntity: string;
  /** Name of the entity being related to */
  targetEntity: string;
  /** Type of relationship (hasMany, hasOne, belongsTo) */
  type: RelationshipType;
  /** Confidence level of this relationship detection */
  confidence: ConfidenceLevel;
  /** Array of detection sources that identified this relationship */
  detectedBy: DetectionSource[];
  /** Evidence records supporting this relationship */
  evidence: RelationshipEvidence[];
}

/**
 * Information about an API endpoint
 */
export interface EndpointInfo {
  /** HTTP method (GET, POST, PUT, DELETE, PATCH) */
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";
  /** API path (e.g., /users/{id}/orders) */
  path: string;
  /** Operation ID from OpenAPI spec */
  operationId?: string;
  /** Endpoint description from OpenAPI spec */
  description?: string;
}

/**
 * Node representing an entity in the relationship graph
 * Contains metadata about the entity and its relationships
 */
export interface EntityNode {
  /** Name of the entity (e.g., User, Order, Product) */
  name: string;
  /** All API endpoints associated with this entity */
  endpoints: EndpointInfo[];
  /** All relationships where this entity is the source */
  relationships: DetectedRelationship[];
}

/**
 * Metadata about the entire relationship graph
 * Provides context and summary information
 */
export interface GraphMetadata {
  /** Title of the OpenAPI specification */
  specTitle?: string;
  /** Version of the OpenAPI specification */
  specVersion?: string;
  /** Timestamp when the graph was generated */
  generatedAt: string;
  /** Total number of entities in the graph */
  totalEntities: number;
  /** Total number of relationships in the graph */
  totalRelationships: number;
}

/**
 * Complete relationship graph structure
 * Contains all entities, their endpoints, relationships, and metadata
 */
export interface RelationshipGraph {
  /** Map of entity names to their node definitions */
  entities: Map<string, EntityNode>;
  /** All relationships detected in the specification */
  relationships: DetectedRelationship[];
  /** Metadata about the graph */
  metadata: GraphMetadata;
}

/**
 * Type guard to check if a value is a DetectedRelationship
 */
export function isDetectedRelationship(
  value: unknown
): value is DetectedRelationship {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.sourceEntity === "string" &&
    typeof obj.targetEntity === "string" &&
    Object.values(RelationshipType).includes(obj.type as RelationshipType) &&
    Object.values(ConfidenceLevel).includes(obj.confidence as ConfidenceLevel) &&
    Array.isArray(obj.detectedBy) &&
    obj.detectedBy.every((s: unknown) =>
      Object.values(DetectionSource).includes(s as DetectionSource)
    ) &&
    Array.isArray(obj.evidence)
  );
}

/**
 * Type guard to check if a value is an EntityNode
 */
export function isEntityNode(value: unknown): value is EntityNode {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.name === "string" &&
    Array.isArray(obj.endpoints) &&
    Array.isArray(obj.relationships)
  );
}

/**
 * Type guard to check if a value is a RelationshipGraph
 */
export function isRelationshipGraph(value: unknown): value is RelationshipGraph {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    obj.entities instanceof Map &&
    Array.isArray(obj.relationships) &&
    typeof obj.metadata === "object" &&
    obj.metadata !== null
  );
}
