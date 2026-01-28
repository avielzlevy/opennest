/**
 * OpenAPI Type Definitions
 * Re-exports and extends openapi-types for use throughout the application
 */

import type { OpenAPI, OpenAPIV3, OpenAPIV3_1 } from "openapi-types";

/**
 * Re-export OpenAPI spec type from openapi-types
 */
export type OpenAPISpec = OpenAPI.Document;

/**
 * Type definitions for OpenAPI schema components
 */
export type OpenAPISchema = OpenAPIV3.SchemaObject;

/**
 * Type definition for OpenAPI path item (route)
 */
export type OpenAPIPath = OpenAPIV3.PathItemObject;

/**
 * Type definition for OpenAPI operation (HTTP method)
 */
export type OpenAPIOperation = OpenAPIV3.OperationObject;

/**
 * Type definition for OpenAPI parameter
 */
export type OpenAPIParameter = OpenAPIV3.ParameterObject;

/**
 * Type definition for OpenAPI response
 */
export type OpenAPIResponse = OpenAPIV3.ResponseObject;

/**
 * Represents a parsed API resource (endpoint)
 * Used by generators to transform endpoints into NestJS modules/controllers
 */
export interface ParsedApiResource {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";
  operationId?: string;
  summary?: string;
  description?: string;
  parameters: ParsedParameter[];
  requestBody?: ParsedRequestBody;
  responses: Record<string, ParsedResponse>;
  tags?: string[];
  deprecated?: boolean;
}

/**
 * Represents a parsed parameter
 */
export interface ParsedParameter {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required?: boolean;
  schema?: Record<string, unknown>;
  description?: string;
  deprecated?: boolean;
}

/**
 * Represents a parsed request body
 */
export interface ParsedRequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, ParsedMediaType>;
}

/**
 * Represents a parsed media type (e.g., application/json)
 */
export interface ParsedMediaType {
  schema?: Record<string, unknown>;
  example?: unknown;
}

/**
 * Represents a parsed response
 */
export interface ParsedResponse {
  status: string;
  description?: string;
  content?: Record<string, ParsedMediaType>;
  headers?: Record<string, unknown>;
}

/**
 * Represents a fully parsed operation ready for code generation
 * Contains all metadata needed to generate NestJS controllers, DTOs, and decorators
 */
export interface ParsedOperation {
  resource: ParsedApiResource;
  controllerName: string;
  methodName: string;
  dtoName?: string;
  responseDtoName?: string;
  decorators: ParsedDecorator[];
}

/**
 * Represents a decorator that should be applied to a controller method
 */
export interface ParsedDecorator {
  name: string;
  args?: string[];
}
