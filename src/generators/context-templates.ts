/**
 * Context Templates Foundation
 * Defines TypeScript interfaces and formatting rules for CONTEXT.md files
 * Provides structured information architecture for AI agent context generation
 */

import type {
  RelationshipType,
  EntityNode,
  RelationshipGraph,
  DetectedRelationship,
} from "../analyzers/relationship-types";

/**
 * Specification information section
 * Metadata about the OpenAPI specification
 */
export interface SpecInfoSection {
  /** Specification title (from info.title) */
  title: string;
  /** Specification version (from info.version) */
  version: string;
  /** Timestamp when context was generated */
  generatedAt: string;
  /** Total number of entities in the API */
  totalEntities: number;
  /** Total number of detected relationships */
  totalRelationships: number;
  /** Total number of endpoints */
  totalEndpoints: number;
}

/**
 * Mermaid graph visualization section
 * Contains entity relationship diagram
 */
export interface MermaidGraphSection {
  /** Title for this section */
  title: string;
  /** Mermaid diagram code (without markdown fence) */
  code: string;
  /** Description of what this graph shows */
  description: string;
}

/**
 * Entity summary table section
 * Quick overview of all entities and their properties
 */
export interface EntitySummarySection {
  /** Markdown table with: Entity Name | Endpoints | Relationships */
  table: string;
  /** Brief narrative introduction */
  description: string;
}

/**
 * Relationship summary section
 * Narrative overview of key relationships in the system
 */
export interface RelationshipSummarySection {
  /** List of relationship descriptions */
  relationships: string[];
  /** Overall narrative about data flow */
  narrative: string;
}

/**
 * Cross-entity patterns section
 * Common data flow and interaction patterns
 */
export interface CrossEntityPatternsSection {
  /** Array of pattern descriptions */
  patterns: Array<{
    title: string;
    description: string;
  }>;
  /** Overall analysis text */
  analysis: string;
}

/**
 * JSDoc snippets section
 * Example annotations from generated code
 */
export interface JsDocSnippetsSection {
  /** Array of JSDoc examples */
  examples: Array<{
    label: string;
    code: string;
  }>;
  /** Guidance on using annotations */
  guidance: string;
}

/**
 * Entity overview for detailed context
 * Comprehensive description of entity role and purpose
 */
export interface EntityOverviewSection {
  /** What this entity represents */
  description: string;
  /** Role in the system (primary, junction, lookup, etc.) */
  role: string;
  /** Business context and use case */
  businessContext: string;
}

/**
 * Detailed relationship information
 * Complete relationship metadata for one relationship
 */
export interface DetailedRelationshipSection {
  /** Relationship type: hasMany, hasOne, belongsTo */
  type: "hasMany" | "hasOne" | "belongsTo";
  /** Target entity name */
  targetEntity: string;
  /** Foreign key or reference field */
  foreignKey?: string;
  /** HTTP access path for this relationship */
  accessPath: string;
  /** Cardinality: 1:1, 1:N, N:1, N:M */
  cardinality: "1:1" | "1:N" | "N:1" | "N:M";
  /** Human-readable description */
  description: string;
  /** Whether relationship is bidirectional */
  bidirectional: boolean;
}

/**
 * Endpoint detail section
 * Complete information about one endpoint
 */
export interface EndpointDetailSection {
  /** HTTP method: GET, POST, PUT, PATCH, DELETE */
  method: string;
  /** URL path template */
  path: string;
  /** Operation ID */
  operationId: string;
  /** Operation description */
  description: string;
  /** Full JSDoc comment if available */
  jsDoc?: string;
}

/**
 * Usage example section
 * Code snippet showing how to work with entity
 */
export interface UsageExampleSection {
  /** Example title/scenario */
  title: string;
  /** Description of what this example shows */
  description: string;
  /** TypeScript code snippet */
  code: string;
}

/**
 * Related entity reference section
 * Link to connected entities
 */
export interface RelatedEntitySection {
  /** Name of related entity */
  entityName: string;
  /** Type of relationship */
  relationshipType: "hasMany" | "hasOne" | "belongsTo";
  /** Brief description of the connection */
  description: string;
}

/**
 * Summary-level context template
 * Provides full system overview for AI agents
 */
export interface SummaryContextTemplate {
  /** Document title */
  title: string;
  /** Specification metadata */
  specInfo: SpecInfoSection;
  /** Full entity relationship graph */
  graph: MermaidGraphSection;
  /** Overview of all entities */
  entitySummary: EntitySummarySection;
  /** Summary of all relationships */
  relationshipSummary: RelationshipSummarySection;
  /** Common patterns in entity interactions */
  crossEntityPatterns: CrossEntityPatternsSection;
  /** Example JSDoc annotations from generated controllers */
  jsDocSnippets: JsDocSnippetsSection;
}

/**
 * Per-controller context template
 * Focused view for a single entity
 */
export interface ControllerContextTemplate {
  /** Entity name */
  entityName: string;
  /** Entity description and role */
  entityOverview: EntityOverviewSection;
  /** Subgraph showing immediate relationships */
  subgraph: MermaidGraphSection;
  /** All relationships for this entity */
  relationships: DetailedRelationshipSection[];
  /** All endpoints for this entity */
  endpoints: EndpointDetailSection[];
  /** Full class-level JSDoc from generated controller */
  jsDocAnnotations: string;
  /** Code usage examples */
  usageExamples: UsageExampleSection[];
  /** Related entities this entity connects to */
  relatedEntities: RelatedEntitySection[];
}

/**
 * Formatting constants for markdown generation
 */
export const MARKDOWN_FORMAT = {
  /** H1 heading prefix */
  H1: "# ",
  /** H2 heading prefix */
  H2: "## ",
  /** H3 heading prefix */
  H3: "### ",
  /** Mermaid code fence */
  MERMAID_FENCE: "```mermaid",
  /** TypeScript code fence */
  TYPESCRIPT_FENCE: "```typescript",
  /** Generic code fence */
  CODE_FENCE: "```",
  /** Code fence close */
  FENCE_CLOSE: "```",
  /** Markdown table separator */
  TABLE_SEP: "|",
  /** Markdown table header separator line */
  TABLE_HEADER_SEP: "|-",
} as const;

/**
 * Format markdown heading
 * @param text - Heading text
 * @param level - Heading level (1-6)
 * @returns Formatted heading
 */
export function formatHeading(text: string, level: 1 | 2 | 3 = 2): string {
  const hashes = "#".repeat(level);
  return `${hashes} ${text}`;
}

/**
 * Format markdown code block
 * @param code - Code content
 * @param language - Language for syntax highlighting (mermaid, typescript, etc.)
 * @returns Formatted code block
 */
export function formatCodeBlock(code: string, language = ""): string {
  const fence = language ? "```" + language : "```";
  return `${fence}\n${code}\n\`\`\``;
}

/**
 * Format markdown table
 * @param headers - Column headers
 * @param rows - Array of row arrays
 * @returns Formatted markdown table
 */
export function formatTable(headers: string[], rows: string[][]): string {
  const lines: string[] = [];

  // Header row
  lines.push(`| ${headers.join(" | ")} |`);

  // Separator row
  const separators = headers.map(() => "---").join(" | ");
  lines.push(`| ${separators} |`);

  // Data rows
  for (const row of rows) {
    lines.push(`| ${row.join(" | ")} |`);
  }

  return lines.join("\n");
}

/**
 * Format markdown link
 * @param text - Link text
 * @param url - Link URL
 * @returns Formatted markdown link
 */
export function formatLink(text: string, url: string): string {
  return `[${text}](${url})`;
}

/**
 * Format entity reference with link
 * @param entityName - Entity name to reference
 * @returns Formatted reference (plain for now, will be enhanced in 09-03b)
 */
export function formatEntityReference(entityName: string): string {
  return `**${entityName}**`;
}

/**
 * Build markdown-formatted summary context template
 *
 * Creates a template string with placeholder markers for content generation.
 * The placeholders are replaced by Plan 09-03b during actual context generation.
 *
 * @param metadata - Specification metadata
 * @returns Markdown template string with placeholders
 */
export function formatSummaryContextTemplate(metadata: {
  specTitle?: string;
  specVersion?: string;
  totalEntities: number;
  totalRelationships: number;
  totalEndpoints: number;
}): string {
  const lines: string[] = [];

  lines.push(formatHeading("Context Guide: API System Overview", 1));
  lines.push("");
  lines.push(
    `Generated from: **${metadata.specTitle || "OpenAPI Specification"}** v${metadata.specVersion || "unknown"}`
  );
  lines.push("");
  lines.push(
    `**Coverage:** ${metadata.totalEntities} entities | ${metadata.totalEndpoints} endpoints | ${metadata.totalRelationships} relationships`
  );
  lines.push("");

  // Graph section
  lines.push(formatHeading("Entity Relationship Graph", 2));
  lines.push("");
  lines.push(
    "This Mermaid diagram shows how all entities relate to each other. Edges represent API-detected relationships."
  );
  lines.push("");
  lines.push(formatCodeBlock("{FULL_GRAPH}", "mermaid"));
  lines.push("");

  // Entity summary section
  lines.push(formatHeading("Entity Overview", 2));
  lines.push("");
  lines.push("Quick reference for all entities in the system:");
  lines.push("");
  lines.push("{ENTITY_SUMMARY_TABLE}");
  lines.push("");

  // Relationships section
  lines.push(formatHeading("Key Relationships", 2));
  lines.push("");
  lines.push(
    "Understanding how entities connect helps with API navigation:"
  );
  lines.push("");
  lines.push("{RELATIONSHIP_SUMMARY}");
  lines.push("");

  // Cross-entity patterns
  lines.push(formatHeading("Common Data Flow Patterns", 2));
  lines.push("");
  lines.push(
    "Recurring patterns across the API that indicate typical usage:"
  );
  lines.push("");
  lines.push("{CROSS_ENTITY_PATTERNS}");
  lines.push("");

  // JSDoc examples
  lines.push(formatHeading("Generated Code Annotations", 2));
  lines.push("");
  lines.push(
    "JSDoc annotations in generated controllers provide AI agent context:"
  );
  lines.push("");
  lines.push("{JSDOC_SNIPPETS}");
  lines.push("");

  // Navigation section
  lines.push(formatHeading("Per-Entity Context Files", 2));
  lines.push("");
  lines.push("For detailed information about specific entities, see:");
  lines.push("");
  lines.push("{ENTITY_CONTEXT_LINKS}");
  lines.push("");

  // Footer
  lines.push("---");
  lines.push("");
  lines.push("_Generated at: {GENERATED_AT}_");
  lines.push(
    `_For entity-specific details, see CONTEXT.md in each controller folder_`
  );

  return lines.join("\n");
}

/**
 * Build markdown-formatted controller context template
 *
 * Creates a template for per-entity context files.
 * Focuses on a single entity and its relationships.
 *
 * @param entityName - Entity name for the template
 * @returns Markdown template string with placeholders
 */
export function formatControllerContextTemplate(entityName: string): string {
  const lines: string[] = [];

  lines.push(
    formatHeading(`Context Guide: ${entityName} Entity`, 1)
  );
  lines.push("");
  lines.push(`**Entity:** ${formatEntityReference(entityName)}`);
  lines.push("");

  // Entity overview
  lines.push(formatHeading("Entity Overview", 2));
  lines.push("");
  lines.push("{ENTITY_DESCRIPTION}");
  lines.push("");
  lines.push(`**Role:** {ENTITY_ROLE}`);
  lines.push("");
  lines.push(`**Business Context:** {ENTITY_BUSINESS_CONTEXT}`);
  lines.push("");

  // Subgraph
  lines.push(formatHeading("Relationship Subgraph", 2));
  lines.push("");
  lines.push(
    `This diagram shows ${entityName} and its direct relationships:`
  );
  lines.push("");
  lines.push(formatCodeBlock("{SUBGRAPH}", "mermaid"));
  lines.push("");

  // Relationships
  lines.push(formatHeading("Relationships", 2));
  lines.push("");
  lines.push(`${formatEntityReference(entityName)} participates in these relationships:`);
  lines.push("");
  lines.push("{RELATIONSHIPS_TABLE}");
  lines.push("");

  // Endpoints
  lines.push(formatHeading("API Endpoints", 2));
  lines.push("");
  lines.push(`Available endpoints for managing ${entityName}:`);
  lines.push("");
  lines.push("{ENDPOINTS_TABLE}");
  lines.push("");

  // JSDoc class-level annotation
  lines.push(formatHeading("Generated Controller JSDoc", 2));
  lines.push("");
  lines.push(
    "Class-level annotations providing AI agent context:"
  );
  lines.push("");
  lines.push(formatCodeBlock("{CLASS_JSDOC}", "typescript"));
  lines.push("");

  // Related entities
  lines.push(formatHeading("Related Entities", 2));
  lines.push("");
  lines.push(`Entities that ${formatEntityReference(entityName)} connects to:`);
  lines.push("");
  lines.push("{RELATED_ENTITIES_LIST}");
  lines.push("");

  // Usage examples
  lines.push(formatHeading("Usage Examples", 2));
  lines.push("");
  lines.push(`Common patterns for working with ${formatEntityReference(entityName)}:`);
  lines.push("");
  lines.push("{USAGE_EXAMPLES}");
  lines.push("");

  // Footer
  lines.push("---");
  lines.push("");
  lines.push("_Generated at: {GENERATED_AT}_");
  lines.push("_See CONTEXT.md in the root for system-wide overview_");

  return lines.join("\n");
}

/**
 * Document content generation rules for context files
 *
 * These rules guide how section content should be generated from relationship data.
 * Used by Plan 09-03b during actual context file generation.
 */
export const CONTENT_GENERATION_RULES = {
  /**
   * Entity Overview generation rules
   */
  entityOverview: {
    description:
      "Extract from OpenAPI schema description or infer from endpoint patterns. Should answer: What does this entity represent?",
    role: "Infer from endpoint patterns: primary (CRUD endpoints for main resource), junction (connects two entities), lookup (reference data)",
    businessContext:
      "Synthesize from operation descriptions and common usage patterns. What is this entity used for in the business domain?",
  },

  /**
   * Relationship Summary generation rules
   */
  relationshipSummary: {
    format: "{SourceEntity} {relationshipType} {TargetEntity} — accessed via {HTTP_METHOD} {path}",
    includes: ["cardinality", "access patterns", "bidirectional flag"],
    narrative:
      "Provide overview of how entities connect and key data flow paths",
  },

  /**
   * Cross-Entity Patterns generation rules
   */
  crossEntityPatterns: {
    examples: [
      "Create Parent → Auto-create Children (POST /parent creates record, which automatically enables GET /parent/{id}/children)",
      "Cascading Updates (Update Parent field propagates to related Children records)",
      "Lookup Pattern (Entity exists mainly for foreign key relationships to other entities)",
    ],
    extraction:
      "From operation side effects, path patterns, and relationship types",
    grouping: "By pattern type: creation, update, lookup, filtering",
  },

  /**
   * Usage Example generation rules
   */
  usageExamples: {
    includeCreation: "How to create this entity",
    includeRetrieval: "How to fetch entity and its relationships",
    includeTraversal:
      "How to access related entities through this entity",
    includeUpdate: "How to update entity fields",
    codeLanguage: "TypeScript with async/await",
    context:
      "Should show realistic scenarios from the API specification",
  },

  /**
   * JSDoc Snippets selection rules
   */
  jsDocSnippets: {
    count: "3-5 key relationships/methods",
    includes: [
      "@ai_context tags showing business logic",
      "@ai_relation tags showing relationship patterns",
      "@param tags showing parameter usage",
      "@returns tags showing return types",
    ],
    purpose:
      "Demonstrate annotation format and what agents can expect from generated code",
  },
} as const;
