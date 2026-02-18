// interfaces/core.ts
import { OpenAPIV3 } from "openapi-types";
import { Project, SourceFile } from "ts-morph";

/**
 * Port: Responsible for ingesting the raw specification.
 */
export interface ISpecParser {
  parse(filePathOrUrl: string): Promise<OpenAPIV3.Document>;
}

/**
 * Port: Responsible for the logic of converting schemas to AST.
 */
export interface IGenerator {
  generate(document: OpenAPIV3.Document, project: Project, outputPath?: string): void;
}

/**
 * Port: Responsible for physical I/O.
 */
export interface IFileWriter {
  save(project: Project): Promise<void>;
}

/**
 * Metadata for generating the 'const' and 'type' for Enums
 */
export interface EnumDefinition {
  name: string; // The type name (e.g. ClientStatus)
  constName: string; // The const name (e.g. CLIENT_STATUS)
  values: string[]; // The enum values
}

/**
 * Shared configuration for Type Mapping results.
 */
export interface TypeMappingResult {
  tsType: string;
  imports: { named: string; moduleSpecifier: string }[];
  decorators: {
    name: string;
    arguments?: string[];
    moduleSpecifier: string;
  }[];
  isArray?: boolean;
  enumDefinition?: EnumDefinition; // NEW: Carries enum generation info
}
