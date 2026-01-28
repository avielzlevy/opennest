# OpenNest Roadmap

## Milestone v1.0 - Foundation

Generate compilable NestJS skeletons from OpenAPI specs without manual intervention.

**Vision:** Establish core generation pipeline with robust spec handling, clean code generation, and comprehensive test coverage. Foundation for future collaboration portal.

---

## Phase 1: CLI Interface & Spec Input

**Goal:** Users can invoke OpenNest via CLI with OpenAPI spec (URL or file) and configure output destination and generator selection.

**Scope:**
- CLI argument parsing (spec input, output directory, generator flags)
- Remote spec fetching (URLs) and local file handling
- Configurable generator selection (--dto, --controller, --decorator flags)
- Error messages for invalid inputs or unreachable specs

**Out of Scope:**
- Interactive prompts
- Configuration files
- Multiple input formats beyond OpenAPI 3.0

**Status:** Not started

---

## Phase 2: Robust operationId Parsing

**Goal:** Extract operation names from OpenAPI specs handling Tag_method, camelCase, and snake_case formats without crashes on malformed data.

**Scope:**
- Parse operationId field from OpenAPI operations
- Support three naming conventions: Tag_method, camelCase, snake_case
- Fallback to tag+method when operationId missing
- Graceful handling of null/undefined/invalid specs

**Out of Scope:**
- Custom naming strategies
- Regex pattern configuration

**Status:** Not started

---

## Phase 3: Generator Refactoring & Shared Helpers

**Goal:** Extract duplicated logic into shared helper utilities and reduce tech debt (non-null assertions, unsafe type casts).

**Scope:**
- Audit ControllerGenerator and DecoratorGenerator for duplicate helpers
- Extract to utils layer (case conversion, decorator formatting, route building)
- Add proper type guards replacing `as any` casts
- Maintain existing output quality

**Out of Scope:**
- Generator output changes
- New generator types

**Status:** Not started

---

## Phase 4: Real-World & Edge Case Test Suite

**Goal:** Ship with confidence using both real-world specs (Petstore-like) and synthetic specs covering edge cases.

**Scope:**
- Real-world OpenAPI spec test cases (e.g., Petstore, sample APIs)
- Synthetic edge case specs (circular refs, nullable fields, complex schemas, empty operations)
- Generator unit tests (controller, DTO, decorator generation)
- Compiled code validation (generated TypeScript compiles without errors)

**Out of Scope:**
- Integration tests with running servers
- Performance benchmarking

**Status:** Not started

---

## Phase 5: Validation & Error Handling

**Goal:** Graceful failure on malformed specs with helpful error messages.

**Scope:**
- Schema validation (required fields, type correctness)
- Null/undefined checks in generation pipeline
- User-friendly error messages for common issues
- Recovery strategies (skip invalid operations, warn, or fail fast)

**Out of Scope:**
- Automatic spec repair
- Spec transformation or normalization

**Status:** Not started

---

## Phase 6: Documentation & Release

**Goal:** v1.0 ready for initial users with clear usage guide and known limitations.

**Scope:**
- README with usage examples
- Supported OpenAPI spec versions and known limitations
- Installation instructions
- Contributing guidelines

**Status:** Not started

---

*Roadmap created: 2026-01-28*
*Milestone: v1.0 - Foundation*
