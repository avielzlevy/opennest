# Codebase Structure

**Analysis Date:** 2026-01-27

## Directory Layout

```
opennest/
├── generators/              # Code generation logic for AST synthesis
│   ├── common.generator.ts        # Shared artifacts: error DTO, auth decorators
│   ├── controller.generator.ts    # NestJS controller generation
│   ├── decorator.generator.ts     # Endpoint-level Swagger decorators
│   └── dto.generator.ts           # DTO class generation with validation
├── interfaces/              # Port definitions (hex architecture)
│   └── core.ts              # Core interfaces: ISpecParser, IGenerator, IFileWriter
├── utils/                   # Shared utilities
│   └── type-mapper.ts       # OpenAPI schema to TypeScript type mapping
├── tests/                   # Test suite for generators and mappers
│   ├── dto.generator.spec.ts      # DTO generator integration tests
│   └── type-mapper.spec.ts        # Type mapping unit tests
├── main.ts                  # Bootstrap and adapters (entry point)
├── package.json             # Dependencies, scripts
├── package-lock.json        # Locked dependency versions
├── tsconfig.json            # TypeScript compiler configuration
├── jest.config.js           # Jest test runner configuration
├── readme.md                # Project documentation (minimal)
└── dist/                    # Compiled JavaScript output (generated)
```

## Directory Purposes

**generators/**
- Purpose: Core code generation logic; transforms OpenAPI spec into TypeScript source files
- Contains: Four generator classes, each implementing IGenerator interface
- Key files: `common.generator.ts`, `dto.generator.ts`, `controller.generator.ts`, `decorator.generator.ts`

**interfaces/**
- Purpose: Port definitions and shared type contracts
- Contains: Core interfaces for dependency injection and type passing
- Key files: `core.ts` (ISpecParser, IGenerator, IFileWriter, TypeMappingResult, EnumDefinition)

**utils/**
- Purpose: Reusable logic not tied to specific generators
- Contains: Schema-to-type mapping with context-aware decorator generation
- Key files: `type-mapper.ts` (TypeMapper class with mapSchemaToType method)

**tests/**
- Purpose: Integration and unit tests for generators and utilities
- Contains: Jest spec files testing generators in isolation with in-memory file system
- Key files: `dto.generator.spec.ts`, `type-mapper.spec.ts`

**dist/**
- Purpose: Compiled JavaScript output from TypeScript
- Generated: Yes (created by tsc)
- Committed: No (excluded in tsconfig.json)

## Key File Locations

**Entry Points:**
- `G:/Projects/opennest/main.ts`: Main application entry; contains bootstrap function and adapter implementations

**Configuration:**
- `G:/Projects/opennest/tsconfig.json`: TypeScript compilation settings (strict mode, experimentalDecorators enabled)
- `G:/Projects/opennest/jest.config.js`: Jest test configuration (node environment, ts-jest transformer)
- `G:/Projects/opennest/package.json`: Project metadata, dependencies, npm scripts

**Core Logic:**
- `G:/Projects/opennest/generators/dto.generator.ts`: DTO class generation with property decorators
- `G:/Projects/opennest/generators/controller.generator.ts`: NestJS controller with dependency injection
- `G:/Projects/opennest/generators/decorator.generator.ts`: Endpoint-level Swagger/Auth decorators
- `G:/Projects/opennest/generators/common.generator.ts`: Shared error DTOs and auth decorator functions
- `G:/Projects/opennest/utils/type-mapper.ts`: Schema-to-type mapping with validation and enum support

**Abstractions:**
- `G:/Projects/opennest/interfaces/core.ts`: Port interfaces and shared type definitions

**Testing:**
- `G:/Projects/opennest/tests/dto.generator.spec.ts`: Tests DTOGenerator with in-memory Project
- `G:/Projects/opennest/tests/type-mapper.spec.ts`: Tests TypeMapper with various schema types

## Naming Conventions

**Files:**
- Generators: `[feature].generator.ts` (e.g., `dto.generator.ts`, `controller.generator.ts`)
- Tests: `[module].spec.ts` (e.g., `dto.generator.spec.ts`, `type-mapper.spec.ts`)
- Interfaces: `core.ts` (single file for all ports)
- Utilities: `[concern].ts` (e.g., `type-mapper.ts`)

**Directories:**
- Lowercase with no hyphens: `generators`, `interfaces`, `utils`, `tests`
- Generated output: `src/` prefix in generated files (e.g., `src/dtos/User.dto.ts`)

**Classes:**
- PascalCase, descriptive: `DtoGenerator`, `ControllerGenerator`, `TypeMapper`, `SwaggerParserAdapter`, `SystemFileWriter`

**Interfaces:**
- PascalCase with leading 'I': `IGenerator`, `ISpecParser`, `IFileWriter`

**Generated Artifacts:**
- DTOs: `[Name].dto.ts` (e.g., `UserDto.dto.ts`)
- Controllers: `[resource].controller.ts` (e.g., `user.controller.ts`)
- Decorators: `[resource].decorator.ts` (e.g., `user.decorator.ts`)
- Common: `src/common/decorators/auth/`, `src/common/dto/`

## Where to Add New Code

**New Generator:**
1. Create file: `G:/Projects/opennest/generators/[feature].generator.ts`
2. Implement interface: `IGenerator` from `interfaces/core.ts`
3. Add instantiation: `main.ts` bootstrap function
4. Add to pipeline: Call in sequential order in bootstrap

**New Utility/Transformer:**
- Location: `G:/Projects/opennest/utils/[concern].ts`
- Pattern: Stateless class with public methods
- Usage: Inject into generators that need transformation logic

**Generator Test:**
1. Create file: `G:/Projects/opennest/tests/[module].spec.ts`
2. Pattern: Create in-memory Project, execute generator, assert AST properties
3. Use ts-morph methods: `project.getSourceFileOrThrow()`, `getClassOrThrow()`, `getPropertyOrThrow()`

**New Interface/Type:**
- Location: `G:/Projects/opennest/interfaces/core.ts`
- Export from core.ts; shared across all generators
- Use for dependency injection and data passing

## Special Directories

**dist/:**
- Purpose: Compiled JavaScript output (not source)
- Generated: Yes (by tsc during build)
- Committed: No (in tsconfig.json excludes)

**src/ (Output Directory):**
- Purpose: Target directory for generated NestJS artifacts (DTOs, controllers, decorators)
- Generated: Yes (by generators during execution)
- Committed: No (generated on-demand)
- Output structure:
  - `src/dtos/` - Generated DTO classes
  - `src/controllers/` - Generated controller classes
  - `src/decorators/` - Generated endpoint decorators
  - `src/common/dto/` - Shared error DTO (from CommonGenerator)
  - `src/common/decorators/auth/` - Auth decorators (from CommonGenerator)

**node_modules/:**
- Purpose: Installed package dependencies
- Generated: Yes (by npm install)
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-01-27*
