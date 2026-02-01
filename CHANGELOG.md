# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-01

### Milestone: Foundation Complete - Production Ready

OpenNest v1.0 is the foundation release delivering a fully-functional CLI tool for generating NestJS skeleton code from OpenAPI specifications.

#### Added

**CLI & Infrastructure**
- Full command-line interface with Commander.js
- Argument parsing for spec input, output directory, and generator selection
- Remote spec fetching from URLs with exponential backoff retry logic
- Local file loading and error handling
- File conflict detection with interactive resolution
- Color-coded error messages and progress reporting

**OpenAPI Processing**
- Robust OpenAPI spec loading and validation
- Support for OpenAPI 3.0.0, 3.0.1, 3.0.2, 3.0.3
- Schema validation with error aggregation
- Reference resolution ($ref validation)
- operationId parsing supporting multiple formats (Tag_method, camelCase, snake_case)
- Path-based fallback for missing operationIds

**Code Generation**
- DTO generation from OpenAPI schemas
  - Class property mapping from schema properties
  - Type mapping (string, number, boolean, array, object, enum)
  - Validation decorators from class-validator
  - Transformation decorators from class-transformer
  - Swagger decorators from @nestjs/swagger
- Controller generation from OpenAPI paths
  - Route handler methods for each operation
  - Parameter and body mapping
  - Service interface generation
  - Dependency injection setup
- Decorator generation
  - Endpoint decorators for route handlers
  - Guard and middleware decorators
- Shared artifact generation
  - Common error DTOs
  - Auth decorators

**Validation & Error Handling**
- Comprehensive spec validation before generation
- Schema structure validation
- Type consistency checking
- Reference resolution validation
- operationId format validation
- Identifier validation (TypeScript naming rules)
- NestJS decorator conflict detection
- Error aggregation (reports all issues at once)
- Multiple recovery strategies:
  - `--strict` mode: fail on any error (default)
  - `--lenient` mode: skip invalid schemas, continue
  - `--validate-only`: validate without generating

**Testing**
- 600+ unit and integration tests
- 85%+ code coverage
- Real-world spec testing (Petstore patterns)
- Edge case coverage (circular refs, nullable fields, empty operations)
- Compilation validation (tsc --noEmit --strict)
- AST validation for generated code structure
- Snapshot testing for regression detection

**Documentation**
- Comprehensive README with quick start
- Installation instructions
- Supported versions and known limitations
- Contributing guidelines
- This CHANGELOG

#### Key Features
- Generates compilable NestJS skeleton code from OpenAPI specs
- Automatic DTO generation with validation rules from schemas
- Controller scaffolding with route handlers
- Swagger decorator generation for API documentation
- Type-safe identifier handling and validation
- Graceful error handling (never crashes, always returns usable result)
- Built on hexagonal architecture with ports and adapters

#### Fixed
- Type safety improvements (replaced unsafe casts with type guards)
- Edge case handling in operationId parsing
- Null/undefined reference validation in generators
- Circular reference detection in schemas
- Duplicate identifier prevention
- Reserved word collision handling

#### Known Limitations
- Service layer generation not included (intentional design)
- No database/ORM integration
- Limited support for complex circular schema references
- OpenAPI 2.0 (Swagger) and 3.1.x not yet supported
- Single generator selection per CLI invocation
- operationId required for optimal controller naming

---

## Phases Completed

### Phase 1: CLI Interface & Spec Input
Foundation for all code generation. Delivered CLI entry point, argument parsing, spec loading from URLs and files, and file conflict detection.

### Phase 2: Operation Parsing & Service Validation
Robust operationId parsing supporting multiple naming conventions with graceful fallback to path-based generation. Handles all edge cases without crashes.

### Phase 3: Generator Refactoring & Shared Helpers
Extracted 8 helper utilities, removed code duplication, replaced unsafe type casts with proper type guards. Zero regression risk with comprehensive tests.

### Phase 4: Real-World & Edge Case Test Suite
Added 100+ tests covering real-world specs (Petstore) and synthetic edge cases. 95%+ coverage. Compilation validation ensures generated code always compiles.

### Phase 5: Validation & Error Handling
Comprehensive validation framework catching issues before generation. Error aggregation with helpful messages. Configurable recovery strategies for different use cases.

### Phase 6: Documentation & Release
Production-ready documentation and npm metadata. This release establishes OpenNest as v1.0 with full feature support for OpenAPI 3.0.x specifications.

---

## Future Roadmap

- **Phase 7:** Configurable Output Structures (type-based vs domain-based)
- **Phase 8:** Context Graph & Agent Metadata
- Portal UI for visual API definition
- Service layer generation with dependency injection
- Database schema generation (TypeORM, Prisma)
- OpenAPI 2.0 support
- Configuration file support (opennest.config.json)
- Plugin system for custom generators

---

[1.0.0]: https://github.com/anthropics/opennest/releases/tag/v1.0.0
