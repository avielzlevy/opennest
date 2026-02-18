/**
 * RELATIONSHIPS.json Schema and Types
 * Defines TypeScript interfaces and JSON Schema for machine-readable relationship export
 * Provides schema validation and type guards for runtime safety
 */

import Ajv from "ajv";
import {
  RelationshipType,
  DetectionSource,
  ConfidenceLevel,
} from "../analyzers/relationship-types";

/**
 * Evidence record supporting a relationship detection
 * Provides complete traceability for how a relationship was discovered
 */
export interface RelationshipEvidenceDefinition {
  /** Source where evidence originated */
  source: "schema_ref" | "naming_pattern" | "path_pattern";
  /** Specific location in the spec where evidence was found */
  location: string;
  /** Details about the evidence (property name, ref path, pattern matched, etc.) */
  details: string;
}

/**
 * Single relationship between two entities
 * Machine-readable format for export and external consumption
 */
export interface RelationshipDefinition {
  /** Name of the entity that owns/sources this relationship */
  sourceEntity: string;
  /** Name of the entity being related to */
  targetEntity: string;
  /** Type of relationship (hasMany, hasOne, belongsTo) */
  type: "hasMany" | "hasOne" | "belongsTo";
  /** Confidence level of this relationship detection */
  confidence: "high" | "medium" | "low";
  /** Array of detection sources that identified this relationship */
  detectedBy: Array<"schema_ref" | "naming_pattern" | "path_pattern">;
  /** Evidence records supporting this relationship */
  evidence: RelationshipEvidenceDefinition[];
}

/**
 * Entity definition in the relationship graph export
 * Contains metadata and all relationships where entity is the source
 */
export interface EntityDefinition {
  /** Name of the entity (e.g., User, Order, Product) */
  name: string;
  /** All API endpoints associated with this entity */
  endpoints: Array<{
    /** HTTP method (GET, POST, PUT, DELETE, PATCH, OPTIONS) */
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";
    /** API path (e.g., /users/{id}/orders) */
    path: string;
    /** Operation ID from OpenAPI spec */
    operationId?: string;
    /** Endpoint description from OpenAPI spec */
    description?: string;
  }>;
  /** All relationships where this entity is the source */
  relationships: RelationshipDefinition[];
}

/**
 * Metadata about the relationship export
 * Provides context about when and where data was generated
 */
export interface RelationshipsMetadata {
  /** Title of the OpenAPI specification */
  specTitle?: string;
  /** Version of the OpenAPI specification */
  specVersion?: string;
  /** Timestamp when the relationships were generated (ISO 8601) */
  generatedAt: string;
  /** Total number of entities in the export */
  totalEntities: number;
  /** Total number of relationships in the export */
  totalRelationships: number;
  /** Export format version for schema evolution */
  exportVersion: string;
}

/**
 * Complete RELATIONSHIPS.json structure
 * Machine-readable export of all relationships detected in OpenAPI spec
 */
export interface RelationshipsExport {
  /** Export metadata and versioning information */
  metadata: RelationshipsMetadata;
  /** Map of entity names to their definitions (sorted by name) */
  entities: Record<string, EntityDefinition>;
  /** All relationships detected in the specification (sorted) */
  relationships: RelationshipDefinition[];
}

/**
 * JSON Schema Draft 7 for validating RELATIONSHIPS.json files
 * Ensures structure, types, and required fields are correct
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RELATIONSHIPS_JSON_SCHEMA: any = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["metadata", "entities", "relationships"],
  properties: {
    metadata: {
      type: "object",
      required: ["generatedAt", "totalEntities", "totalRelationships", "exportVersion"],
      properties: {
        specTitle: {
          type: ["string", "null"],
        },
        specVersion: {
          type: ["string", "null"],
        },
        generatedAt: {
          type: "string",
          minLength: 1,
        },
        totalEntities: {
          type: "integer",
          minimum: 0,
        },
        totalRelationships: {
          type: "integer",
          minimum: 0,
        },
        exportVersion: {
          type: "string",
          pattern: "^\\d+\\.\\d+\\.\\d+$",
        },
      },
      additionalProperties: false,
    },
    entities: {
      type: "object",
      additionalProperties: {
        type: "object",
        required: ["name", "endpoints", "relationships"],
        properties: {
          name: {
            type: "string",
            minLength: 1,
          },
          endpoints: {
            type: "array",
            items: {
              type: "object",
              required: ["method", "path"],
              properties: {
                method: {
                  type: "string",
                  enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
                },
                path: {
                  type: "string",
                  minLength: 1,
                },
                operationId: {
                  type: ["string", "null"],
                },
                description: {
                  type: ["string", "null"],
                },
              },
              additionalProperties: false,
            },
          },
          relationships: {
            type: "array",
            items: {
              type: "object",
              required: ["sourceEntity", "targetEntity", "type", "confidence", "detectedBy", "evidence"],
              properties: {
                sourceEntity: {
                  type: "string",
                  minLength: 1,
                },
                targetEntity: {
                  type: "string",
                  minLength: 1,
                },
                type: {
                  type: "string",
                  enum: ["hasMany", "hasOne", "belongsTo"],
                },
                confidence: {
                  type: "string",
                  enum: ["high", "medium", "low"],
                },
                detectedBy: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: ["schema_ref", "naming_pattern", "path_pattern"],
                  },
                },
                evidence: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["source", "location", "details"],
                    properties: {
                      source: {
                        type: "string",
                        enum: ["schema_ref", "naming_pattern", "path_pattern"],
                      },
                      location: {
                        type: "string",
                        minLength: 1,
                      },
                      details: {
                        type: "string",
                        minLength: 1,
                      },
                    },
                    additionalProperties: false,
                  },
                  minItems: 1,
                },
              },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    },
    relationships: {
      type: "array",
      items: {
        type: "object",
        required: ["sourceEntity", "targetEntity", "type", "confidence", "detectedBy", "evidence"],
        properties: {
          sourceEntity: {
            type: "string",
            minLength: 1,
          },
          targetEntity: {
            type: "string",
            minLength: 1,
          },
          type: {
            type: "string",
            enum: ["hasMany", "hasOne", "belongsTo"],
          },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
          detectedBy: {
            type: "array",
            items: {
              type: "string",
              enum: ["schema_ref", "naming_pattern", "path_pattern"],
            },
          },
          evidence: {
            type: "array",
            items: {
              type: "object",
              required: ["source", "location", "details"],
              properties: {
                source: {
                  type: "string",
                  enum: ["schema_ref", "naming_pattern", "path_pattern"],
                },
                location: {
                  type: "string",
                  minLength: 1,
                },
                details: {
                  type: "string",
                  minLength: 1,
                },
              },
              additionalProperties: false,
            },
            minItems: 1,
          },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

/**
 * AJV validator instance with RELATIONSHIPS.json schema compiled
 * Provides fast validation of RelationshipsExport objects
 */
const ajv = new Ajv({
  strict: true,
  validateSchema: true,
  useDefaults: false,
});

const validateRelationshipsExport = ajv.compile(RELATIONSHIPS_JSON_SCHEMA);

/**
 * Type guard: Check if value is a RelationshipEvidenceDefinition
 */
export function isRelationshipEvidenceDefinition(
  value: unknown
): value is RelationshipEvidenceDefinition {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    ["schema_ref", "naming_pattern", "path_pattern"].includes(obj.source as string) &&
    typeof obj.location === "string" &&
    obj.location.length > 0 &&
    typeof obj.details === "string" &&
    obj.details.length > 0
  );
}

/**
 * Type guard: Check if value is a RelationshipDefinition
 */
export function isRelationshipDefinition(value: unknown): value is RelationshipDefinition {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.sourceEntity === "string" &&
    obj.sourceEntity.length > 0 &&
    typeof obj.targetEntity === "string" &&
    obj.targetEntity.length > 0 &&
    ["hasMany", "hasOne", "belongsTo"].includes(obj.type as string) &&
    ["high", "medium", "low"].includes(obj.confidence as string) &&
    Array.isArray(obj.detectedBy) &&
    obj.detectedBy.every(
      (d) =>
        typeof d === "string" &&
        ["schema_ref", "naming_pattern", "path_pattern"].includes(d)
    ) &&
    Array.isArray(obj.evidence) &&
    obj.evidence.length > 0 &&
    obj.evidence.every((e) => isRelationshipEvidenceDefinition(e))
  );
}

/**
 * Type guard: Check if value is an EndpointDefinition
 */
function isEndpointDefinition(
  value: unknown
): value is EntityDefinition["endpoints"][0] {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"].includes(obj.method as string) &&
    typeof obj.path === "string" &&
    obj.path.length > 0 &&
    (obj.operationId === undefined || obj.operationId === null || typeof obj.operationId === "string") &&
    (obj.description === undefined || obj.description === null || typeof obj.description === "string")
  );
}

/**
 * Type guard: Check if value is an EntityDefinition
 */
export function isEntityDefinition(value: unknown): value is EntityDefinition {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.name === "string" &&
    obj.name.length > 0 &&
    Array.isArray(obj.endpoints) &&
    obj.endpoints.every((e) => isEndpointDefinition(e)) &&
    Array.isArray(obj.relationships) &&
    obj.relationships.every((r) => isRelationshipDefinition(r))
  );
}

/**
 * Type guard: Check if value is RelationshipsMetadata
 */
export function isRelationshipsMetadata(value: unknown): value is RelationshipsMetadata {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Validate ISO 8601 timestamp format
  const isValidTimestamp = (str: string): boolean => {
    const date = new Date(str);
    return !isNaN(date.getTime()) && str.includes("T") && (str.endsWith("Z") || str.includes("+") || str.includes("-"));
  };

  // Validate semantic versioning
  const isValidVersion = (str: string): boolean => {
    return /^\d+\.\d+\.\d+$/.test(str);
  };

  return (
    (obj.specTitle === undefined || obj.specTitle === null || typeof obj.specTitle === "string") &&
    (obj.specVersion === undefined || obj.specVersion === null || typeof obj.specVersion === "string") &&
    typeof obj.generatedAt === "string" &&
    isValidTimestamp(obj.generatedAt) &&
    typeof obj.totalEntities === "number" &&
    obj.totalEntities >= 0 &&
    typeof obj.totalRelationships === "number" &&
    obj.totalRelationships >= 0 &&
    typeof obj.exportVersion === "string" &&
    isValidVersion(obj.exportVersion)
  );
}

/**
 * Type guard: Check if value is a RelationshipsExport
 */
export function isRelationshipsExport(value: unknown): value is RelationshipsExport {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    isRelationshipsMetadata(obj.metadata) &&
    typeof obj.entities === "object" &&
    obj.entities !== null &&
    !Array.isArray(obj.entities) &&
    Object.entries(obj.entities).every(([_, entity]) => isEntityDefinition(entity)) &&
    Array.isArray(obj.relationships) &&
    obj.relationships.every((r) => isRelationshipDefinition(r))
  );
}

/**
 * Validate a RelationshipsExport object against the JSON schema
 * Combines schema validation with type guard verification
 *
 * @param value - Value to validate
 * @returns Validation result with errors if invalid
 */
export function validateRelationshipsExportData(
  value: unknown
): {
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
} {
  // First check type guard
  if (!isRelationshipsExport(value)) {
    return {
      valid: false,
      errors: [
        {
          path: "$",
          message: "Value does not match RelationshipsExport structure",
        },
      ],
    };
  }

  // Then validate against schema
  const schemaValid = validateRelationshipsExport(value as unknown);

  if (!schemaValid) {
    const errors = (validateRelationshipsExport.errors || []).map((error) => ({
      path: error.instancePath || "$",
      message: error.message || "Validation failed",
    }));

    return {
      valid: false,
      errors,
    };
  }

  return {
    valid: true,
    errors: [],
  };
}

/**
 * Create a RelationshipsExport object with validated structure
 * Ensures type safety and consistency across the export
 *
 * @param metadata - Export metadata
 * @param entities - Map of entity name to definition
 * @param relationships - Array of all relationships
 * @returns Validated RelationshipsExport object
 * @throws Error if validation fails
 */
export function createRelationshipsExport(
  metadata: RelationshipsMetadata,
  entities: Record<string, EntityDefinition>,
  relationships: RelationshipDefinition[]
): RelationshipsExport {
  const exportObj: RelationshipsExport = {
    metadata,
    entities,
    relationships,
  };

  const validation = validateRelationshipsExportData(exportObj);

  if (!validation.valid) {
    const errorMessages = validation.errors
      .map((e) => `${e.path}: ${e.message}`)
      .join("\n");
    throw new Error(`Invalid RelationshipsExport structure:\n${errorMessages}`);
  }

  return exportObj;
}

/**
 * Sort relationships by source entity then target entity
 * Ensures consistent ordering for exports
 *
 * @param relationships - Array of relationships to sort
 * @returns Sorted array
 */
export function sortRelationships(
  relationships: RelationshipDefinition[]
): RelationshipDefinition[] {
  return [...relationships].sort((a, b) => {
    if (a.sourceEntity !== b.sourceEntity) {
      return a.sourceEntity.localeCompare(b.sourceEntity);
    }
    return a.targetEntity.localeCompare(b.targetEntity);
  });
}

/**
 * Sort entities by name
 * Ensures consistent ordering for exports
 *
 * @param entities - Record of entities to sort
 * @returns Sorted record with keys in alphabetical order
 */
export function sortEntities(
  entities: Record<string, EntityDefinition>
): Record<string, EntityDefinition> {
  const sorted: Record<string, EntityDefinition> = {};

  Object.keys(entities)
    .sort()
    .forEach((key) => {
      sorted[key] = entities[key];
    });

  return sorted;
}
