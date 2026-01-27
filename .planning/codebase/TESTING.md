# Testing Patterns

**Analysis Date:** 2026-01-27

## Test Framework

**Runner:**
- Jest 30.2.0
- Config: `jest.config.js`

**Assertion Library:**
- Jest built-in matchers (`.toBe()`, `.toEqual()`, `.toContainEqual()`, `.toHaveProperty()`)
- `.toBeDefined()` for existence checks

**Run Commands:**
```bash
npm test              # Run all tests via Jest
```

**Additional Tools:**
- `ts-jest` 29.4.6 for TypeScript transformation in Jest
- `@types/jest` 30.0.0 for type definitions

## Test File Organization

**Location:**
- Test files placed in `tests/` directory (separate from source)
- Files follow pattern: `[Name].spec.ts`
- Current tests: `tests/dto.generator.spec.ts`, `tests/type-mapper.spec.ts`

**Naming:**
- Pattern: `[UnitUnderTest].spec.ts`
- Example: `dto.generator.spec.ts` tests `DtoGenerator` class
- Example: `type-mapper.spec.ts` tests `TypeMapper` class

**Structure:**
```
tests/
├── dto.generator.spec.ts
└── type-mapper.spec.ts
```

## Test Structure

**Suite Organization:**

```typescript
describe('DtoGenerator Integration', () => {
  let project: Project;
  let generator: DtoGenerator;

  beforeEach(() => {
    // Initialize test fixtures
    project = new Project({ useInMemoryFileSystem: true });
    generator = new DtoGenerator(new TypeMapper());
  });

  it('should generate a valid DTO class with properties', () => {
    // 1. Mock Input
    const doc: Partial<OpenAPIV3.Document> = { /* ... */ };

    // 2. Execute
    generator.generate(doc as OpenAPIV3.Document, project);

    // 3. Inspect the Virtual File System
    const sourceFile = project.getSourceFileOrThrow('src/dtos/ProductDto.dto.ts');

    // Assertions
    expect(sourceFile).toBeDefined();
  });
});
```

**Patterns:**
- **Setup pattern:** `beforeEach()` initializes fresh instances before each test
- **Teardown pattern:** No explicit teardown; Jest handles cleanup automatically
- **Assertion pattern:** Three-phase structure (Setup/Execute/Assert) with comments marking each phase
- **Nested assertions:** Multiple expectations per test to verify related behavior

## Mocking

**Framework:** `ts-morph` in-memory file system for filesystem mocking

**Patterns:**

```typescript
// Use in-memory Project for testing without touching disk
const project = new Project({ useInMemoryFileSystem: true });
generator.generate(doc as OpenAPIV3.Document, project);

// Query AST to verify behavior
const sourceFile = project.getSourceFileOrThrow('src/dtos/ProductDto.dto.ts');
const classDecl = sourceFile.getClassOrThrow('ProductDto');
```

**What to Mock:**
- File system via `ts-morph` in-memory mode
- OpenAPI document structure with partial objects: `const doc: Partial<OpenAPIV3.Document>`
- Complex objects can be cast: `doc as OpenAPIV3.Document`

**What NOT to Mock:**
- Generator classes are instantiated directly
- TypeMapper is instantiated with real implementation (not mocked)
- Core business logic runs as-is; only I/O is isolated

## Fixtures and Factories

**Test Data:**

```typescript
// Example from dto.generator.spec.ts
const doc: Partial<OpenAPIV3.Document> = {
  components: {
    schemas: {
      ProductDto: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          price: { type: 'number' }
        }
      }
    }
  }
};
```

**Location:**
- Fixtures are inline within test files
- No separate fixtures directory or factory file yet
- Each test constructs its required data structure

## Coverage

**Requirements:** Not enforced; no coverage configuration in `jest.config.js`

**View Coverage:** Not currently configured (would use `jest --coverage`)

## Test Types

**Unit Tests:**
- **Scope:** Individual class methods and pure functions
- **Example:** `TypeMapper.mapSchemaToType()` tests in `type-mapper.spec.ts`
- **Approach:** Test mapper with various schema types (string, integer, reference, optional)
- **Verification:** Check return type, decorators, imports, validator application

**Integration Tests:**
- **Scope:** Full generation pipeline with AST manipulation
- **Example:** `DtoGenerator.generate()` with OpenAPI document in `dto.generator.spec.ts`
- **Approach:** Generate DTOs in memory, query AST to verify class/property structure
- **Verification:** Check class existence, property types, decorator application

**E2E Tests:**
- Framework: Not used
- Full pipeline (parsing OpenAPI → generating all artifacts) not tested end-to-end
- Bootstrap function in `main.ts` tested manually or in integration environment

## Common Patterns

**Async Testing:**

Not yet fully demonstrated in test suite, but pattern would be:
```typescript
it('should parse OpenAPI spec', async () => {
  const parser = new SwaggerParserAdapter();
  const doc = await parser.parse('http://localhost:5300/docs-json');
  expect(doc).toBeDefined();
});
```

Expected pattern: Use `async`/`await` directly in test callback

**Error Testing:**

Not yet demonstrated in test suite. Expected patterns would be:
```typescript
it('should handle invalid schema gracefully', () => {
  const schema = null; // Invalid
  expect(() => {
    mapper.mapSchemaToType(schema, true);
  }).toThrow();
});

// Or for async errors:
it('should reject invalid URL', async () => {
  await expect(parser.parse('invalid-url')).rejects.toThrow();
});
```

**Property Decorator Verification:**

```typescript
// From dto.generator.spec.ts line 47
const nameProp = classDecl.getPropertyOrThrow('name');
expect(nameProp.getDecorator('IsString')).toBeDefined();
expect(nameProp.getDecorator('IsNotEmpty')).toBeDefined();
```

**Type Verification:**

```typescript
// From dto.generator.spec.ts line 45
expect(nameProp.getType().getText()).toBe('string');

// From type-mapper.spec.ts line 19
expect(result.tsType).toBe('string');
```

**Array Matching for Decorators:**

```typescript
// From type-mapper.spec.ts line 20
expect(result.decorators).toEqual(expect.arrayContaining([
  expect.objectContaining({ name: 'IsString' }),
  expect.objectContaining({ name: 'IsNotEmpty' }),
  expect.objectContaining({ name: 'ApiProperty' }),
]));
```

Pattern: Use `arrayContaining` for order-agnostic matching and `objectContaining` for partial object matching

## Test Quality Observations

**Strengths:**
- Tests use the actual AST library behavior (`ts-morph`) for realistic verification
- Three-phase test structure is clear and maintainable
- Partial types allow flexible fixture construction
- Test names are descriptive: "should generate a valid DTO class with properties"

**Gaps:**
- No error path testing (invalid inputs, missing required fields)
- No edge cases tested (empty schemas, special characters in names)
- No async operations fully tested yet
- Limited coverage of all generator types (only DtoGenerator and TypeMapper tested)

## Test Execution & Environment

**Node Environment:**
- `testEnvironment: "node"` in `jest.config.js` line 7 (not jsdom)
- Suitable for backend/CLI tools that don't use browser APIs

**TypeScript Transform:**
- `ts-jest` handles `.ts` file transformation at runtime
- No pre-compilation step needed
- Source maps generated for debugging

---

*Testing analysis: 2026-01-27*
