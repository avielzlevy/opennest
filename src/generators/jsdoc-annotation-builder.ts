/**
 * JSDoc Annotation Builder
 * Constructs JSDoc comment structures and formatted strings for generated controllers
 * Provides metadata annotations (@ai_context, @ai_relation, etc.) for AI agent context
 */

import type { OpenAPIV3 } from "openapi-types";
import {
  RelationshipType,
  type EntityNode,
  type RelationshipGraph,
  type EndpointInfo,
  type DetectedRelationship,
} from "../analyzers/relationship-types";

/**
 * Standard JSDoc tags like @since, @deprecated, @author
 */
export interface StandardJsDocTags {
  /** API/specification version when this feature was introduced */
  since?: string;
  /** Deprecation notice if the element is deprecated */
  deprecated?: string;
  /** Author or last modified by */
  author?: string;
}

/**
 * @ai_context tag - Provides business logic context for AI agents
 * Describes what an entity or operation does from a business perspective
 */
export interface AiContextTag {
  /** Tag identifier */
  tag: "@ai_context";
  /** Multi-line description of business logic, purpose, side effects, and constraints */
  content: string;
}

/**
 * @ai_relation tag - Documents a single relationship between entities
 * Helps agents understand data flow and entity dependencies
 */
export interface AiRelationTag {
  /** Tag identifier */
  tag: "@ai_relation";
  /** Type of relationship: hasMany, hasOne, belongsTo */
  relationshipType: "hasMany" | "hasOne" | "belongsTo";
  /** Target entity name (e.g., "Order", "User") */
  targetEntity: string;
  /** Description of the relationship including foreign key details */
  description: string;
  /** Access pattern if available (e.g., "GET /users/{id}/orders") */
  accessPattern?: string;
  /** Cardinality indicator (1:1, 1:N, N:1, N:M) */
  cardinality?: "1:1" | "1:N" | "N:1" | "N:M";
}

/**
 * @param JSDoc tag for operation parameters
 */
export interface ParamTag {
  /** Tag identifier */
  tag: "@param";
  /** Parameter type (string, number, boolean, array, object, etc.) */
  type: string;
  /** Parameter name */
  name: string;
  /** Description of the parameter */
  description: string;
  /** Whether parameter is optional */
  optional: boolean;
}

/**
 * @returns JSDoc tag for operation return values
 */
export interface ReturnsTag {
  /** Tag identifier */
  tag: "@returns";
  /** Return type (usually Promise<DTOName>) */
  type: string;
  /** Description of what is returned */
  description: string;
}

/**
 * @throws JSDoc tag for error conditions
 */
export interface ThrowsTag {
  /** Tag identifier */
  tag: "@throws";
  /** Exception type (NotFoundError, ForbiddenError, etc.) */
  exceptionType: string;
  /** Condition under which this exception is thrown */
  condition: string;
}

/**
 * Annotations at the class level (for controllers)
 * Documents the entity and its role in the system
 */
export interface ClassLevelAnnotations {
  /** Business logic context for the entity/controller */
  aiContext: AiContextTag;
  /** All relationships where this entity is the source */
  aiRelations: AiRelationTag[];
  /** Standard JSDoc tags (since, deprecated, etc.) */
  standardTags: StandardJsDocTags;
  /** Reference to GRAPH.md file for visualization */
  graphReference: string;
}

/**
 * Annotations at the method level (for route handlers)
 * Documents the operation and its business implications
 */
export interface MethodLevelAnnotations {
  /** Business logic context for this operation */
  aiContext: AiContextTag;
  /** Parameter documentation */
  params: ParamTag[];
  /** Return type documentation */
  returns?: ReturnsTag;
  /** Thrown exceptions documentation */
  throws: ThrowsTag[];
  /** Deprecation notice if applicable */
  deprecated?: string;
  /** API version when this endpoint was introduced */
  since?: string;
}

/**
 * Type guard for AiContextTag
 */
export function isAiContextTag(value: unknown): value is AiContextTag {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<string, unknown>).tag === "@ai_context" &&
    typeof (value as Record<string, unknown>).content === "string"
  );
}

/**
 * Type guard for AiRelationTag
 */
export function isAiRelationTag(value: unknown): value is AiRelationTag {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    obj.tag === "@ai_relation" &&
    typeof obj.targetEntity === "string" &&
    typeof obj.description === "string" &&
    ["hasMany", "hasOne", "belongsTo"].includes(obj.relationshipType as string)
  );
}

/**
 * Type guard for ParamTag
 */
export function isParamTag(value: unknown): value is ParamTag {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    obj.tag === "@param" &&
    typeof obj.type === "string" &&
    typeof obj.name === "string" &&
    typeof obj.description === "string" &&
    typeof obj.optional === "boolean"
  );
}

/**
 * Type guard for ReturnsTag
 */
export function isReturnsTag(value: unknown): value is ReturnsTag {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    obj.tag === "@returns" &&
    typeof obj.type === "string" &&
    typeof obj.description === "string"
  );
}

/**
 * Type guard for ThrowsTag
 */
export function isThrowsTag(value: unknown): value is ThrowsTag {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    obj.tag === "@throws" &&
    typeof obj.exceptionType === "string" &&
    typeof obj.condition === "string"
  );
}

/**
 * Type guard for ClassLevelAnnotations
 */
export function isClassLevelAnnotations(
  value: unknown
): value is ClassLevelAnnotations {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    isAiContextTag(obj.aiContext) &&
    Array.isArray(obj.aiRelations) &&
    obj.aiRelations.every((r) => isAiRelationTag(r)) &&
    typeof obj.standardTags === "object" &&
    typeof obj.graphReference === "string"
  );
}

/**
 * Type guard for MethodLevelAnnotations
 */
export function isMethodLevelAnnotations(
  value: unknown
): value is MethodLevelAnnotations {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    isAiContextTag(obj.aiContext) &&
    Array.isArray(obj.params) &&
    obj.params.every((p) => isParamTag(p)) &&
    Array.isArray(obj.throws) &&
    obj.throws.every((t) => isThrowsTag(t)) &&
    (obj.returns === undefined || isReturnsTag(obj.returns))
  );
}

/**
 * Build class-level annotations from entity and relationship graph
 *
 * @param entityName - Name of the entity (e.g., "User", "Order")
 * @param entity - EntityNode containing endpoints and relationships
 * @param graph - Complete relationship graph for context
 * @returns ClassLevelAnnotations with all fields populated
 */
export function buildClassAnnotations(
  entityName: string,
  entity: EntityNode,
  graph: RelationshipGraph
): ClassLevelAnnotations {
  // Build @ai_context content
  const contextLines: string[] = [];
  contextLines.push(`Manages ${entityName} resources.`);

  // Determine entity role based on relationships
  const hasMany = entity.relationships.filter(
    (r) => r.type === RelationshipType.HAS_MANY
  );
  const hasOne = entity.relationships.filter(
    (r) => r.type === RelationshipType.HAS_ONE
  );
  const belongsTo = entity.relationships.filter(
    (r) => r.type === RelationshipType.BELONGS_TO
  );

  if (entity.relationships.length > 0) {
    let roleDescription = `Central entity`;

    if (hasMany.length > 0) {
      const targets = hasMany.map((r) => r.targetEntity).join(", ");
      roleDescription += ` with hasMany relationships to ${targets}`;
    }

    if (hasOne.length > 0) {
      const targets = hasOne.map((r) => r.targetEntity).join(", ");
      roleDescription += hasMany.length > 0 ? ` and ${targets}` : ` with hasOne ${targets}`;
    }

    if (belongsTo.length > 0) {
      const targets = belongsTo.map((r) => r.targetEntity).join(", ");
      roleDescription += ` and belongs to ${targets}`;
    }

    contextLines.push(roleDescription + "."); // Add period if not present
  }

  // Add key relationships list
  if (entity.relationships.length > 0) {
    contextLines.push("");
    contextLines.push("Key relationships:");
    for (const rel of entity.relationships) {
      const cardinalityStr =
        rel.type === RelationshipType.HAS_MANY ? "1:N" :
        rel.type === RelationshipType.HAS_ONE ? "1:1" : "N:1";
      contextLines.push(
        `• ${rel.sourceEntity} ${rel.type} ${rel.targetEntity} (${cardinalityStr})`
      );
    }
  }

  const aiContext: AiContextTag = {
    tag: "@ai_context",
    content: contextLines.join("\n"),
  };

  // Build @ai_relation tags
  const aiRelations: AiRelationTag[] = [];
  for (const rel of entity.relationships) {
    // Find related endpoint for access pattern
    let accessPattern: string | undefined;
    for (const endpoint of entity.endpoints) {
      const lowerPath = endpoint.path.toLowerCase();
      if (lowerPath.includes(rel.targetEntity.toLowerCase())) {
        accessPattern = `${endpoint.method} ${endpoint.path}`;
        break;
      }
    }

    // Determine cardinality
    const cardinality =
      rel.type === RelationshipType.HAS_MANY
        ? "1:N"
        : rel.type === RelationshipType.HAS_ONE
          ? "1:1"
          : "N:1";

    const description = `${entityName} ${rel.type} ${rel.targetEntity}`;

    aiRelations.push({
      tag: "@ai_relation",
      relationshipType: rel.type as "hasMany" | "hasOne" | "belongsTo",
      targetEntity: rel.targetEntity,
      description,
      accessPattern,
      cardinality: cardinality as "1:1" | "1:N" | "N:1" | "N:M",
    });
  }

  // Build graph reference
  const relatedEntities = entity.relationships
    .map((r) => r.targetEntity)
    .join(", ");
  const graphReference =
    relatedEntities.length > 0
      ? `See GRAPH.md for full entity relationship diagram.\nRelevant subgraph: ${entityName} → [${relatedEntities}]`
      : `See GRAPH.md for full entity relationship diagram.`;

  // Build standard tags
  const standardTags: StandardJsDocTags = {
    since: graph.metadata.specVersion || "1.0.0",
  };

  return {
    aiContext,
    aiRelations,
    standardTags,
    graphReference,
  };
}

/**
 * Build method-level annotations from operation metadata
 *
 * @param methodName - Name of the method (route handler name)
 * @param endpoint - EndpointInfo describing the HTTP operation
 * @param entity - EntityNode for context
 * @param operation - OpenAPI OperationObject with parameters, responses, etc.
 * @returns MethodLevelAnnotations with all fields populated
 */
export function buildMethodAnnotations(
  methodName: string,
  endpoint: EndpointInfo,
  entity: EntityNode,
  operation: OpenAPIV3.OperationObject
): MethodLevelAnnotations {
  // Infer action from HTTP method
  let action = "handles";
  switch (endpoint.method) {
    case "GET":
      action = "retrieves";
      break;
    case "POST":
      action = "creates";
      break;
    case "PUT":
    case "PATCH":
      action = "updates";
      break;
    case "DELETE":
      action = "removes";
      break;
  }

  // Build @ai_context
  const contextLines: string[] = [];
  contextLines.push(
    `${endpoint.method} operation that ${action} ${entity.name} resource`
  );

  if (operation.description) {
    contextLines.push("");
    contextLines.push(`Description: ${operation.description}`);
  }

  if (operation.summary) {
    contextLines.push("");
    contextLines.push(`Summary: ${operation.summary}`);
  }

  const aiContext: AiContextTag = {
    tag: "@ai_context",
    content: contextLines.join("\n"),
  };

  // Build @param tags
  const params: ParamTag[] = [];
  const parameters = operation.parameters || [];

  for (const param of parameters) {
    if (!isParameterObject(param)) continue;

    const paramObj = param as OpenAPIV3.ParameterObject;
    const schema = paramObj.schema as Record<string, unknown> | undefined;
    let paramType = "unknown";

    if (schema && typeof schema.type === "string") {
      paramType = schema.type;
    } else if (schema && schema.$ref) {
      paramType = "object";
    }

    params.push({
      tag: "@param",
      type: paramType,
      name: paramObj.name,
      description: paramObj.description || `${paramObj.name} parameter`,
      optional: !paramObj.required,
    });
  }

  // Build @returns tag
  let returns: ReturnsTag | undefined;
  const successResponse = operation.responses?.["200"];

  if (successResponse && isResponseObject(successResponse)) {
    const responseObj = successResponse as OpenAPIV3.ResponseObject;
    const content = responseObj.content?.["application/json"];

    if (content && isSchemaObject(content.schema)) {
      const schema = content.schema as Record<string, unknown>;
      let returnType = "Promise<unknown>";

      if (typeof schema.$ref === "string") {
        const refName = schema.$ref.split("/").pop() || "unknown";
        returnType = `Promise<${refName}>`;
      } else if (typeof schema.type === "string") {
        returnType = `Promise<${schema.type}>`;
      }

      returns = {
        tag: "@returns",
        type: returnType,
        description: responseObj.description || "Successful response",
      };
    }
  }

  // Build @throws tags
  const throws: ThrowsTag[] = [];
  const responses = operation.responses || {};

  for (const [statusCode, response] of Object.entries(responses)) {
    if (!isResponseObject(response)) continue;
    if (statusCode === "200" || statusCode === "201") continue; // Skip success responses

    const responseObj = response as OpenAPIV3.ResponseObject;
    const status = parseInt(statusCode, 10);

    let exceptionType = "Error";
    if (status === 400) {
      exceptionType = "BadRequestError";
    } else if (status === 401) {
      exceptionType = "UnauthorizedError";
    } else if (status === 403) {
      exceptionType = "ForbiddenError";
    } else if (status === 404) {
      exceptionType = "NotFoundError";
    } else if (status === 409) {
      exceptionType = "ConflictError";
    } else if (status === 422) {
      exceptionType = "ValidationError";
    } else if (status >= 500) {
      exceptionType = "InternalServerError";
    }

    throws.push({
      tag: "@throws",
      exceptionType,
      condition:
        responseObj.description ||
        `When status code is ${statusCode}`,
    });
  }

  // Handle @deprecated
  const deprecated = operation.deprecated ? "This endpoint is deprecated" : undefined;

  return {
    aiContext,
    params,
    returns,
    throws,
    deprecated,
    since: "1.0.0",
  };
}

/**
 * Format class-level annotations into a JSDoc comment string
 *
 * @param annotations - ClassLevelAnnotations to format
 * @returns Formatted JSDoc comment block
 */
export function formatClassJsDoc(annotations: ClassLevelAnnotations): string {
  const lines: string[] = [];
  lines.push("/**");

  // Format @ai_context
  const contextLines = annotations.aiContext.content.split("\n");
  lines.push(` * @ai_context`);
  for (const line of contextLines) {
    lines.push(` * ${line}`);
  }

  // Blank line before other tags if there are relations
  if (annotations.aiRelations.length > 0) {
    lines.push(" *");
  }

  // Format @ai_relation tags
  for (const relation of annotations.aiRelations) {
    const cardinalityStr = relation.cardinality ? ` [${relation.cardinality}]` : "";
    const accessStr = relation.accessPattern
      ? ` — access via ${relation.accessPattern}`
      : "";
    lines.push(
      ` * @ai_relation ${relation.relationshipType} ${relation.targetEntity}${cardinalityStr}${accessStr}`
    );
    lines.push(` * ${relation.description}`);
  }

  // Add graph reference
  if (annotations.graphReference) {
    lines.push(" *");
    const refLines = annotations.graphReference.split("\n");
    lines.push(` * @see ${refLines[0]}`);
    for (let i = 1; i < refLines.length; i++) {
      lines.push(` * ${refLines[i]}`);
    }
  }

  // Add standard tags
  if (annotations.standardTags.since) {
    lines.push(` * @since ${annotations.standardTags.since}`);
  }

  lines.push(" */");

  return lines.join("\n");
}

/**
 * Format method-level annotations into a JSDoc comment string
 *
 * @param annotations - MethodLevelAnnotations to format
 * @returns Formatted JSDoc comment block
 */
export function formatMethodJsDoc(annotations: MethodLevelAnnotations): string {
  const lines: string[] = [];
  lines.push("/**");

  // Format @ai_context
  const contextLines = annotations.aiContext.content.split("\n");
  lines.push(` * @ai_context`);
  for (const line of contextLines) {
    lines.push(` * ${line}`);
  }

  // Blank line before parameters if there are any
  if (annotations.params.length > 0) {
    lines.push(" *");
  }

  // Format @param tags
  for (const param of annotations.params) {
    const optionalStr = param.optional ? "?" : "";
    lines.push(
      ` * @param {${param.type}${optionalStr}} ${param.name} ${param.description}`
    );
  }

  // Format @returns tag
  if (annotations.returns) {
    lines.push(" *");
    lines.push(
      ` * @returns {${annotations.returns.type}} ${annotations.returns.description}`
    );
  }

  // Format @throws tags
  if (annotations.throws.length > 0) {
    lines.push(" *");
    for (const throwTag of annotations.throws) {
      lines.push(
        ` * @throws {${throwTag.exceptionType}} ${throwTag.condition}`
      );
    }
  }

  // Add deprecation if present
  if (annotations.deprecated) {
    lines.push(" *");
    lines.push(` * @deprecated ${annotations.deprecated}`);
  }

  // Add since tag
  if (annotations.since) {
    lines.push(` * @since ${annotations.since}`);
  }

  lines.push(" */");

  return lines.join("\n");
}

/**
 * Type guard: check if value is an OpenAPI ParameterObject
 */
function isParameterObject(
  value: unknown
): value is OpenAPIV3.ParameterObject {
  return typeof value === "object" && value !== null;
}

/**
 * Type guard: check if value is an OpenAPI ResponseObject
 */
function isResponseObject(value: unknown): value is OpenAPIV3.ResponseObject {
  return typeof value === "object" && value !== null;
}

/**
 * Type guard: check if value is an OpenAPI SchemaObject
 */
function isSchemaObject(
  value: unknown
): value is OpenAPIV3.SchemaObject {
  return typeof value === "object" && value !== null;
}
