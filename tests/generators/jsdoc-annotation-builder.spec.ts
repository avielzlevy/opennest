/**
 * Tests for JSDoc Annotation Builder
 * Validates annotation type system, builder functions, and JSDoc formatting
 */

import { OpenAPIV3 } from "openapi-types";
import {
  buildClassAnnotations,
  buildMethodAnnotations,
  formatClassJsDoc,
  formatMethodJsDoc,
  isAiContextTag,
  isAiRelationTag,
  isParamTag,
  isReturnsTag,
  isThrowsTag,
  isClassLevelAnnotations,
  isMethodLevelAnnotations,
  type ClassLevelAnnotations,
  type MethodLevelAnnotations,
  type AiContextTag,
  type AiRelationTag,
} from "../../src/generators/jsdoc-annotation-builder";
import {
  RelationshipType,
  DetectionSource,
  ConfidenceLevel,
  type EntityNode,
  type RelationshipGraph,
  type DetectedRelationship,
} from "../../src/analyzers/relationship-types";

describe("JSDoc Annotation Builder", () => {
  // Test fixtures
  let mockGraph: RelationshipGraph;
  let userEntity: EntityNode;
  let orderEntity: EntityNode;

  beforeEach(() => {
    // Create mock graph with User and Order entities
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
          method: "GET",
          path: "/users/{id}/orders",
          operationId: "getUserOrders",
          description: "Get user's orders",
        },
        {
          method: "POST",
          path: "/users",
          operationId: "createUser",
          description: "Create new user",
        },
      ],
      relationships: [userToOrderRel],
    };

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
  });

  // ============================================================================
  // Type Guard Tests
  // ============================================================================

  describe("Type Guards", () => {
    describe("isAiContextTag", () => {
      it("should validate correct AiContextTag", () => {
        const tag: AiContextTag = {
          tag: "@ai_context",
          content: "This is a test context",
        };
        expect(isAiContextTag(tag)).toBe(true);
      });

      it("should reject invalid AiContextTag", () => {
        expect(isAiContextTag(null)).toBe(false);
        expect(isAiContextTag(undefined)).toBe(false);
        expect(isAiContextTag({ tag: "@ai_relation", content: "test" })).toBe(
          false
        );
        expect(isAiContextTag({ tag: "@ai_context", content: 123 })).toBe(false);
      });
    });

    describe("isAiRelationTag", () => {
      it("should validate correct AiRelationTag", () => {
        const tag: AiRelationTag = {
          tag: "@ai_relation",
          relationshipType: "hasMany",
          targetEntity: "Order",
          description: "User hasMany Orders",
        };
        expect(isAiRelationTag(tag)).toBe(true);
      });

      it("should reject invalid AiRelationTag", () => {
        expect(isAiRelationTag(null)).toBe(false);
        expect(
          isAiRelationTag({
            tag: "@ai_relation",
            relationshipType: "invalid",
            targetEntity: "Order",
            description: "test",
          })
        ).toBe(false);
      });
    });

    describe("isParamTag", () => {
      it("should validate correct ParamTag", () => {
        expect(
          isParamTag({
            tag: "@param",
            type: "string",
            name: "userId",
            description: "User ID",
            optional: false,
          })
        ).toBe(true);
      });

      it("should reject invalid ParamTag", () => {
        expect(isParamTag(null)).toBe(false);
        expect(
          isParamTag({
            tag: "@param",
            type: "string",
            name: "userId",
            description: "User ID",
            optional: "yes", // should be boolean
          })
        ).toBe(false);
      });
    });

    describe("isReturnsTag", () => {
      it("should validate correct ReturnsTag", () => {
        expect(
          isReturnsTag({
            tag: "@returns",
            type: "Promise<User>",
            description: "The created user",
          })
        ).toBe(true);
      });

      it("should reject invalid ReturnsTag", () => {
        expect(isReturnsTag(null)).toBe(false);
        expect(
          isReturnsTag({
            tag: "@returns",
            type: 123, // should be string
            description: "test",
          })
        ).toBe(false);
      });
    });

    describe("isThrowsTag", () => {
      it("should validate correct ThrowsTag", () => {
        expect(
          isThrowsTag({
            tag: "@throws",
            exceptionType: "NotFoundError",
            condition: "User not found",
          })
        ).toBe(true);
      });

      it("should reject invalid ThrowsTag", () => {
        expect(isThrowsTag(null)).toBe(false);
        expect(
          isThrowsTag({
            tag: "@throws",
            exceptionType: 123, // should be string
            condition: "test",
          })
        ).toBe(false);
      });
    });

    describe("isClassLevelAnnotations", () => {
      it("should validate correct ClassLevelAnnotations", () => {
        const annotations: ClassLevelAnnotations = {
          aiContext: {
            tag: "@ai_context",
            content: "Test context",
          },
          aiRelations: [
            {
              tag: "@ai_relation",
              relationshipType: "hasMany",
              targetEntity: "Order",
              description: "User hasMany Orders",
            },
          ],
          standardTags: { since: "1.0.0" },
          graphReference: "See GRAPH.md",
        };
        expect(isClassLevelAnnotations(annotations)).toBe(true);
      });

      it("should reject invalid ClassLevelAnnotations", () => {
        expect(isClassLevelAnnotations(null)).toBe(false);
        expect(
          isClassLevelAnnotations({
            aiContext: null, // should be AiContextTag
            aiRelations: [],
            standardTags: {},
            graphReference: "test",
          })
        ).toBe(false);
      });
    });

    describe("isMethodLevelAnnotations", () => {
      it("should validate correct MethodLevelAnnotations", () => {
        const annotations: MethodLevelAnnotations = {
          aiContext: {
            tag: "@ai_context",
            content: "Test context",
          },
          params: [
            {
              tag: "@param",
              type: "string",
              name: "userId",
              description: "User ID",
              optional: false,
            },
          ],
          throws: [],
        };
        expect(isMethodLevelAnnotations(annotations)).toBe(true);
      });

      it("should reject invalid MethodLevelAnnotations", () => {
        expect(isMethodLevelAnnotations(null)).toBe(false);
      });
    });
  });

  // ============================================================================
  // Class Annotation Builder Tests
  // ============================================================================

  describe("buildClassAnnotations", () => {
    it("should build annotations for entity with relationships", () => {
      const annotations = buildClassAnnotations(
        "User",
        userEntity,
        mockGraph
      );

      expect(annotations).toBeDefined();
      expect(isClassLevelAnnotations(annotations)).toBe(true);
    });

    it("should generate @ai_context with entity description", () => {
      const annotations = buildClassAnnotations(
        "User",
        userEntity,
        mockGraph
      );

      expect(annotations.aiContext.tag).toBe("@ai_context");
      expect(annotations.aiContext.content).toContain("Manages User resources");
      expect(annotations.aiContext.content).toContain("hasMany");
    });

    it("should include key relationships in context", () => {
      const annotations = buildClassAnnotations(
        "User",
        userEntity,
        mockGraph
      );

      expect(annotations.aiContext.content).toContain("Key relationships:");
      expect(annotations.aiContext.content).toContain("hasMany");
      expect(annotations.aiContext.content).toContain("Order");
    });

    it("should generate @ai_relation tags for each relationship", () => {
      const annotations = buildClassAnnotations(
        "User",
        userEntity,
        mockGraph
      );

      expect(annotations.aiRelations.length).toBeGreaterThan(0);
      expect(annotations.aiRelations[0].tag).toBe("@ai_relation");
      expect(annotations.aiRelations[0].relationshipType).toBe("hasMany");
      expect(annotations.aiRelations[0].targetEntity).toBe("Order");
    });

    it("should include access pattern in relation tags", () => {
      const annotations = buildClassAnnotations(
        "User",
        userEntity,
        mockGraph
      );

      const orderRelation = annotations.aiRelations.find(
        (r) => r.targetEntity === "Order"
      );
      expect(orderRelation).toBeDefined();
      expect(orderRelation?.accessPattern).toMatch(/\/users\/\{id\}\/orders/);
    });

    it("should set cardinality for relationships", () => {
      const annotations = buildClassAnnotations(
        "User",
        userEntity,
        mockGraph
      );

      const orderRelation = annotations.aiRelations.find(
        (r) => r.targetEntity === "Order"
      );
      expect(orderRelation?.cardinality).toBe("1:N");
    });

    it("should generate graph reference", () => {
      const annotations = buildClassAnnotations(
        "User",
        userEntity,
        mockGraph
      );

      expect(annotations.graphReference).toContain("GRAPH.md");
      expect(annotations.graphReference).toContain("Order");
    });

    it("should set since tag from graph metadata", () => {
      const annotations = buildClassAnnotations(
        "User",
        userEntity,
        mockGraph
      );

      expect(annotations.standardTags.since).toBe("1.0.0");
    });

    it("should handle entities with no relationships", () => {
      const annotations = buildClassAnnotations(
        "Order",
        orderEntity,
        mockGraph
      );

      expect(annotations).toBeDefined();
      expect(annotations.aiRelations.length).toBe(0);
      expect(annotations.aiContext.content).not.toContain("Key relationships:");
    });

    it("should handle missing spec version gracefully", () => {
      const graphNoVersion = { ...mockGraph };
      graphNoVersion.metadata.specVersion = undefined;

      const annotations = buildClassAnnotations(
        "User",
        userEntity,
        graphNoVersion
      );

      expect(annotations.standardTags.since).toBe("1.0.0");
    });
  });

  // ============================================================================
  // Method Annotation Builder Tests
  // ============================================================================

  describe("buildMethodAnnotations", () => {
    let mockOperation: OpenAPIV3.OperationObject;

    beforeEach(() => {
      mockOperation = {
        operationId: "listUsers",
        summary: "List all users",
        description: "Retrieve a list of all users in the system",
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Maximum number of results",
            required: false,
            schema: { type: "integer" },
          } as OpenAPIV3.ParameterObject,
        ],
        responses: {
          "200": {
            description: "List of users",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/User" },
                },
              },
            },
          },
          "400": {
            description: "Invalid parameters",
          },
          "500": {
            description: "Server error",
          },
        },
      };
    });

    it("should build annotations for GET operation", () => {
      const endpoint = userEntity.endpoints[0]; // GET /users
      const annotations = buildMethodAnnotations(
        "listUsers",
        endpoint,
        userEntity,
        mockOperation
      );

      expect(annotations).toBeDefined();
      expect(isMethodLevelAnnotations(annotations)).toBe(true);
    });

    it("should generate @ai_context describing the operation", () => {
      const endpoint = userEntity.endpoints[0];
      const annotations = buildMethodAnnotations(
        "listUsers",
        endpoint,
        userEntity,
        mockOperation
      );

      expect(annotations.aiContext.tag).toBe("@ai_context");
      expect(annotations.aiContext.content).toContain("GET");
      expect(annotations.aiContext.content).toContain("retrieves");
    });

    it("should include operation description in context", () => {
      const endpoint = userEntity.endpoints[0];
      const annotations = buildMethodAnnotations(
        "listUsers",
        endpoint,
        userEntity,
        mockOperation
      );

      expect(annotations.aiContext.content).toContain(
        "Retrieve a list of all users"
      );
    });

    it("should infer action from HTTP method", () => {
      const postOperation: OpenAPIV3.OperationObject = {
        operationId: "createUser",
        responses: { "201": { description: "Created" } },
      };

      const endpoint = userEntity.endpoints[3]; // POST /users
      const annotations = buildMethodAnnotations(
        "createUser",
        endpoint,
        userEntity,
        postOperation
      );

      expect(annotations.aiContext.content).toContain("creates");
    });

    it("should generate @param tags for operation parameters", () => {
      const endpoint = userEntity.endpoints[0];
      const annotations = buildMethodAnnotations(
        "listUsers",
        endpoint,
        userEntity,
        mockOperation
      );

      expect(annotations.params.length).toBeGreaterThan(0);
      expect(annotations.params[0].tag).toBe("@param");
      expect(annotations.params[0].name).toBe("limit");
      expect(annotations.params[0].type).toBe("integer");
    });

    it("should mark optional parameters correctly", () => {
      const endpoint = userEntity.endpoints[0];
      const annotations = buildMethodAnnotations(
        "listUsers",
        endpoint,
        userEntity,
        mockOperation
      );

      const limitParam = annotations.params.find((p) => p.name === "limit");
      expect(limitParam?.optional).toBe(true);
    });

    it("should generate @returns tag from success response", () => {
      const endpoint = userEntity.endpoints[0];
      const annotations = buildMethodAnnotations(
        "listUsers",
        endpoint,
        userEntity,
        mockOperation
      );

      expect(annotations.returns).toBeDefined();
      expect(annotations.returns?.tag).toBe("@returns");
      expect(annotations.returns?.type).toMatch(/Promise/);
    });

    it("should generate @throws tags for error responses", () => {
      const endpoint = userEntity.endpoints[0];
      const annotations = buildMethodAnnotations(
        "listUsers",
        endpoint,
        userEntity,
        mockOperation
      );

      expect(annotations.throws.length).toBeGreaterThan(0);
      expect(annotations.throws.some((t) => t.exceptionType === "BadRequestError")).toBe(true);
      expect(annotations.throws.some((t) => t.exceptionType === "InternalServerError")).toBe(true);
    });

    it("should handle deprecated operations", () => {
      const deprecatedOp: OpenAPIV3.OperationObject = {
        ...mockOperation,
        deprecated: true,
      };

      const endpoint = userEntity.endpoints[0];
      const annotations = buildMethodAnnotations(
        "listUsers",
        endpoint,
        userEntity,
        deprecatedOp
      );

      expect(annotations.deprecated).toBeDefined();
      expect(annotations.deprecated).toContain("deprecated");
    });

    it("should handle methods with no parameters", () => {
      const simpleOp: OpenAPIV3.OperationObject = {
        operationId: "getUsers",
        responses: { "200": { description: "Users" } },
        parameters: [],
      };

      const endpoint = userEntity.endpoints[0];
      const annotations = buildMethodAnnotations(
        "getUsers",
        endpoint,
        userEntity,
        simpleOp
      );

      expect(annotations.params.length).toBe(0);
    });

    it("should handle methods with no error responses", () => {
      const successOnlyOp: OpenAPIV3.OperationObject = {
        operationId: "getUser",
        responses: {
          "200": { description: "User found" },
        },
      };

      const endpoint = userEntity.endpoints[1];
      const annotations = buildMethodAnnotations(
        "getUser",
        endpoint,
        userEntity,
        successOnlyOp
      );

      expect(annotations.throws.length).toBe(0);
    });

    it("should handle operations with 201 (created) responses", () => {
      const createOp: OpenAPIV3.OperationObject = {
        operationId: "createUser",
        responses: {
          "201": {
            description: "User created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
        },
      };

      const endpoint = userEntity.endpoints[3];
      const annotations = buildMethodAnnotations(
        "createUser",
        endpoint,
        userEntity,
        createOp
      );

      // 201 response should not be in throws
      expect(annotations.throws).not.toContainEqual(
        expect.objectContaining({ exceptionType: "201" })
      );
    });

    it("should map status codes to exception types", () => {
      const multiErrorOp: OpenAPIV3.OperationObject = {
        operationId: "updateUser",
        responses: {
          "200": { description: "OK" },
          "400": { description: "Bad request" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "404": { description: "Not found" },
          "409": { description: "Conflict" },
          "422": { description: "Validation error" },
        },
      };

      const endpoint = userEntity.endpoints[0];
      const annotations = buildMethodAnnotations(
        "updateUser",
        endpoint,
        userEntity,
        multiErrorOp
      );

      const exceptionTypes = annotations.throws.map((t) => t.exceptionType);
      expect(exceptionTypes).toContain("BadRequestError");
      expect(exceptionTypes).toContain("UnauthorizedError");
      expect(exceptionTypes).toContain("ForbiddenError");
      expect(exceptionTypes).toContain("NotFoundError");
      expect(exceptionTypes).toContain("ConflictError");
      expect(exceptionTypes).toContain("ValidationError");
    });
  });

  // ============================================================================
  // JSDoc String Formatter Tests
  // ============================================================================

  describe("formatClassJsDoc", () => {
    it("should produce valid JSDoc comment block", () => {
      const annotations = buildClassAnnotations(
        "User",
        userEntity,
        mockGraph
      );
      const jsdoc = formatClassJsDoc(annotations);

      expect(jsdoc).toMatch(/^\/\*\*/);
      expect(jsdoc).toMatch(/\*\/$/);
    });

    it("should include @ai_context tag", () => {
      const annotations = buildClassAnnotations(
        "User",
        userEntity,
        mockGraph
      );
      const jsdoc = formatClassJsDoc(annotations);

      expect(jsdoc).toContain("@ai_context");
    });

    it("should include @ai_relation tags", () => {
      const annotations = buildClassAnnotations(
        "User",
        userEntity,
        mockGraph
      );
      const jsdoc = formatClassJsDoc(annotations);

      expect(jsdoc).toContain("@ai_relation");
      expect(jsdoc).toContain("Order");
    });

    it("should include graph reference with @see tag", () => {
      const annotations = buildClassAnnotations(
        "User",
        userEntity,
        mockGraph
      );
      const jsdoc = formatClassJsDoc(annotations);

      expect(jsdoc).toContain("@see");
      expect(jsdoc).toContain("GRAPH.md");
    });

    it("should include @since tag", () => {
      const annotations = buildClassAnnotations(
        "User",
        userEntity,
        mockGraph
      );
      const jsdoc = formatClassJsDoc(annotations);

      expect(jsdoc).toContain("@since");
      expect(jsdoc).toContain("1.0.0");
    });

    it("should format multi-line content properly", () => {
      const annotations = buildClassAnnotations(
        "User",
        userEntity,
        mockGraph
      );
      const jsdoc = formatClassJsDoc(annotations);

      // Check that lines are properly indented
      const lines = jsdoc.split("\n");
      expect(lines.some((line) => line.match(/^ \* [^/]/)));
    });

    it("should include cardinality information", () => {
      const annotations = buildClassAnnotations(
        "User",
        userEntity,
        mockGraph
      );
      const jsdoc = formatClassJsDoc(annotations);

      expect(jsdoc).toContain("[1:N]");
    });

    it("should include access pattern when available", () => {
      const annotations = buildClassAnnotations(
        "User",
        userEntity,
        mockGraph
      );
      const jsdoc = formatClassJsDoc(annotations);

      expect(jsdoc).toContain("access via");
    });
  });

  describe("formatMethodJsDoc", () => {
    let mockOperation: OpenAPIV3.OperationObject;

    beforeEach(() => {
      mockOperation = {
        operationId: "listUsers",
        summary: "List all users",
        description: "Retrieve a list of all users",
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer" },
          } as OpenAPIV3.ParameterObject,
        ],
        responses: {
          "200": {
            description: "Users",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
          "400": { description: "Bad request" },
        },
      };
    });

    it("should produce valid JSDoc comment block", () => {
      const endpoint = userEntity.endpoints[0];
      const annotations = buildMethodAnnotations(
        "listUsers",
        endpoint,
        userEntity,
        mockOperation
      );
      const jsdoc = formatMethodJsDoc(annotations);

      expect(jsdoc).toMatch(/^\/\*\*/);
      expect(jsdoc).toMatch(/\*\/$/);
    });

    it("should include @ai_context tag", () => {
      const endpoint = userEntity.endpoints[0];
      const annotations = buildMethodAnnotations(
        "listUsers",
        endpoint,
        userEntity,
        mockOperation
      );
      const jsdoc = formatMethodJsDoc(annotations);

      expect(jsdoc).toContain("@ai_context");
    });

    it("should include @param tags", () => {
      const endpoint = userEntity.endpoints[0];
      const annotations = buildMethodAnnotations(
        "listUsers",
        endpoint,
        userEntity,
        mockOperation
      );
      const jsdoc = formatMethodJsDoc(annotations);

      expect(jsdoc).toContain("@param");
      expect(jsdoc).toContain("limit");
    });

    it("should mark optional parameters with ?", () => {
      const endpoint = userEntity.endpoints[0];
      const annotations = buildMethodAnnotations(
        "listUsers",
        endpoint,
        userEntity,
        mockOperation
      );
      const jsdoc = formatMethodJsDoc(annotations);

      // Optional parameters should be marked with ?
      expect(jsdoc).toMatch(/@param\s+{[^}]*\?}/);
    });

    it("should include @returns tag", () => {
      const endpoint = userEntity.endpoints[0];
      const annotations = buildMethodAnnotations(
        "listUsers",
        endpoint,
        userEntity,
        mockOperation
      );
      const jsdoc = formatMethodJsDoc(annotations);

      expect(jsdoc).toContain("@returns");
      expect(jsdoc).toContain("Promise");
    });

    it("should include @throws tags", () => {
      const endpoint = userEntity.endpoints[0];
      const annotations = buildMethodAnnotations(
        "listUsers",
        endpoint,
        userEntity,
        mockOperation
      );
      const jsdoc = formatMethodJsDoc(annotations);

      expect(jsdoc).toContain("@throws");
    });

    it("should handle @deprecated tag", () => {
      const deprecatedOp: OpenAPIV3.OperationObject = {
        ...mockOperation,
        deprecated: true,
      };

      const endpoint = userEntity.endpoints[0];
      const annotations = buildMethodAnnotations(
        "listUsers",
        endpoint,
        userEntity,
        deprecatedOp
      );
      const jsdoc = formatMethodJsDoc(annotations);

      expect(jsdoc).toContain("@deprecated");
    });

    it("should format multi-line content properly", () => {
      const endpoint = userEntity.endpoints[0];
      const annotations = buildMethodAnnotations(
        "listUsers",
        endpoint,
        userEntity,
        mockOperation
      );
      const jsdoc = formatMethodJsDoc(annotations);

      // Check that lines are properly indented
      const lines = jsdoc.split("\n");
      expect(lines.some((line) => line.match(/^ \* [^/]/)));
    });

    it("should include @since tag", () => {
      const endpoint = userEntity.endpoints[0];
      const annotations = buildMethodAnnotations(
        "listUsers",
        endpoint,
        userEntity,
        mockOperation
      );
      const jsdoc = formatMethodJsDoc(annotations);

      expect(jsdoc).toContain("@since");
    });
  });

  // ============================================================================
  // Edge Case Tests
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle entity with complex relationship types", () => {
      // Create entity with hasMany, hasOne, and belongsTo relationships
      const complexRel1: DetectedRelationship = {
        sourceEntity: "Order",
        targetEntity: "User",
        type: RelationshipType.BELONGS_TO,
        confidence: ConfidenceLevel.HIGH,
        detectedBy: [DetectionSource.NAMING_PATTERN],
        evidence: [],
      };

      const complexRel2: DetectedRelationship = {
        sourceEntity: "Order",
        targetEntity: "Address",
        type: RelationshipType.HAS_ONE,
        confidence: ConfidenceLevel.MEDIUM,
        detectedBy: [DetectionSource.SCHEMA_REF],
        evidence: [],
      };

      const complexEntity: EntityNode = {
        name: "Order",
        endpoints: [],
        relationships: [complexRel1, complexRel2],
      };

      const annotations = buildClassAnnotations(
        "Order",
        complexEntity,
        mockGraph
      );

      expect(annotations.aiRelations.length).toBe(2);
      expect(annotations.aiRelations.some((r) => r.relationshipType === "belongsTo")).toBe(true);
      expect(annotations.aiRelations.some((r) => r.relationshipType === "hasOne")).toBe(true);
    });

    it("should handle very long descriptions", () => {
      const longDescription =
        "This is a very long description that contains many words and should be handled properly without any issues. " +
        "It describes a complex operation with multiple parameters and side effects that need to be documented clearly. ".repeat(
          3
        );

      const longOperation: OpenAPIV3.OperationObject = {
        operationId: "complexOperation",
        description: longDescription,
        responses: { "200": { description: "OK" } },
      };

      const endpoint = userEntity.endpoints[0];
      const annotations = buildMethodAnnotations(
        "complexOperation",
        endpoint,
        userEntity,
        longOperation
      );

      expect(annotations.aiContext.content).toContain(longDescription);

      // Should still format properly
      const jsdoc = formatMethodJsDoc(annotations);
      expect(jsdoc).toContain("@ai_context");
    });

    it("should handle special characters in descriptions", () => {
      const specialCharsOp: OpenAPIV3.OperationObject = {
        operationId: "specialChars",
        description: "Creates a user with special chars: *, &, <, >, \", '",
        responses: { "200": { description: "OK" } },
      };

      const endpoint = userEntity.endpoints[0];
      const annotations = buildMethodAnnotations(
        "specialChars",
        endpoint,
        userEntity,
        specialCharsOp
      );

      expect(annotations.aiContext.content).toContain("special chars");
    });

    it("should handle operations with multiple parameters of different types", () => {
      const complexParams: OpenAPIV3.OperationObject = {
        operationId: "complexSearch",
        parameters: [
          {
            name: "userId",
            in: "query",
            required: true,
            schema: { type: "integer" },
          } as OpenAPIV3.ParameterObject,
          {
            name: "search",
            in: "query",
            required: false,
            schema: { type: "string" },
          } as OpenAPIV3.ParameterObject,
          {
            name: "sort",
            in: "query",
            required: false,
            schema: {
              type: "array",
              items: { type: "string" },
            },
          } as OpenAPIV3.ParameterObject,
        ],
        responses: { "200": { description: "Results" } },
      };

      const endpoint = userEntity.endpoints[0];
      const annotations = buildMethodAnnotations(
        "complexSearch",
        endpoint,
        userEntity,
        complexParams
      );

      expect(annotations.params.length).toBe(3);
      expect(annotations.params.some((p) => p.optional === true)).toBe(true);
      expect(annotations.params.some((p) => p.optional === false)).toBe(true);
    });

    it("should handle operations with no description or summary", () => {
      const bareOp: OpenAPIV3.OperationObject = {
        operationId: "bareOperation",
        responses: { "200": { description: "OK" } },
      };

      const endpoint = userEntity.endpoints[0];
      const annotations = buildMethodAnnotations(
        "bareOperation",
        endpoint,
        userEntity,
        bareOp
      );

      expect(annotations.aiContext.content).toBeTruthy();
      expect(isMethodLevelAnnotations(annotations)).toBe(true);
    });
  });
});
