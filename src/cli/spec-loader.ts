/**
 * Spec Loader
 * Loads and parses OpenAPI specifications from URLs or local files
 */

import { promises as fs } from "fs";
import { resolve, isAbsolute } from "path";
import SwaggerParser from "@apidevtools/swagger-parser";
import YAML from "js-yaml";
import { fetchWithRetry, type FetchOptions } from "./retry-handler";

/**
 * Custom error types for better error handling
 */
export class SpecNotFoundError extends Error {
  constructor(filePath: string) {
    super(`Specification file not found: ${filePath}`);
    this.name = "SpecNotFoundError";
  }
}

export class NetworkError extends Error {
  constructor(url: string, originalError: Error) {
    super(
      `Failed to fetch specification from ${url}: ${originalError.message}`,
    );
    this.name = "NetworkError";
  }
}

export class MalformedSpecError extends Error {
  constructor(source: string, originalError: Error) {
    super(`Invalid specification format: ${originalError.message}`);
    this.name = "MalformedSpecError";
  }
}

/**
 * Detects if a value is a URL using Node's URL constructor
 * Returns false for relative paths and local file paths
 */
export function isUrl(value: string): boolean {
  try {
    // Try to construct a URL from the value
    // Valid URLs will succeed, file paths will throw
    new URL(value);
    return true;
  } catch {
    // Not a valid URL
    return false;
  }
}

/**
 * Fetches a specification from a URL with retry logic
 */
async function fetchSpec(url: string): Promise<string> {
  try {
    const response = await fetchWithRetry(url, { timeout: 30000 });

    if (!response.ok) {
      throw new NetworkError(
        url,
        new Error(`HTTP ${response.status}: ${response.statusText}`),
      );
    }

    return await response.text();
  } catch (error) {
    if (error instanceof NetworkError) {
      throw error;
    }

    throw new NetworkError(
      url,
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

/**
 * Reads a specification from a local file with proper path resolution
 * Supports both absolute and relative paths
 */
async function readLocalFile(filePath: string): Promise<string> {
  try {
    // Resolve relative paths from current working directory
    const resolvedPath = isAbsolute(filePath)
      ? filePath
      : resolve(process.cwd(), filePath);

    const content = await fs.readFile(resolvedPath, "utf-8");
    return content;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new SpecNotFoundError(filePath);
    }

    throw error;
  }
}

/**
 * Parses and validates a specification string using swagger-parser
 * Supports both JSON and YAML formats
 */
async function parseSpec(
  content: string,
  specSource: string,
): Promise<Record<string, unknown>> {
  try {
    // Attempt to parse the raw content into an object first.
    // Try JSON, then YAML. SwaggerParser.validate accepts an object.
    let parsed: unknown;

    // Try JSON
    try {
      parsed = JSON.parse(content);
    } catch {
      // If JSON parsing failed, try YAML
      try {
        // `YAML.load` will parse both JSON-like and YAML content
        parsed = YAML.load(content);
      } catch (err) {
        throw new MalformedSpecError(
          specSource,
          err instanceof Error ? err : new Error(String(err)),
        );
      }
    }

    // 1. validate() checks the spec is valid OpenAPI (throws on errors)
    //    but it dereferences all $refs, so we discard its return value.
    await SwaggerParser.validate(structuredClone(parsed) as any);

    // 2. bundle() keeps internal $refs intact (needed for DTO name extraction)
    const api = await SwaggerParser.bundle(parsed as any);
    return api as Record<string, unknown>;
  } catch (error) {
    throw new MalformedSpecError(
      specSource,
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

/**
 * Loads an OpenAPI specification from either a URL or local file
 * Automatically detects the source type and handles parsing
 *
 * @param specSource - URL or file path to the specification
 * @returns Parsed OpenAPI specification object
 * @throws SpecNotFoundError if local file doesn't exist
 * @throws NetworkError if URL fetch fails
 * @throws MalformedSpecError if specification is invalid
 */
export async function loadSpec(
  specSource: string,
): Promise<Record<string, unknown>> {
  try {
    let content: string;

    // Detect if the source is a URL or local file
    if (isUrl(specSource)) {
      // Fetch from URL with retry logic
      content = await fetchSpec(specSource);
    } else {
      // Read from local file
      content = await readLocalFile(specSource);
    }

    // Parse and validate the specification
    const spec = await parseSpec(content, specSource);
    return spec;
  } catch (error) {
    // Re-throw custom errors as-is
    if (
      error instanceof SpecNotFoundError ||
      error instanceof NetworkError ||
      error instanceof MalformedSpecError
    ) {
      throw error;
    }

    // Wrap unexpected errors
    throw new MalformedSpecError(
      specSource,
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}
