/**
 * Tests for ControllerAnnotator
 * Validates JSDoc annotation injection into generated controller source files
 */

import { Project } from "ts-morph";
import { ControllerAnnotator } from "../../src/generators/controller-annotator";
import { OpenAPIV3 } from "openapi-types";
import {
  RelationshipType,
  DetectionSource,
  ConfidenceLevel,
  type EntityNode,
  type RelationshipGraph,
  type DetectedRelationship,
} from "../../src/analyzers/relationship-types";

describe("ControllerAnnotator", () => {
  let project: Project;
  let mockGraph: RelationshipGraph;
  let userEntity: EntityNode;
  let orderEntity: EntityNode;
  let openApiDoc: OpenAPIV3.Document;

  beforeEach(() => {
    project = new Project({ useInMemoryFileSystem: true });

    // Create relationship from User to Order
    const userToOrderRel: DetectedRelationship = {
      sourceEntity: "User",
      targetEntity: "Order",
      type: RelationshipType.HAS_MANY,
      confidence: ConfidenceLevel.HIGH,
      detectedBy: [DetectionSource.PATH_PATTERN],
      evidence: [
        {
          source: DetectionSource.PATH_PATTERN,
          location: 'paths."/users/{id}/orders"',
          details: "User hasMany Order",
        },
      ],
    };

    // User entity with endpoints and relationships
    userEntity = {
      name: "User",
      endpoints: [
        {
          method: "GET",
          path: "/users",
          operationId: "listUsers",
          description: "List all users",
        },
        {
          method: "GET",
          path: "/users/{id}",
          operationId: "getUser",
          description: "Get user by ID",
        },
        {
          method: "POST",
          path: "/users",
          operationId: "createUser",
          description: "Create new user",
        },
        {
          method: "PUT",
          path: "/users/{id}",
          operationId: "updateUser",
          description: "Update user",
        },
        {
          method: "DELETE",
          path: "/users/{id}",
          operationId: "deleteUser",
          description: "Delete user",
        },
      ],
      relationships: [userToOrderRel],
    };

    // Order entity with no relationships
    orderEntity = {
      name: "Order",
      endpoints: [
        {
          method: "GET",
          path: "/orders",
          operationId: "listOrders",
          description: "List all orders",
        },
        {
          method: "POST",
          path: "/orders",
          operationId: "createOrder",
          description: "Create new order",
        },
      ],
      relationships: [],
    };

    mockGraph = {
      entities: new Map([
        ["User", userEntity],
        ["Order", orderEntity],
      ]),
      relationships: [userToOrderRel],
      metadata: {
        specTitle: "Pet Store API",
        specVersion: "1.0.0",
        generatedAt: new Date().toISOString(),
        totalEntities: 2,
        totalRelationships: 1,
      },
    };

    // Create minimal OpenAPI document with operations
    openApiDoc = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {
        "/users": {
          get: {
            operationId: "listUsers",
            tags: ["users"],
            description: "List all users",
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: { $ref: "#/components/schemas/User" },
                    },
                  },
                },
              },
            },
          },
          post: {
            operationId: "createUser",
            tags: ["users"],
            description: "Create new user",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CreateUserDto" },
                },
              },
            },
            responses: {
              "201": {
                description: "Created",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/User" },
                  },
                },
              },
              "400": {
                description: "Invalid input",
              },
            },
          },
        },
        "/users/{id}": {
          get: {
            operationId: "getUser",
            tags: ["users"],
            description: "Get user by ID",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
            ],
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/User" },
                  },
                },
              },
              "404": {
                description: "Not found",
              },
            },
          },
          put: {
            operationId: "updateUser",
            tags: ["users"],
            description: "Update user",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/UpdateUserDto" },
                },
              },
            },
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          delete: {
            operationId: "deleteUser",
            tags: ["users"],
            description: "Delete user",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
            ],
            responses: {
              "204": {
                description: "Deleted",
              },
              "404": {
                description: "Not found",
              },
            },
          },
        },
      },
    };
  });

  // ============================================================================
  // Class-level Annotation Tests
  // ============================================================================

  describe("Class-level Annotation Injection", () => {
    it("should add JSDoc to controller class", () => {
      // Create controller source with class
      const sourceFile = project.createSourceFile("users.controller.ts", "");
      sourceFile.addClass({
        name: "UsersController",
        isExported: true,
      });

      const annotator = new ControllerAnnotator(mockGraph, openApiDoc);
      annotator.annotate(sourceFile, "User");

      // Check that class has JSDoc
      const controllerClass = sourceFile.getClass("UsersController");
      expect(controllerClass).toBeDefined();

      const jsDoc = controllerClass!.getJsDocs();
      expect(jsDoc.length).toBeGreaterThan(0);

      const jsDocText = jsDoc[0]!.getFullText();
      expect(jsDocText).toContain("@ai_context");
      expect(jsDocText).toContain("Manages User resources");
    });

    it("should include @ai_relation tags in class JSDoc", () => {
      const sourceFile = project.createSourceFile("users.controller.ts", "");
      sourceFile.addClass({
        name: "UsersController",
        isExported: true,
      });

      const annotator = new ControllerAnnotator(mockGraph, openApiDoc);
      annotator.annotate(sourceFile, "User");

      const controllerClass = sourceFile.getClass("UsersController");
      const jsDoc = controllerClass!.getJsDocs()[0]!.getFullText();

      expect(jsDoc).toContain("@ai_relation");
      expect(jsDoc).toContain("Order");
    });

    it("should include @see GRAPH.md reference in class JSDoc", () => {
      const sourceFile = project.createSourceFile("users.controller.ts", "");
      sourceFile.addClass({
        name: "UsersController",
        isExported: true,
      });

      const annotator = new ControllerAnnotator(mockGraph, openApiDoc);
      annotator.annotate(sourceFile, "User");

      const controllerClass = sourceFile.getClass("UsersController");
      const jsDoc = controllerClass!.getJsDocs()[0]!.getFullText();

      expect(jsDoc).toContain("@see");
      expect(jsDoc).toContain("GRAPH.md");
    });

    it("should skip annotation for entity not in graph", () => {
      const sourceFile = project.createSourceFile("unknown.controller.ts", "");
      sourceFile.addClass({
        name: "UnknownController",
        isExported: true,
      });

      const annotator = new ControllerAnnotator(mockGraph, openApiDoc);
      annotator.annotate(sourceFile, "Unknown");

      const controllerClass = sourceFile.getClass("UnknownController");
      const jsDoc = controllerClass!.getJsDocs();

      // Should not have JSDoc added
      expect(jsDoc.length).toBe(0);
    });

    it("should handle entity with no relationships", () => {
      const sourceFile = project.createSourceFile("orders.controller.ts", "");
      sourceFile.addClass({
        name: "OrdersController",
        isExported: true,
      });

      const annotator = new ControllerAnnotator(mockGraph, openApiDoc);
      annotator.annotate(sourceFile, "Order");

      const controllerClass = sourceFile.getClass("OrdersController");
      const jsDoc = controllerClass!.getJsDocs()[0]!.getFullText();

      expect(jsDoc).toContain("@ai_context");
      expect(jsDoc).toContain("Manages Order resources");
      // Should not have @ai_relation since Order has no relationships
      expect(jsDoc).not.toContain("@ai_relation");
    });
  });

  // ============================================================================
  // Method-level Annotation Tests
  // ============================================================================

  describe("Method-level Annotation Injection", () => {
    it("should add JSDoc to GET method with parameters", () => {
      const sourceFile = project.createSourceFile("users.controller.ts", "");
      const controllerClass = sourceFile.addClass({
        name: "UsersController",
        isExported: true,
      });

      // Add getUser method
      controllerClass.addMethod({
        name: "getUser",
        isAsync: true,
        returnType: "Promise<User>",
      });

      const annotator = new ControllerAnnotator(mockGraph, openApiDoc);
      annotator.annotate(sourceFile, "User");

      const method = controllerClass.getMethod("getUser");
      const jsDoc = method!.getJsDocs();

      expect(jsDoc.length).toBeGreaterThan(0);
      const jsDocText = jsDoc[0]!.getFullText();

      expect(jsDocText).toContain("@ai_context");
      expect(jsDocText).toContain("retrieves"); // GET action
      expect(jsDocText).toContain("@param");
      expect(jsDocText).toContain("id");
    });

    it("should add JSDoc to POST method", () => {
      const sourceFile = project.createSourceFile("users.controller.ts", "");
      const controllerClass = sourceFile.addClass({
        name: "UsersController",
        isExported: true,
      });

      // Add createUser method
      controllerClass.addMethod({
        name: "createUser",
        isAsync: true,
        returnType: "Promise<User>",
      });

      const annotator = new ControllerAnnotator(mockGraph, openApiDoc);
      annotator.annotate(sourceFile, "User");

      const method = controllerClass.getMethod("createUser");
      const jsDoc = method!.getJsDocs();

      expect(jsDoc.length).toBeGreaterThan(0);
      const jsDocText = jsDoc[0]!.getFullText();

      expect(jsDocText).toContain("@ai_context");
      expect(jsDocText).toContain("creates"); // POST action
    });

    it("should add @returns tag to method JSDoc", () => {
      const sourceFile = project.createSourceFile("users.controller.ts", "");
      const controllerClass = sourceFile.addClass({
        name: "UsersController",
        isExported: true,
      });

      controllerClass.addMethod({
        name: "getUser",
        isAsync: true,
        returnType: "Promise<User>",
      });

      const annotator = new ControllerAnnotator(mockGraph, openApiDoc);
      annotator.annotate(sourceFile, "User");

      const method = controllerClass.getMethod("getUser");
      const jsDoc = method!.getJsDocs()[0]!.getFullText();

      expect(jsDoc).toContain("@returns");
      expect(jsDoc).toContain("Promise");
    });

    it("should add @throws tags for error responses", () => {
      const sourceFile = project.createSourceFile("users.controller.ts", "");
      const controllerClass = sourceFile.addClass({
        name: "UsersController",
        isExported: true,
      });

      controllerClass.addMethod({
        name: "getUser",
        isAsync: true,
        returnType: "Promise<User>",
      });

      const annotator = new ControllerAnnotator(mockGraph, openApiDoc);
      annotator.annotate(sourceFile, "User");

      const method = controllerClass.getMethod("getUser");
      const jsDoc = method!.getJsDocs()[0]!.getFullText();

      expect(jsDoc).toContain("@throws");
      expect(jsDoc).toContain("NotFoundError");
    });

    it("should skip methods without matching endpoints", () => {
      const sourceFile = project.createSourceFile("users.controller.ts", "");
      const controllerClass = sourceFile.addClass({
        name: "UsersController",
        isExported: true,
      });

      // Add method with name that doesn't match any pattern
      const helperMethod = controllerClass.addMethod({
        name: "internalHelper",
        isAsync: true,
        returnType: "Promise<void>",
      });

      const annotator = new ControllerAnnotator(mockGraph, openApiDoc);
      annotator.annotate(sourceFile, "User");

      // Helper method should not have JSDoc (no matching endpoint pattern)
      const jsDoc = helperMethod.getJsDocs();
      expect(jsDoc.length).toBe(0);
    });
  });

  // ============================================================================
  // Endpoint Matching Tests
  // ============================================================================

  describe("Endpoint-to-Method Matching", () => {
    it("should match method by exact operationId", () => {
      const sourceFile = project.createSourceFile("users.controller.ts", "");
      const controllerClass = sourceFile.addClass({
        name: "UsersController",
        isExported: true,
      });

      // Add method with exact operationId match
      controllerClass.addMethod({
        name: "listUsers",
        isAsync: true,
        returnType: "Promise<User[]>",
      });

      const annotator = new ControllerAnnotator(mockGraph, openApiDoc);
      annotator.annotate(sourceFile, "User");

      const method = controllerClass.getMethod("listUsers");
      const jsDoc = method!.getJsDocs();

      expect(jsDoc.length).toBeGreaterThan(0);
    });

    it("should match method by naming pattern", () => {
      const sourceFile = project.createSourceFile("users.controller.ts", "");
      const controllerClass = sourceFile.addClass({
        name: "UsersController",
        isExported: true,
      });

      // Add method with pattern that matches
      controllerClass.addMethod({
        name: "deleteUser",
        isAsync: true,
        returnType: "Promise<void>",
      });

      const annotator = new ControllerAnnotator(mockGraph, openApiDoc);
      annotator.annotate(sourceFile, "User");

      const method = controllerClass.getMethod("deleteUser");
      const jsDoc = method!.getJsDocs();

      expect(jsDoc.length).toBeGreaterThan(0);
      const jsDocText = jsDoc[0]!.getFullText();
      expect(jsDocText).toContain("@ai_context");
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle source file with no classes", () => {
      const sourceFile = project.createSourceFile("empty.ts", "");
      sourceFile.addFunction({
        name: "someFunction",
        returnType: "void",
      });

      const annotator = new ControllerAnnotator(mockGraph, openApiDoc);

      // Should not throw
      expect(() => {
        annotator.annotate(sourceFile, "User");
      }).not.toThrow();
    });

    it("should handle class with no methods", () => {
      const sourceFile = project.createSourceFile("users.controller.ts", "");
      sourceFile.addClass({
        name: "UsersController",
        isExported: true,
      });

      const annotator = new ControllerAnnotator(mockGraph, openApiDoc);

      // Should not throw
      expect(() => {
        annotator.annotate(sourceFile, "User");
      }).not.toThrow();

      const controllerClass = sourceFile.getClass("UsersController");
      const jsDoc = controllerClass!.getJsDocs();

      expect(jsDoc.length).toBeGreaterThan(0);
    });

    it("should handle missing operation in OpenAPI document", () => {
      const sourceFile = project.createSourceFile("users.controller.ts", "");
      const controllerClass = sourceFile.addClass({
        name: "UsersController",
        isExported: true,
      });

      // Add method with no matching operation (no pattern match)
      const method = controllerClass.addMethod({
        name: "internalHelper",
        isAsync: true,
        returnType: "Promise<void>",
      });

      const annotator = new ControllerAnnotator(mockGraph, openApiDoc);
      annotator.annotate(sourceFile, "User");

      // Method should not be annotated (no matching endpoint)
      const jsDoc = method.getJsDocs();
      expect(jsDoc.length).toBe(0);
    });

    it("should handle controller with multiple methods", () => {
      const sourceFile = project.createSourceFile("users.controller.ts", "");
      const controllerClass = sourceFile.addClass({
        name: "UsersController",
        isExported: true,
      });

      // Add multiple methods
      controllerClass.addMethod({
        name: "listUsers",
        isAsync: true,
        returnType: "Promise<User[]>",
      });

      controllerClass.addMethod({
        name: "createUser",
        isAsync: true,
        returnType: "Promise<User>",
      });

      controllerClass.addMethod({
        name: "getUser",
        isAsync: true,
        returnType: "Promise<User>",
      });

      controllerClass.addMethod({
        name: "updateUser",
        isAsync: true,
        returnType: "Promise<User>",
      });

      controllerClass.addMethod({
        name: "deleteUser",
        isAsync: true,
        returnType: "Promise<void>",
      });

      const annotator = new ControllerAnnotator(mockGraph, openApiDoc);
      annotator.annotate(sourceFile, "User");

      // All should be annotated
      for (const methodName of [
        "listUsers",
        "createUser",
        "getUser",
        "updateUser",
        "deleteUser",
      ]) {
        const method = controllerClass.getMethod(methodName);
        const jsDoc = method!.getJsDocs();
        expect(jsDoc.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe("Integration", () => {
    it("should produce valid TypeScript after annotation", () => {
      const sourceFile = project.createSourceFile("users.controller.ts", "");

      // Add some imports and decorators like a real controller
      sourceFile.addImportDeclaration({
        namedImports: ["Controller", "Get", "Post"],
        moduleSpecifier: "@nestjs/common",
      });

      const controllerClass = sourceFile.addClass({
        name: "UsersController",
        isExported: true,
        decorators: [
          { name: "Controller", arguments: ["'users'"] },
        ],
      });

      controllerClass.addMethod({
        name: "listUsers",
        isAsync: true,
        returnType: "Promise<any>",
        decorators: [
          { name: "Get", arguments: ["''"] },
        ],
      });

      const annotator = new ControllerAnnotator(mockGraph, openApiDoc);

      // Annotation should not throw
      expect(() => {
        annotator.annotate(sourceFile, "User");
      }).not.toThrow();

      // Source file should have annotations
      const text = sourceFile.getFullText();
      expect(text).toContain("@ai_context");
      expect(text).toContain("@see");
    });
  });
});
