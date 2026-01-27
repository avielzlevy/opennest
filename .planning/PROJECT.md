# OpenNest

## What This Is

OpenNest is a CLI tool that generates NestJS skeleton code from OpenAPI specifications. It produces DTOs with validation decorators, controllers with route handlers, and Swagger decorators - allowing developers to focus solely on business logic in the service layer. Designed to become the foundation for a collaboration platform where product managers can define APIs and R&D teams receive ready-to-implement skeletons.

## Core Value

Generate compilable, well-structured NestJS skeletons from any valid OpenAPI spec without manual intervention.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet - ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] CLI accepts OpenAPI spec URL or file path as argument
- [ ] CLI allows configurable output directory
- [ ] CLI allows selecting which generators to run
- [ ] operationId parsing handles multiple formats (Tag_method, camelCase, snake_case)
- [ ] Graceful handling of malformed specs (no crashes on null/undefined)
- [ ] Shared helper utilities extracted from duplicate code
- [ ] Test suite with real-world OpenAPI specs (Petstore-like)
- [ ] Test suite with synthetic specs covering edge cases
- [ ] Generated TypeScript code compiles without errors
- [ ] Generator test coverage (controller, decorator, DTO)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Service layer generation - intentionally left for developers to implement business logic
- Portal UI - future milestone after foundation is stable
- Runtime API server - this is a code generator, not a framework
- Database/ORM integration - skeleton only, no persistence layer

## Context

OpenNest uses a hexagonal architecture with adapters (SwaggerParser, FileWriter) and ports (ISpecParser, IGenerator, IFileWriter). Code generation uses ts-morph for AST manipulation. Current implementation has hardcoded URL, fragile operationId parsing, and limited test coverage.

**Existing generators:**
- DtoGenerator: Schema → DTO classes with class-validator decorators
- ControllerGenerator: Paths → Controller classes with route handlers
- DecoratorGenerator: Operations → Swagger decorator functions
- CommonGenerator: Shared artifacts (error DTOs, auth decorators)

**Known tech debt:**
- Duplicated helpers across controller and decorator generators
- Non-null assertions without validation
- Unsafe `as any` type casts

## Constraints

- **Stack**: TypeScript, ts-morph, NestJS decorators - established patterns must be preserved
- **Architecture**: Hexagonal pattern with ports/adapters - new features must follow this pattern
- **Output**: Generated code must be valid TypeScript that compiles with strict mode

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| No service generation | Developers implement business logic; skeleton only | - Pending |
| operationId formats: Tag_method, camelCase, snake_case | Cover common conventions | - Pending |
| Mix real-world + synthetic test specs | Real-world = confidence, synthetic = edge case coverage | - Pending |

---
*Last updated: 2026-01-27 after milestone v1.0 initialization*
