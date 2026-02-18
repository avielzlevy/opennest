/**
 * Controller Annotation Integration
 * Injects JSDoc annotations into generated controller source files
 * Uses relationship graph and operation metadata to annotate classes and methods
 */

import type { OpenAPIV3 } from "openapi-types";
import type { SourceFile } from "ts-morph";
import type { RelationshipGraph } from "../analyzers/relationship-types";
import {
  buildClassAnnotations,
  buildMethodAnnotations,
  formatClassJsDoc,
  formatMethodJsDoc,
  isMethodLevelAnnotations,
} from "./jsdoc-annotation-builder";

/**
 * ControllerAnnotator injects JSDoc annotations into generated controller classes
 * Matches endpoints to methods and applies class-level and method-level annotations
 */
export class ControllerAnnotator {
  /**
   * Creates a new ControllerAnnotator instance
   *
   * @param graph - RelationshipGraph containing entity and relationship data
   * @param document - OpenAPI document for operation metadata
   */
  constructor(
    private readonly graph: RelationshipGraph,
    private readonly document: OpenAPIV3.Document
  ) {}

  /**
   * Annotates a controller source file with JSDoc comments
   *
   * Injects class-level annotations on the controller class and method-level
   * annotations on each route handler method that has a matching endpoint.
   *
   * @param sourceFile - ts-morph SourceFile to annotate (modified in place)
   * @param entityName - Name of the entity this controller manages (e.g., "User")
   */
  public annotate(sourceFile: SourceFile, entityName: string): void {
    // Get entity from graph
    const entity = this.graph.entities.get(entityName);
    if (!entity) {
      // Entity not in graph - skip annotation but don't error
      return;
    }

    // Find the controller class in the source file
    const classes = sourceFile.getClasses();
    if (classes.length === 0) {
      // No classes in file - nothing to annotate
      return;
    }

    const controllerClass = classes[0]; // First class is the controller

    // ============================================================================
    // Class-level Annotation
    // ============================================================================
    const classAnnotations = buildClassAnnotations(
      entityName,
      entity,
      this.graph
    );
    const classJsDoc = formatClassJsDoc(classAnnotations);

    // Add JSDoc to class declaration (ts-morph expects JSDoc object, not string)
    // Extract comment text by removing leading/trailing /** and */
    const cleanJsDoc = classJsDoc
      .replace(/^\/\*\*\n/, "")
      .replace(/\n\s*\*\/\s*$/, "")
      .split("\n")
      .map((line) => line.replace(/^\s*\*\s?/, ""));

    controllerClass.addJsDoc(cleanJsDoc.join("\n"));

    // ============================================================================
    // Method-level Annotation
    // ============================================================================
    const methods = controllerClass.getMethods();

    for (const method of methods) {
      const methodName = method.getName();

      // Find matching endpoint for this method
      const matchedEndpoint = this.findMatchingEndpoint(methodName, entity);
      if (!matchedEndpoint) {
        // No matching endpoint - skip method annotation
        continue;
      }

      // Find operation in OpenAPI document
      const operation = this.findOperationInDocument(matchedEndpoint);
      if (!operation) {
        // Operation not found - skip
        continue;
      }

      // Build method annotations
      const methodAnnotations = buildMethodAnnotations(
        methodName,
        matchedEndpoint,
        entity,
        operation
      );

      // Validate before applying
      if (!isMethodLevelAnnotations(methodAnnotations)) {
        // Invalid annotations - skip
        continue;
      }

      // Format and add JSDoc
      const methodJsDoc = formatMethodJsDoc(methodAnnotations);

      // Extract comment text by removing leading/trailing /** and */
      const cleanMethodJsDoc = methodJsDoc
        .replace(/^\/\*\*\n/, "")
        .replace(/\n\s*\*\/\s*$/, "")
        .split("\n")
        .map((line) => line.replace(/^\s*\*\s?/, ""));

      method.addJsDoc(cleanMethodJsDoc.join("\n"));
    }
  }

  /**
   * Find matching endpoint for a method by comparing method name to endpoint patterns
   *
   * Matching strategy:
   * 1. Try operationId match (exact)
   * 2. Try method name pattern (e.g., "createUser" → "POST /users")
   * 3. No match found
   *
   * @param methodName - Name of the method to match
   * @param entity - EntityNode containing endpoints
   * @returns Matching endpoint or undefined
   */
  private findMatchingEndpoint(methodName: string, entity: any): any {
    // Strategy 1: Match by operationId
    for (const endpoint of entity.endpoints) {
      if (endpoint.operationId === methodName) {
        return endpoint;
      }
    }

    // Strategy 2: Match by method name pattern
    // Parse method name: e.g., "createUser", "listUsers", "getUser", "deleteUser"
    const patterns = this.inferEndpointPatterns(methodName);

    for (const endpoint of entity.endpoints) {
      for (const pattern of patterns) {
        if (this.endpointMatchesPattern(endpoint, pattern)) {
          return endpoint;
        }
      }
    }

    return undefined;
  }

  /**
   * Infer possible endpoint patterns from method name
   *
   * Examples:
   * - "createUser" → [{method: "POST", pathPattern: "users"}]
   * - "listUsers" → [{method: "GET", pathPattern: "users"}]
   * - "getUser" → [{method: "GET", pathPattern: "user"}]
   * - "updateUser" → [{method: "PUT", pathPattern: "user"}, {method: "PATCH"}]
   * - "deleteUser" → [{method: "DELETE", pathPattern: "user"}]
   *
   * @param methodName - Name of the controller method
   * @returns Array of pattern objects with method and optional pathPattern
   */
  private inferEndpointPatterns(
    methodName: string
  ): Array<{ method: string; pathPattern?: string }> {
    const patterns: Array<{ method: string; pathPattern?: string }> = [];

    if (methodName.startsWith("create")) {
      patterns.push({ method: "POST", pathPattern: methodName.substring(6).toLowerCase() });
    } else if (
      methodName.startsWith("list") ||
      methodName.startsWith("get") ||
      methodName.startsWith("fetch")
    ) {
      patterns.push({ method: "GET" });
    } else if (methodName.startsWith("update")) {
      patterns.push({ method: "PUT", pathPattern: methodName.substring(6).toLowerCase() });
      patterns.push({ method: "PATCH" });
    } else if (methodName.startsWith("delete") || methodName.startsWith("remove")) {
      patterns.push({ method: "DELETE", pathPattern: methodName.substring(6).toLowerCase() });
    }

    // If no patterns inferred, don't match anything (return empty for strict matching)
    return patterns;
  }

  /**
   * Check if endpoint matches a pattern
   *
   * @param endpoint - EndpointInfo to check
   * @param pattern - Pattern object with method and optional pathPattern
   * @returns True if endpoint matches pattern
   */
  private endpointMatchesPattern(
    endpoint: any,
    pattern: { method: string; pathPattern?: string }
  ): boolean {
    // Check HTTP method
    if (endpoint.method !== pattern.method) {
      return false;
    }

    // If no pathPattern specified, method match is enough
    if (!pattern.pathPattern) {
      return true;
    }

    // Check if path contains pathPattern
    const pathLower = endpoint.path.toLowerCase();
    const patternLower = pattern.pathPattern.toLowerCase();

    return pathLower.includes(patternLower);
  }

  /**
   * Find operation object in OpenAPI document
   *
   * @param endpoint - EndpointInfo describing the endpoint
   * @returns OperationObject if found, undefined otherwise
   */
  private findOperationInDocument(endpoint: any): OpenAPIV3.OperationObject | undefined {
    if (!this.document.paths) {
      return undefined;
    }

    // Normalize method to lowercase for path lookup
    const methodLower = endpoint.method.toLowerCase();
    const pathItem = this.document.paths[endpoint.path];

    if (!pathItem) {
      return undefined;
    }

    // Get operation - cast to record to access dynamic keys
    const operation = (pathItem as Record<string, any>)[methodLower];

    if (!operation || typeof operation !== "object") {
      return undefined;
    }

    return operation as OpenAPIV3.OperationObject;
  }
}
