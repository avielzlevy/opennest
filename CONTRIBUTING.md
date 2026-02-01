# Contributing to OpenNest

Thank you for your interest in contributing! This document will help you get started.

## Code of Conduct

Be respectful, inclusive, and constructive. We're all here to build something great together.

## Getting Started

### Setup Development Environment

1. **Clone the repository:**
```bash
git clone https://github.com/anthropics/opennest.git
cd opennest
```

2. **Install dependencies:**
```bash
npm install
```

3. **Verify setup:**
```bash
npm test      # Run all tests
npm run build # Build TypeScript
npm start     # Test CLI locally
```

### Project Structure

```
opennest/
├── src/
│   ├── cli/                 # CLI layer (argument parsing, file handling)
│   ├── generators/          # Code generation (DTO, Controller, Decorator)
│   ├── utils/              # Helpers (type mapping, formatting, validation)
│   ├── errors/             # Error definitions and handling
│   ├── interfaces/         # Core interfaces and types
│   └── cli.ts              # Entry point
├── tests/
│   ├── validation/         # Validation module tests
│   ├── generators/         # Generator unit tests
│   ├── integration/        # Integration tests
│   └── fixtures/           # Test data (specs)
├── .planning/              # Project roadmap and phase plans
└── package.json            # Dependencies and scripts
```

## Development Workflow

### Architecture Overview

OpenNest uses **hexagonal architecture**:

- **Ports** (Interfaces)
  - IGenerator: Contract for code generation
  - ISpecParser: Contract for spec parsing
  - IFileWriter: Contract for file I/O

- **Adapters** (Implementations)
  - DtoGenerator, ControllerGenerator, DecoratorGenerator
  - SwaggerParser (via @apidevtools/swagger-parser)
  - ts-morph for AST manipulation

- **Domain** (Core Logic)
  - Type mapping (OpenAPI types → TypeScript)
  - Validation rules
  - Error handling

### Running Tests

```bash
# All tests
npm test

# With coverage
npm test -- --coverage

# Specific test file
npm test -- tests/generators/dto.generator.spec.ts

# Watch mode
npm test -- --watch
```

### Building

```bash
# Compile TypeScript
npm run build

# Output goes to dist/
```

### Code Style

We follow TypeScript + Prettier conventions:

- Use type guards instead of unsafe `as any` casts
- Prefer const/let over var
- Use arrow functions for callbacks
- Document complex logic with comments
- Add JSDoc for public functions
- Keep functions small and focused

Example:
```typescript
// Good: Type guard instead of cast
if (isSchemaObject(schema)) {
  // schema is now typed as SchemaObject
  const props = schema.properties;
}

// Bad: Unsafe cast
const props = (schema as any).properties;
```

## Understanding Output Structures

OpenNest supports multiple output organization patterns (type-based, domain-based). When contributing new features or generators, you need to ensure they work correctly with all structure patterns.

### How Structures Work

1. **Generation Logic is Identical**: The code generation logic (DTO creation, controller scaffolding, etc.) is the same regardless of structure
2. **Only Paths Differ**: The structure only affects where files are written (e.g., `dtos/User.dto.ts` vs `user/dtos/User.dto.ts`)
3. **OutputStructureManager**: A utility handles all path resolution based on the selected structure

### File Path Resolution

All generators use `OutputStructureManager` to determine file paths:

```typescript
import { getOutputPath } from '../utils/output-structure-manager';

// In your generator:
const filePath = getOutputPath(
  outputDir,        // Base output directory
  structure,        // 'type-based' | 'domain-based'
  'dto',           // File type: 'dto' | 'controller' | 'decorator'
  'User',          // Schema/resource name
  tag              // Optional: tag/domain for domain-based structure
);
```

**Example outputs:**
- Type-based: `generated/dtos/User.dto.ts`
- Domain-based: `generated/user/dtos/User.dto.ts` (uses tag)

### Adding Structure Support to New Features

When implementing a new generator or feature:

1. **Use OutputStructureManager**: Never hardcode paths like `${outputDir}/dtos/${name}.dto.ts`
   ```typescript
   // Bad - hardcoded path
   const path = `${outputDir}/dtos/${name}.dto.ts`;

   // Good - structure-aware
   const path = getOutputPath(outputDir, structure, 'dto', name, tag);
   ```

2. **Pass Structure Through**: Ensure the `structure` parameter flows from CLI → main → generator
   ```typescript
   // Generator interface
   interface IGenerator {
     generate(spec: OpenAPIV3.Document, outputDir: string, structure: OutputStructure): void;
   }
   ```

3. **Handle Tags/Domains**: For domain-based structure, extract and use tags from operations
   ```typescript
   const tag = operation.tags?.[0] || 'default';
   const path = getOutputPath(outputDir, structure, 'controller', controllerName, tag);
   ```

4. **Decorators are Special**: The `endpoint.decorator.ts` file always goes in `decorators/` at the root
   ```typescript
   // Decorators don't use tags - always at root
   const path = getOutputPath(outputDir, structure, 'decorator', 'endpoint');
   ```

### Testing Both Structures

Always test your changes with both structure patterns:

```bash
# Test type-based (default)
npm test

# Test domain-based
npm test -- --grep "domain-based"

# Integration test with both structures
npm run build
./dist/cli.js test-api.yaml --structure type-based
./dist/cli.js test-api.yaml --structure domain-based
```

**Writing Tests:**
```typescript
describe('MyGenerator', () => {
  ['type-based', 'domain-based'].forEach(structure => {
    it(`should generate correctly with ${structure} structure`, () => {
      const result = generator.generate(spec, outputDir, structure);

      if (structure === 'type-based') {
        expect(result.path).toBe('generated/dtos/User.dto.ts');
      } else {
        expect(result.path).toBe('generated/user/dtos/User.dto.ts');
      }
    });
  });
});
```

### Common Patterns

**Extract tag for domain-based:**
```typescript
function getPrimaryTag(operation: OperationObject): string {
  return operation.tags?.[0] || 'default';
}
```

**Get output path with tag handling:**
```typescript
const tag = structure === 'domain-based' ? getPrimaryTag(operation) : undefined;
const filePath = getOutputPath(outputDir, structure, 'controller', name, tag);
```

**Import path adjustments:**
```typescript
// Import paths are relative and auto-calculated by OutputStructureManager
const dtoImportPath = getImportPath(controllerPath, dtoPath);
// Result: '../dtos/User.dto' (type-based) or './dtos/User.dto' (domain-based)
```

## Adding Features

### 1. Check the Roadmap

Review `.planning/ROADMAP.md` to see planned phases and find where your feature fits.

### 2. Open an Issue

Discuss your feature idea before implementing. This prevents duplicate work and ensures alignment.

### 3. Create a Branch

```bash
git checkout -b feature/short-description
```

### 4. Implement with Tests

- Add unit tests for new utilities
- Add integration tests for generation logic
- Aim for 85%+ coverage
- Run tests to verify: `npm test`

### 5. Commit Your Work

```bash
git add src/ tests/
git commit -m "feat: add feature description

- What was added
- Why it was needed
- How it works

Co-Authored-By: Your Name <your.email@example.com>"
```

### 6. Push and Create PR

```bash
git push origin feature/short-description
```

Then open a PR on GitHub with:
- Clear description of changes
- Link to related issues
- Screenshot/example if UI-related
- Test results showing coverage

## Reporting Bugs

Use GitHub Issues with:
- **Title:** Clear, concise description
- **Description:** What happened vs expected
- **Steps to reproduce:** Minimal example
- **Environment:** Node version, OS, etc.
- **Logs/Error:** Full error message and stack trace

## Review Process

1. **Automated Checks**
   - All tests must pass
   - Coverage must be >=85%
   - Code style must match project

2. **Code Review**
   - Maintainers review for architecture fit
   - Discussion of approach and trade-offs
   - Feedback on implementation quality

3. **Merge**
   - Approved PRs squashed to single commit
   - Commit message follows convention
   - Changes documented in CHANGELOG.md (by maintainers)

## Questions?

- **GitHub Issues:** For bugs and features
- **GitHub Discussions:** For questions and ideas
- **Email:** See CONTRIBUTING.md header for contact

---

Thank you for contributing to OpenNest!
