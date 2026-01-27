# External Integrations

**Analysis Date:** 2026-01-27

## APIs & External Services

**OpenAPI/Swagger:**
- OpenAPI Specification - Consumed from remote HTTP endpoint
  - SDK/Client: `@apidevtools/swagger-parser` (v10.0.0)
  - URL: `http://localhost:5300/docs-json` (configurable in `main.ts` line 60)
  - Auth: None (public or local-only endpoint)
  - Usage: Parses specification to generate NestJS code artifacts

**NestJS SDK:**
- NestJS Framework - Used for generated code structure
  - Package: `@nestjs/common` (v10.0.0)
  - Package: `@nestjs/swagger` (v7.0.0)
  - Auth: Not applicable (code generation context)
  - Usage: Provides decorators and base classes for generated Controllers, DTOs, and Auth utilities

## Data Storage

**Databases:**
- Not detected - Application generates code; does not persist data itself

**File Storage:**
- Local filesystem only
  - Generated files written to `src/` directory structure
  - Output: TypeScript files for DTOs, Controllers, Decorators, and Common utilities
  - Client: `ts-morph` (v20.0.0) for AST file I/O

**Caching:**
- Not detected

## Authentication & Identity

**Auth Provider:**
- Custom JWT Support
  - Implementation: Generated JWT decorator in `src/common/decorators/auth/jwt.decorator.ts`
  - Bearer token support via `ApiBearerAuth()` from NestJS/Swagger
  - Expected header: `Authorization: Bearer <token>`

**Custom API Key Support:**
- Custom API Key Support
  - Implementation: Generated API Key decorator in `src/common/decorators/auth/apiKey.decorator.ts`
  - Header name: `Api-Key`
  - Implementation approach: `ApiSecurity('Api-Key')` decorator

**No OAuth/Third-party Auth:**
- OpenID Connect, OAuth2, or SAML not detected
- Authentication is stubbed in generated decorator code (actual validation implemented by user)

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, DataDog, or other error tracking service

**Logs:**
- Console-based logging only
  - Output in `main.ts`: Bootstrap messages and file generation summary
  - Pattern: `console.log()` for status updates
  - No structured logging framework (winston, bunyan, etc.)

## CI/CD & Deployment

**Hosting:**
- Not applicable - This is a code generation tool, not a deployable service
- Generated code targets NestJS applications (user's responsibility to deploy)

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, Jenkins, etc.

**Build/Compile:**
- TypeScript compilation via `tsc` (from tsconfig.json)
- Output: Compiled JavaScript in `dist/` directory

## Environment Configuration

**Required env vars:**
- None currently enforced
- OpenAPI spec URL hardcoded to `http://localhost:5300/docs-json` (modify `main.ts` line 60 to change)

**Optional Configuration:**
- OpenAPI spec source can be provided as:
  - Remote HTTP/HTTPS URL (parsed via `@apidevtools/swagger-parser`)
  - Local file path
  - Default: Assumes local OpenAPI server running on `localhost:5300`

**Secrets location:**
- Not applicable - No secrets management
- Generated code includes auth decorator stubs for JWT and API Key (actual validation logic user-implemented)

## Webhooks & Callbacks

**Incoming:**
- Not detected - Application does not expose HTTP endpoints

**Outgoing:**
- Not detected - Application performs no remote callbacks

## Code Generation Targets

**Generated Output Integration Points:**
- DTOs (`src/dtos/*.dto.ts`)
  - Use with: NestJS request/response validation
  - Decorators: `@ValidateNested()`, `@Type()`, `@IsString()`, `@IsNumber()`, etc.
  - Validation via `class-validator` (v0.14.0) and transformation via `class-transformer` (v0.5.0)

- Controllers (`src/controllers/*.controller.ts`)
  - Use with: NestJS routing and dependency injection
  - Expects: Service interface `I${ResourceName}Service` to be injected
  - Decorators: `@Controller()`, `@Get()`, `@Post()`, etc.

- Endpoint Decorators (`src/decorators/*.decorator.ts`)
  - Compose: `ApiOperation()`, `ApiResponse()`, `ApiBody()`, `ApiQuery()`, `ApiParam()`
  - Auth support: `JwtDecorator()`, `ApiKeyDecorator()` (generated utilities)
  - Re-exported from generated auth utilities in `src/common/decorators/auth/`

- Common Artifacts (`src/common/`)
  - Error DTO: `src/common/dto/error.dto.ts` (standardized error response)
  - JWT decorator: `src/common/decorators/auth/jwt.decorator.ts`
  - API Key decorator: `src/common/decorators/auth/apiKey.decorator.ts`

---

*Integration audit: 2026-01-27*
