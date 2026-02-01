# OpenNest Test Suite Documentation

**Purpose:** This documentation describes the test architecture, how to run tests, fixture organization, snapshot testing practices, and edge case coverage. Use this guide to understand test organization, add new tests, and maintain test fixtures.

**Last Updated:** 2026-01-29

---

## Table of Contents

- [Test Architecture](#test-architecture)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Fixture Organization](#fixture-organization)
- [Snapshot Testing](#snapshot-testing)
- [Edge Case Coverage](#edge-case-coverage)
- [Adding New Tests](#adding-new-tests)
- [Troubleshooting](#troubleshooting)

---

## Test Architecture

OpenNest uses a **three-layer testing architecture** to ensure code quality and prevent regressions:

### 1. Unit Tests
**Location:** `tests/generators/`, `tests/utils/`

**Purpose:** Validate individual components in isolation (generators, helpers, type mappers)

**Characteristics:**
- Fast execution (< 1 second per test file)
- In-memory file system via ts-morph
- AST validation for generated code structure
- Snapshot testing for regression detection
- Target: 85%+ code coverage per component

**Example files:**
- `tests/generators/dto.generator.spec.ts` - DTO generation logic
- `tests/generators/controller.generator.spec.ts` - Controller generation logic
- `tests/generators/decorator.generator.spec.ts` - Decorator generation logic
- `tests/utils/type-guards.spec.ts` - Type guard utilities
- `tests/utils/formatting-helpers.spec.ts` - String formatting functions
- `tests/utils/route-helpers.spec.ts` - Route path manipulation
- `tests/utils/schema-helpers.spec.ts` - OpenAPI schema utilities
- `tests/utils/operation-helpers.spec.ts` - Operation ID normalization

### 2. Integration Tests
**Location:** `tests/integration/`

**Purpose:** Validate full pipeline with multiple generators working together

**Characteristics:**
- Uses real-world OpenAPI specs (Petstore, Petstore Expanded)
- Tests generator coordination and imports
- Validates file structure and naming conventions
- Execution time: < 5 seconds per spec
- Snapshot testing for regression detection

**Test files:**
- `tests/integration/real-world.integration.spec.ts` - Production-grade specs
- `tests/integration/synthetic.integration.spec.ts` - Edge case specs

### 3. Compilation Validation Tests
**Location:** `tests/integration/compilation-validation.spec.ts`

**Purpose:** Ensure generated TypeScript compiles without errors in strict mode

**Characteristics:**
- Writes generated code to temporary filesystem
- Runs `tsc --noEmit --strict` to validate type correctness
- Verifies no `any` types in generated code
- Execution time: ~30 seconds per spec (includes TypeScript compiler)

**Why this matters:**
- Ensures generated code is production-ready
- Catches type errors before runtime
- Validates strict TypeScript compliance

---

## Running Tests

### Run All Tests
```bash
npm test
```

**Output:** Runs all unit tests, integration tests, and compilation validation

**Duration:** ~1-2 minutes total

### Run Specific Test Files
```bash
# Run only DTO generator tests
npm test -- --testPathPattern=dto.generator

# Run only integration tests
npm test -- --testPathPattern=integration

# Run only compilation validation
npm test -- --testPathPattern=compilation-validation

# Run only helper tests
npm test -- --testPathPattern=helpers
```

### Run with Coverage
```bash
npm test -- --coverage
```

**Output:** Coverage report showing % of code tested

**Target:** 85%+ coverage for all components

### Update Snapshots
```bash
npm test -- -u
```

**When to use:**
- After intentionally changing generator output
- When adding new snapshot tests
- **IMPORTANT:** Always review snapshot diffs before committing

**Example:**
```bash
# Update snapshots for DTO generator only
npm test -- -u --testPathPattern=dto.generator
```

### Watch Mode (Development)
```bash
npm test -- --watch
```

**Use case:** Automatically re-run tests when files change during development

### Verbose Output
```bash
npm test -- --verbose
```

**Use case:** Debug failing tests with detailed output

---

## Test Structure

### Directory Layout

```
tests/
├── __snapshots__/              # Jest snapshot files (auto-generated)
│   └── .gitkeep
├── cli/                        # CLI-specific tests (future)
├── fixtures/                   # OpenAPI spec fixtures
│   ├── README.md              # Fixture documentation
│   ├── real-world/            # Production-grade specs
│   └── synthetic/             # Edge case specs
├── generators/                 # Generator unit tests
│   ├── dto.generator.spec.ts
│   ├── controller.generator.spec.ts
│   └── decorator.generator.spec.ts
├── integration/                # Integration tests
│   ├── real-world.integration.spec.ts
│   ├── synthetic.integration.spec.ts
│   └── compilation-validation.spec.ts
├── utils/                      # Helper utility tests
│   ├── type-guards.spec.ts
│   ├── formatting-helpers.spec.ts
│   ├── route-helpers.spec.ts
│   ├── schema-helpers.spec.ts
│   └── operation-helpers.spec.ts
└── jest-setup.ts              # Global test configuration
```

### Naming Conventions

**Test files:** `*.spec.ts` (must include `.spec` before `.ts`)

**Snapshot files:** Auto-generated in `__snapshots__/` directory with `.snap` extension

**Fixture files:** `*.yaml` in `fixtures/real-world/` or `fixtures/synthetic/`

### Test Organization Pattern

All test files follow this structure:

```typescript
describe("ComponentName Unit Tests", () => {
  let project: Project;
  let generator: GeneratorType;

  beforeEach(() => {
    // Initialize in-memory project for fast testing
    project = new Project({ useInMemoryFileSystem: true });
    generator = new GeneratorType();
  });

  describe("Feature Category", () => {
    it("should test specific behavior", () => {
      // Arrange: Create test data
      const spec = createTestSpec();

      // Act: Run generator
      generator.generate(spec, project, "./generated");

      // Assert: Validate output
      expect(result).toMatchExpectedBehavior();
    });
  });
});
```

---

## Fixture Organization

**Location:** `tests/fixtures/`

**Documentation:** See `tests/fixtures/README.md` for detailed fixture specifications

### Real-World Fixtures
**Path:** `tests/fixtures/real-world/`

**Purpose:** Validate confidence against production-grade API patterns

**Files:**
- `petstore.yaml` - Basic CRUD API (6+ operations, 1-2 tags)
  - Standard REST operations: GET, POST, PUT, DELETE, PATCH
  - Simple schemas: Pet, Category, Tag, Error
  - Reference resolution with `$ref`

- `petstore-expanded.yaml` - Complex API (12+ operations, 3+ tags)
  - Multiple resources: Pet, Store, User
  - Nested schemas: Order → OrderItem, Address → Coordinates
  - Complex relationships and array handling

**When to use:**
- Integration tests validating full generator pipeline
- Compilation validation tests
- Performance benchmarking (< 5 seconds per spec)

### Synthetic Fixtures (Edge Cases)
**Path:** `tests/fixtures/synthetic/`

**Purpose:** Test specific edge cases with minimal specs (< 50 lines each)

**Files:**
1. `circular-refs.yaml` - Recursive schema references (Person → children: Person[])
2. `nullable-composition.yaml` - Nullable with oneOf/anyOf/allOf
3. `discriminator-patterns.yaml` - Polymorphic types with discriminator
4. `complex-nested-schemas.yaml` - Deep nesting (3+ levels)
5. `empty-operations.yaml` - Operations without parameters/bodies
6. `malformed-operationids.yaml` - Special characters, duplicates, missing IDs
7. `missing-types.yaml` - Schema properties with no type specified
8. `array-without-items.yaml` - Array type without items definition

**When to use:**
- Unit tests for specific edge case handling
- Graceful failure validation
- Edge case integration tests

### Adding New Fixtures

**Steps:**
1. Determine fixture category (real-world or synthetic)
2. Create YAML file in appropriate directory
3. Follow naming convention: `kebab-case.yaml`
4. Validate fixture parses with `@apidevtools/swagger-parser`
5. Document purpose in `tests/fixtures/README.md`

**Example:**
```yaml
# tests/fixtures/synthetic/new-edge-case.yaml
openapi: 3.0.0
info:
  title: Edge Case Test
  version: 1.0.0
paths:
  /test:
    get:
      operationId: testOperation
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                # Your edge case schema here
                type: object
```

---

## Snapshot Testing

**Purpose:** Detect unintentional changes to generated code output

**How it works:**
1. First run: Jest captures output and saves to `__snapshots__/*.snap`
2. Subsequent runs: Jest compares current output to saved snapshot
3. Test fails if output differs from snapshot
4. Developer reviews diff and either fixes code or updates snapshot

### When Snapshots Are Used

**Generator Unit Tests:**
- Complete generated file content validation
- Regression detection for code structure changes
- Example: `dto.generator.spec.ts` snapshots DTO class generation

**Integration Tests:**
- File structure validation (paths, classes, import counts)
- Controller method lists
- Full generated codebase structure
- Example: `real-world.integration.spec.ts` snapshots file structure

### Snapshot Testing Best Practices

**1. Use String Format for Snapshots**

Snapshots use **string format** to avoid circular reference issues with ts-morph AST objects.

```typescript
// ✅ CORRECT: Snapshot string content
const sourceFile = project.getSourceFile("path/to/file.ts");
expect(sourceFile.getFullText()).toMatchSnapshot();

// ❌ WRONG: Snapshot AST object (causes circular ref errors)
const sourceFile = project.getSourceFile("path/to/file.ts");
expect(sourceFile).toMatchSnapshot(); // Don't do this!
```

**2. Use Named Snapshots for Clarity**

```typescript
// ✅ CORRECT: Named snapshot
expect(output).toMatchSnapshot("dto-with-enum");

// ⚠️ OK: Auto-numbered snapshot (harder to identify)
expect(output).toMatchSnapshot();
```

**3. Review Snapshots in PRs**

**ALWAYS** review snapshot changes in pull requests:
- Ensure changes are intentional
- Verify generated code quality
- Check for regressions (missing imports, incorrect types)

### Updating Snapshots

**Command:**
```bash
npm test -- -u
```

**When to update:**
- ✅ Intentional output format changes
- ✅ New features affecting generated code
- ✅ Bug fixes changing output
- ❌ Unexpected failures (investigate first!)

**Example workflow:**
```bash
# 1. Make code changes
# 2. Run tests (they fail with snapshot mismatch)
npm test

# 3. Review the diff output in terminal
# 4. If changes are intentional, update snapshots
npm test -- -u

# 5. Verify updated snapshots
git diff tests/__snapshots__/

# 6. Commit updated snapshots with code changes
git add tests/__snapshots__/
git commit -m "feat: update snapshots for new feature"
```

### Custom Snapshot Serializer

**Location:** `tests/jest-setup.ts`

**Purpose:** Sort object keys for deterministic snapshot output

**Behavior:**
- Automatically sorts plain object keys alphabetically
- Skips ts-morph AST objects (circular references)
- Ensures consistent snapshot ordering across test runs

**No action required** - serializer is configured globally in `jest-setup.ts`

---

## Edge Case Coverage

OpenNest's **graceful failure philosophy:** Never crash, always return usable result.

### 8 Edge Case Patterns

All edge cases are tested with synthetic fixtures in `tests/fixtures/synthetic/`:

#### 1. Circular References
**File:** `circular-refs.yaml`

**Pattern:** Recursive schema references (e.g., Person → children: Person[])

**Handling:**
- Generate valid TypeScript with forward references
- Use `ValidateNested` and `Type` decorators for validation
- Prevent infinite loops in type resolution

**Test coverage:**
- `dto.generator.spec.ts` - Self-referential DTOs
- `synthetic.integration.spec.ts` - Full generation pipeline

#### 2. Nullable Composition
**File:** `nullable-composition.yaml`

**Pattern:** Nullable combined with oneOf/anyOf/allOf

**Handling:**
- Generate union types: `PropertyType | null`
- Add `@IsOptional()` decorator
- Handle complex composition logic

**Test coverage:**
- `dto.generator.spec.ts` - Nullable union types
- `type-mapper.spec.ts` - Type resolution

#### 3. Discriminator Patterns
**File:** `discriminator-patterns.yaml`

**Pattern:** Polymorphic types with discriminator field

**Handling:**
- Generate base interface with discriminator
- Create subtype DTOs with `@IsIn([...])` validation
- Preserve discriminator field in all subtypes

**Test coverage:**
- `dto.generator.spec.ts` - Polymorphic type generation
- `schema-helpers.spec.ts` - Discriminator extraction

#### 4. Complex Nested Schemas
**File:** `complex-nested-schemas.yaml`

**Pattern:** Deep nesting (3+ levels) with mixed arrays/objects

**Handling:**
- Generate nested DTO classes
- Add proper imports for referenced types
- Use `@ValidateNested({ each: true })` for arrays

**Test coverage:**
- `dto.generator.spec.ts` - Nested object generation
- `real-world.integration.spec.ts` - Petstore Expanded nested schemas

#### 5. Empty Operations
**File:** `empty-operations.yaml`

**Pattern:** Operations without parameters or request bodies

**Handling:**
- Generate controller method with no parameters
- Return service interface method with `void` parameters
- Add only route decorator (no `@Body()`, `@Param()`, etc.)

**Test coverage:**
- `controller.generator.spec.ts` - Parameterless methods
- `operation-helpers.spec.ts` - Operation parsing

#### 6. Malformed Operation IDs
**File:** `malformed-operationids.yaml`

**Pattern:** Special characters, duplicates, missing operationIds

**Handling:**
- **Normalize to camelCase:** Handle kebab-case, snake_case, PascalCase
- **Remove special characters:** Strip non-alphanumeric (except underscore)
- **Deduplicate:** Append numeric suffix for duplicates
- **Fallback:** Use HTTP verb + path segments if missing

**Test coverage:**
- `operation-helpers.spec.ts` - Normalization logic
- `controller.generator.spec.ts` - Method name generation
- `decorator.generator.spec.ts` - Decorator naming

**Example transformations:**
```
get-users-by-id → getUsersById
create_new_user → createNewUser
UpdateUser → updateUser
missing operationId → getPosts (from GET /posts)
```

#### 7. Missing Types
**File:** `missing-types.yaml`

**Pattern:** Schema properties with no `type` field specified

**Handling:**
- **Fallback to `any` with warning:** Generate `property?: any`
- Add `@IsOptional()` decorator (cannot validate unknown type)
- Log warning during generation (future: support `--strict` mode)

**Test coverage:**
- `type-mapper.spec.ts` - Type resolution fallback
- `dto.generator.spec.ts` - Property generation

#### 8. Array Without Items
**File:** `array-without-items.yaml`

**Pattern:** Array type without `items` definition

**Handling:**
- **Fallback to `any[]`:** Generate `property?: any[]`
- Add `@IsArray()` decorator
- Add `@IsOptional()` decorator

**Test coverage:**
- `type-mapper.spec.ts` - Array type fallback
- `dto.generator.spec.ts` - Array property generation

### Graceful Failure Examples

**From compilation validation tests:**

```typescript
// Empty operations → Generate method with no params
async emptyOperation(): Promise<void> {
  return this.service.emptyOperation();
}

// Missing type → Fallback to any
property?: any;

// Array without items → Fallback to any[]
@IsArray()
@IsOptional()
items?: any[];

// Malformed operationId → Normalize to camelCase
// "get-users-by-id" → getUsersById()
```

---

## Adding New Tests

### Adding a Unit Test

**1. Choose appropriate test file:**
- Generator tests: `tests/generators/`
- Helper tests: `tests/utils/`

**2. Follow the test pattern:**

```typescript
describe("ComponentName Unit Tests", () => {
  let project: Project;
  let generator: GeneratorType;

  beforeEach(() => {
    project = new Project({ useInMemoryFileSystem: true });
    generator = new GeneratorType();
  });

  describe("New Feature Category", () => {
    it("should test specific behavior", () => {
      // Arrange
      const spec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            TestDto: {
              type: "object",
              properties: {
                field: { type: "string" },
              },
            },
          },
        },
      };

      // Act
      generator.generate(spec, project, "./generated");

      // Assert
      const sourceFile = project.getSourceFileOrThrow("./generated/dtos/TestDto.dto.ts");
      expect(sourceFile.getClass("TestDto")).toBeDefined();
      expect(sourceFile.getFullText()).toMatchSnapshot("test-dto");
    });
  });
});
```

**3. Run tests:**
```bash
npm test -- --testPathPattern=your-test-file
```

**4. Update snapshots if needed:**
```bash
npm test -- -u --testPathPattern=your-test-file
```

### Adding an Integration Test

**1. Add to existing integration test file:**
- Real-world specs: `tests/integration/real-world.integration.spec.ts`
- Edge cases: `tests/integration/synthetic.integration.spec.ts`

**2. Create new fixture if needed:**
- Place in `tests/fixtures/real-world/` or `tests/fixtures/synthetic/`
- Document in `tests/fixtures/README.md`

**3. Follow integration test pattern:**

```typescript
it("should generate code for new fixture", () => {
  const spec = loadSpec("new-fixture.yaml");

  // Run all generators
  dtoGenerator.generate(spec, project, "generated");
  controllerGenerator.generate(spec, project, "generated");
  decoratorGenerator.generate(spec, project, "generated");

  // Extract file structure
  const structure = extractFileStructure(project);

  // Validate expected files
  expect(structure["generated/dtos/ExpectedDto.dto.ts"]).toBeDefined();
  expect(structure["generated/controllers/expected.controller.ts"]).toBeDefined();

  // Snapshot test
  const fileList = Object.keys(structure).sort().join("\n");
  expect(fileList).toMatchSnapshot("new-fixture-structure");
});
```

### Adding a Compilation Validation Test

**1. Add fixture to appropriate directory**

**2. Add test case in `compilation-validation.spec.ts`:**

```typescript
it("should generate compilable code for new spec", () => {
  const specPath = path.join(__dirname, "../fixtures/real-world/new-spec.yaml");
  const spec = loadSpec(specPath);

  generateCode(spec, TEMP_OUTPUT_DIR);
  createTsConfig(TEMP_OUTPUT_DIR);

  const result = validateCompilation(TEMP_OUTPUT_DIR);

  if (!result.success) {
    console.error("Compilation failed:");
    console.error(result.output);
  }

  expect(result.success).toBe(true);
}, 30000); // 30 second timeout for compilation
```

---

## Troubleshooting

### Common Test Failures

#### 1. Snapshot Mismatch

**Error:**
```
Expected value to match snapshot
```

**Cause:** Generated output changed

**Solution:**
```bash
# Review the diff in terminal output
npm test

# If change is intentional, update snapshots
npm test -- -u

# Review updated snapshots
git diff tests/__snapshots__/
```

#### 2. Compilation Validation Failures

**Error:**
```
Compilation failed: error TS2322: Type 'X' is not assignable to type 'Y'
```

**Cause:** Generated TypeScript has type errors

**Solution:**
1. Check temporary output directory: `tests/.tmp-compilation-test/`
2. Review generated files for type issues
3. Fix generator logic to produce correct types
4. Common issues:
   - Missing imports
   - Incorrect type mapping
   - Missing `any` fallback for unknown types

#### 3. AST Validation Failures

**Error:**
```
Property/Class not found in generated file
```

**Cause:** Generator didn't create expected AST structure

**Solution:**
1. Print generated code: `console.log(sourceFile.getFullText())`
2. Verify generator logic is executing
3. Check for conditional logic that might skip generation
4. Validate input spec has expected properties

#### 4. Circular Reference Errors in Snapshots

**Error:**
```
TypeError: Converting circular structure to JSON
```

**Cause:** Attempting to snapshot ts-morph AST objects

**Solution:**
```typescript
// ❌ WRONG: Snapshot AST object
expect(sourceFile).toMatchSnapshot();

// ✅ CORRECT: Snapshot string content
expect(sourceFile.getFullText()).toMatchSnapshot();
```

#### 5. Fixture Parse Failures

**Error:**
```
Error: Failed to parse YAML fixture
```

**Cause:** Invalid YAML syntax or malformed OpenAPI spec

**Solution:**
1. Validate YAML syntax with online YAML validator
2. Validate OpenAPI spec with Swagger Editor
3. Check for unresolvable `$ref` references
4. Ensure all required OpenAPI 3.0 fields present

### Debugging Tips

**1. Print generated code:**
```typescript
const sourceFile = project.getSourceFile("path/to/file.ts");
console.log(sourceFile?.getFullText());
```

**2. Inspect AST structure:**
```typescript
const classDecl = sourceFile.getClass("ClassName");
console.log("Properties:", classDecl?.getProperties().map(p => p.getName()));
console.log("Methods:", classDecl?.getMethods().map(m => m.getName()));
console.log("Imports:", sourceFile.getImportDeclarations().map(imp => imp.getText()));
```

**3. Run single test:**
```bash
npm test -- --testNamePattern="should test specific behavior"
```

**4. Enable verbose output:**
```bash
npm test -- --verbose
```

**5. Check coverage for untested paths:**
```bash
npm test -- --coverage --testPathPattern=your-test-file
```

**6. Inspect compilation errors:**
```bash
# After compilation validation failure, check:
cat tests/.tmp-compilation-test/path/to/generated/file.ts
```

### Getting Help

**Resources:**
- Jest documentation: https://jestjs.io/docs/getting-started
- ts-morph documentation: https://ts-morph.com/
- OpenAPI 3.0 specification: https://swagger.io/specification/

**Common questions:**
- **Q: Why are snapshots failing?**
  - A: Review diff, update if intentional: `npm test -- -u`

- **Q: How do I test a new edge case?**
  - A: Create synthetic fixture in `tests/fixtures/synthetic/`, add test in `synthetic.integration.spec.ts`

- **Q: Why is compilation validation slow?**
  - A: It runs actual TypeScript compiler (~30s), this is expected

- **Q: How do I add tests for a new generator?**
  - A: Create `tests/generators/new-generator.spec.ts` following existing patterns

---

## Summary

**Test Architecture:**
- Unit tests (generators, helpers) → Fast, isolated, AST validation
- Integration tests (real-world, synthetic) → Pipeline validation, snapshots
- Compilation validation → TypeScript strict mode compliance

**Running Tests:**
- `npm test` - Run all tests
- `npm test -- --testPathPattern=<pattern>` - Run specific tests
- `npm test -- -u` - Update snapshots
- `npm test -- --coverage` - Check coverage

**Fixtures:**
- Real-world: `petstore.yaml`, `petstore-expanded.yaml`
- Synthetic: 8 edge case fixtures

**Snapshot Testing:**
- Use string format (not AST objects)
- Always review diffs before updating
- Named snapshots for clarity

**Edge Cases:**
- 8 patterns: circular refs, nullable composition, discriminators, etc.
- Graceful failure: never crash, always return usable result
- Comprehensive test coverage for each pattern

**Adding Tests:**
- Follow existing patterns
- Create fixtures as needed
- Update snapshots after review
- Aim for 85%+ coverage

**Troubleshooting:**
- Snapshot mismatches → Review diff, update if intentional
- Compilation errors → Check `.tmp-compilation-test/` directory
- AST failures → Print generated code, inspect structure
- Circular refs → Use string snapshots, not AST objects

---

**Version:** 1.0.0
**Last Updated:** 2026-01-29
**Maintained by:** OpenNest Team
