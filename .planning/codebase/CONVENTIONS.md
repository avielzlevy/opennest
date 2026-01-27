# Coding Conventions

**Analysis Date:** 2026-01-27

## Naming Patterns

**Files:**
- Generator files: `[Name].generator.ts` (e.g., `dto.generator.ts`, `controller.generator.ts`)
- Decorator files: `[Name].decorator.ts` (e.g., `jwt.decorator.ts`)
- Utility files: `type-mapper.ts` (placed in `utils/` directory)
- Interface/contract files: `core.ts` (placed in `interfaces/` directory)
- Test files: `[Name].spec.ts` (co-located in `tests/` directory)
- Generated output: DTO classes output to `src/dtos/[ClassName].dto.ts`, controllers to `src/controllers/[Name].controller.ts`

**Classes:**
- Class names use PascalCase: `DtoGenerator`, `ControllerGenerator`, `TypeMapper`, `ErrorDto`
- Interface names use PascalCase with `I` prefix: `ISpecParser`, `IGenerator`, `IFileWriter`
- Enum type names use PascalCase: `ClientStatus`, `ClientResponseDtoStatus`
- Enum const names use UPPER_SNAKE_CASE: `CLIENT_STATUS`, `CLIENT_RESPONSE_DTO_STATUS`

**Functions:**
- Public methods use camelCase: `generate()`, `mapSchemaToType()`, `parse()`
- Private methods use camelCase: `groupOperationsByTag()`, `extractBodyDto()`, `applyOptionality()`
- Helper/utility functions use camelCase: `capitalize()`, `sanitizeParamName()`, `toConstantCase()`
- Decorator functions use PascalCase with "Endpoint" suffix: `PreviewCouponEndpoint`, `GetUserEndpoint`

**Variables:**
- Local variables use camelCase: `project`, `sourceFile`, `typeMapper`, `className`
- Constants use UPPER_SNAKE_CASE: `HTTP_METHODS`
- Properties use camelCase: `name`, `message`, `status`, `isRequired`

**Types:**
- Interface names use `I` prefix with PascalCase: `IGenerator`, `ISpecParser`, `IFileWriter`
- Type aliases use PascalCase: `TypeMappingResult`, `EnumDefinition`
- Generic type parameters use single uppercase letters: `T`

## Code Style

**Formatting:**
- Indentation: 2 spaces (configured via `ts-morph` in `main.ts` line 26: `indentSize: 2`)
- Line endings: LF (ensured by `ensureNewLineAtEndOfFile: true`)
- Tabs converted to spaces: `convertTabsToSpaces: true`
- Brace placement: Opening braces on same line for functions and control blocks (see `main.ts` lines 28-29)
- String quotes: Double quotes used consistently throughout

**Linting:**
- No explicit ESLint configuration file detected
- No Prettier configuration detected
- Type safety enforced at compile-time via TypeScript strict mode (configured in `tsconfig.json`)
- All source files must be valid TypeScript

## Import Organization

**Order:**
1. External library imports (e.g., `import SwaggerParser from "@apidevtools/swagger-parser"`)
2. Type library imports (e.g., `import { OpenAPIV3 } from "openapi-types"`)
3. Internal absolute imports (e.g., `import { IGenerator } from "../interfaces/core"`)
4. Local relative imports (e.g., `import { TypeMapper } from "../utils/type-mapper"`)

**Path Aliases:**
- No path aliases configured; relative imports used throughout (e.g., `../interfaces/core`, `../dtos/${dtoName}.dto`)
- Generated files use relative paths based on output directory structure

**Import Management:**
- Use `sourceFile.organizeImports()` to automatically sort and clean imports (seen in `dto.generator.ts` line 44, `controller.generator.ts` line 177)
- Use `sourceFile.fixMissingImports()` to auto-add required imports (seen in `dto.generator.ts` line 43)

## Error Handling

**Patterns:**
- Errors are caught at bootstrap level with `.catch(console.error)` (see `main.ts` line 79)
- No explicit try-catch blocks in generators; errors propagate up
- Type assertions used sparingly: `as any` or `as OpenAPIV3.ReferenceObject` only when type system cannot infer
- Early returns to avoid nesting: `if (!document.paths) return;` (seen in `controller.generator.ts` line 11)
- Type guards with Set for duplicate prevention: `const addedParams = new Set<string>()` (seen in `controller.generator.ts` line 132)

## Logging

**Framework:** `console` object (basic Node.js logging)

**Patterns:**
- Use `console.log()` for informational messages with descriptive text (e.g., `"Generating DTOs..."`)
- Status messages announce each processing stage (see `main.ts` lines 64-74)
- Success confirmation with count: `Success! Generated ${project.getSourceFiles().length} files.`
- No structured logging; all output is human-readable console strings

## Comments

**When to Comment:**
- Added for non-obvious design decisions (e.g., `// FIX: Strict initialization` in `common.generator.ts` line 22)
- Used to explain complex transformations (e.g., `// Heuristic: ClientResponseDto + status -> ClientResponseDtoStatus` in `type-mapper.ts` line 79)
- Block comments for major sections: `// --- Adapters (Implementation Details) ---` (see `main.ts` line 11)
- Numbered steps for multi-phase operations: `// 1. Mock Input`, `// 2. Execute`, `// 3. Inspect` (seen in `dto.generator.spec.ts`)

**JSDoc/TSDoc:**
- Used for interface definitions in `interfaces/core.ts` (lines 5-33)
- Comments precede interfaces to explain port responsibilities
- Properties documented inline with comments

## Function Design

**Size:** Functions range from 5 lines (private helpers like `capitalize()`) to 40+ lines (complex generation methods like `DtoGenerator.processProperties()`)

**Parameters:**
- Constructor injection for dependencies: `constructor(private readonly typeMapper: TypeMapper)` (seen in `dto.generator.ts` line 14)
- Document parameters passed as first argument, Project as second in generator interface
- Context objects used for complex parameter passing: `context?: { className: string; propName: string }` (see `type-mapper.ts` line 9)
- Decorators use array/object configurations passed to `ts-morph` methods

**Return Values:**
- Generators return `void` (they mutate the Project instance)
- Mappers return `TypeMappingResult` objects containing multiple related values
- Private helpers return primitive values or collections (`string`, `string[]`, `Record<string, any[]>`)
- Async bootstrap returns `Promise<void>`

## Module Design

**Exports:**
- Each generator exports a class: `export class DtoGenerator implements IGenerator`
- Utility classes exported: `export class TypeMapper`
- Interfaces exported from central location: `export interface IGenerator` in `interfaces/core.ts`
- Constants exported at module level: `export const examples` in generated files

**Barrel Files:**
- No barrel files (index.ts) used; imports are explicit and direct
- Each file imports exactly what it needs from specific modules

## AST Manipulation Patterns

**ts-morph Library Usage:**
- Project created with TypeScript config: `new Project({ tsConfigFilePath: "./tsconfig.json" })`
- Source files created with overwrite flag: `project.createSourceFile(path, content, { overwrite: true })`
- Classes added to files: `sourceFile.addClass({ name, isExported: true, properties: [...] })`
- Imports auto-organized after modifications: `sourceFile.organizeImports()`
- Decorators applied via decorator objects: `{ name: "DecoratorName", arguments: ["arg1"] }`
- Property access with assertion: `classDecl.getSourceFile()`, `.getChildIndex()`, `.getPropertyOrThrow()`

## Decorator Generation Conventions

**Naming:** Endpoint decorators use action + "Endpoint": `PreviewCouponEndpoint`, `GetUserEndpoint`

**Structure:** Decorators use `applyDecorators()` pattern from NestJS to compose multiple decorators:
```typescript
return applyDecorators(
  ApiOperation(...),
  ApiBearerAuth(),
  ApiResponse(...)
);
```

**Decorator Arguments:** Arguments passed as JSON strings or template literals for complex objects

---

*Convention analysis: 2026-01-27*
