# Technology Stack

**Analysis Date:** 2026-01-27

## Languages

**Primary:**
- TypeScript 5.0.0 - Core language for all application code

**Secondary:**
- JavaScript - Used in Jest config and ts-jest configuration

## Runtime

**Environment:**
- Node.js (version specified in `@types/node: ^20.0.0`)

**Package Manager:**
- npm (using package-lock.json v3)
- Lockfile: Present (`package-lock.json`)

## Frameworks

**Core:**
- NestJS 10.0.0 - Backend framework for API structure, dependency injection, and routing
- NestJS/Swagger 7.0.0 - OpenAPI/Swagger integration for API documentation

**Code Generation:**
- ts-morph 20.0.0 - AST manipulation for generating TypeScript code files
- @apidevtools/swagger-parser 10.0.0 - Parsing and validating OpenAPI specifications

**Validation & Transformation:**
- class-validator 0.14.0 - Decorators for runtime validation (IsString, IsNumber, IsOptional, etc.)
- class-transformer 0.5.0 - Decorators for object transformation and type conversion
- reflect-metadata 0.1.13 - Required for decorator metadata in NestJS and class-validator

**Testing:**
- Jest 30.2.0 - Test runner and assertion library
- ts-jest 29.4.6 - TypeScript support for Jest

**Build/Dev:**
- ts-node 10.9.0 - TypeScript execution engine for running `.ts` files directly

## Key Dependencies

**Critical:**
- @nestjs/common 10.0.0 - Core NestJS library with decorators (Controller, Get, Post, etc.)
- ts-morph 20.0.0 - Enables code generation pipeline; manipulates abstract syntax trees
- @apidevtools/swagger-parser 10.0.0 - Parses remote and local OpenAPI specs with dereferencing
- class-validator 0.14.0 - Applied to generated DTOs for request validation
- openapi-types 12.0.0 - TypeScript types for OpenAPI V3 schemas

**Infrastructure:**
- reflect-metadata 0.1.13 - Needed for NestJS and class-validator decorator system
- js-yaml (transitive via @apidevtools/json-schema-ref-parser) - YAML parsing for OpenAPI specs

## Configuration

**Environment:**
- OpenAPI spec source: `http://localhost:5300/docs-json` (hardcoded in `main.ts` line 60)
- No `.env` file detected; configuration is compile-time via TypeScript

**Build:**
- tsconfig.json - Strict TypeScript compilation with:
  - Target: ES2021
  - Module: CommonJS
  - Strict mode enabled
  - Decorator support enabled (`experimentalDecorators: true`, `emitDecoratorMetadata: true`)
  - Output: `./dist` directory
- jest.config.js - Node test environment with ts-jest transformation

## Platform Requirements

**Development:**
- Node.js 20.x or later (from `@types/node: ^20.0.0`)
- TypeScript 5.0.0 or compatible

**Production:**
- Node.js 20.x or later
- No detected production framework (NestJS used for code generation context, not runtime API server)
- Deployment target: CLI application that generates NestJS code

## Scripts

**Available Commands:**
- `npm start` - Runs `ts-node main.ts` to execute the code generation pipeline
- `npm test` - Runs Jest test suite on spec files

## Entry Point

**Application Bootstrap:**
- `main.ts` - Orchestrates the generation pipeline:
  1. Parses OpenAPI spec from remote URL
  2. Generates DTOs, Controllers, Decorators, and Common artifacts
  3. Saves generated files to `src/` directory with formatting

---

*Stack analysis: 2026-01-27*
