# Test Fixtures

This directory contains OpenAPI specification fixtures for testing the OpenNest code generator.

## Directory Structure

```
fixtures/
├── real-world/       # Production-like specs with standard patterns
├── synthetic/        # Minimal specs testing specific edge cases
└── edge-cases/       # Alias for synthetic (for clarity)
```

## Real-World Fixtures

**Purpose:** Validate confidence against production patterns

Real-world fixtures are complete OpenAPI specifications that represent typical production APIs. They include:
- Standard CRUD operations
- Multiple HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Reference resolution ($ref)
- Diverse status codes
- Authentication patterns
- Multiple tags and resources

**Expected files:**
- `petstore.yaml` - Basic CRUD API with Pet resource (6+ operations, 1-2 tags)
- `petstore-expanded.yaml` - Complex API with Pet, Store, and User resources (12+ operations, 3+ tags)

## Synthetic Fixtures

**Purpose:** Test specific edge cases with minimal specs

Synthetic fixtures are minimal OpenAPI specifications (< 50 lines) that focus on one edge case pattern each. They include 1-3 operations maximum for fast test execution and clear failure diagnostics.

**Expected files:**
- `circular-refs.yaml` - Recursive schema references (Person with children array of Person)
- `nullable-composition.yaml` - Nullable with oneOf/anyOf/allOf compositions
- `discriminator-patterns.yaml` - Polymorphic types with discriminator field
- `complex-nested-schemas.yaml` - Deep nesting (3+ levels) with mixed arrays/objects
- `empty-operations.yaml` - Operations without parameters or request bodies
- `malformed-operationids.yaml` - Special characters, duplicates, missing operationIds
- `missing-types.yaml` - Schema properties with no type specified
- `array-without-items.yaml` - Array type without items definition

## Edge Cases Directory

The `edge-cases/` directory is an alias for `synthetic/` to improve test clarity. Both directories serve the same purpose: testing edge case handling.

## Usage in Tests

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

// Load real-world fixture
const petstore = readFileSync(join(__dirname, 'fixtures/real-world/petstore.yaml'), 'utf-8');

// Load synthetic fixture
const circularRefs = readFileSync(join(__dirname, 'fixtures/synthetic/circular-refs.yaml'), 'utf-8');
```

## Validation

All fixtures must:
- Be valid OpenAPI 3.0 YAML
- Parse successfully with `@apidevtools/swagger-parser`
- Have no unresolvable $ref references (for real-world specs)

Run validation:
```bash
npm test -- --testPathPattern=fixtures
```
