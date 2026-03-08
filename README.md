# OpenNest

Generate production-ready NestJS skeleton code from OpenAPI specifications.

[![npm version](https://img.shields.io/npm/v/opennest.svg)](https://www.npmjs.com/package/opennest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-1115%20passing-brightgreen)](#testing)

---

**Input:** OpenAPI Spec → **Output:** Compilable NestJS code (controllers, DTOs, decorators)

OpenNest is a CLI tool that reads an OpenAPI 3.0.x specification and generates type-safe NestJS skeleton code — controllers with route handlers, DTOs with `class-validator` decorators, and Swagger/OpenAPI decorators. No hand-writing boilerplate. Focus on business logic.

## Features

- Generates valid TypeScript with strict mode support
- DTOs with `class-validator` decorators (`@IsString`, `@IsOptional`, `@ValidateNested`, etc.)
- Controllers with full route handlers and dependency injection
- Swagger decorators (`@ApiOperation`, `@ApiResponse`, `@ApiParam`, etc.)
- AI context files for downstream agent consumption (used by LiveSpec)
- Two output structures: type-based (default) or domain-based
- Multiple validation strategies: `--strict`, `--lenient`, `--validate-only`
- Supports OpenAPI 3.0.0–3.0.3
- 1147 tests (1115 passing, 12 snapshot updates needed)

## Installation

```bash
npm install opennest
```

**Requirements:** Node.js >= 16, TypeScript >= 4.8

## Usage

```bash
# From a local file
opennest ./petstore.yaml --output ./generated

# From a URL
opennest https://petstore3.swagger.io/api/v3/openapi.json --output ./generated

# Strict mode — fail on any validation error
opennest spec.json --strict

# Lenient mode — skip invalid schemas
opennest spec.json --lenient

# Validation only — no code generation
opennest spec.json --validate-only

# Verbose output
opennest spec.json --verbose
```

## Output Structures

### Type-based (default)

Groups files by type — ideal for small to medium APIs:

```
generated/
├── controllers/
│   ├── users.controller.ts
│   └── products.controller.ts
├── dtos/
│   ├── User.dto.ts
│   └── Product.dto.ts
└── decorators/
    └── endpoint.decorator.ts
```

### Domain-based

Groups files by resource — ideal for large APIs:

```
generated/
├── user/
│   ├── controllers/
│   │   └── user.controller.ts
│   └── dtos/
│       └── User.dto.ts
├── product/
│   ├── controllers/
│   │   └── product.controller.ts
│   └── dtos/
│       └── Product.dto.ts
└── decorators/
    └── endpoint.decorator.ts
```

```bash
opennest spec.yaml --structure domain-based
```

## Supported Versions

| Spec | Versions |
|------|----------|
| OpenAPI | 3.0.0, 3.0.1, 3.0.2, 3.0.3 |
| Node.js | >= 16 |
| NestJS (output) | 10.x |
| TypeScript | >= 4.8 |

OpenAPI 3.1.x support is on the roadmap.

## Testing

```bash
npm test
```

The test suite contains 1147 tests across 42 suites with fixtures in `tests/fixtures/` (real-world and synthetic specs). Current status: 1115 passing, 12 snapshot updates needed, 13 suites with failures under investigation.

## Known Limitations

- Service layer not generated (by design — skeleton only, or use LiveSpec for AI-generated services)
- No database/ORM integration in output
- Limited support for deeply circular schema references
- `operationId` recommended for clean method naming (falls back to path-based naming)
- OpenAPI 2.0 (Swagger) and 3.1.x not yet supported

## Part of LiveSpec

OpenNest is the code generation engine powering [LiveSpec](https://github.com/avielzlevy/livespec) — an AI-driven platform that takes your OpenAPI spec all the way to a live, containerized API on Kubernetes. The LiveSpec server invokes OpenNest as a subprocess, then passes the generated code to LLM agents (via OpenRouter, model-agnostic) that write business logic, build a Docker image, and deploy to a Kubernetes cluster.

Use OpenNest standalone to generate boilerplate, or use LiveSpec for the full end-to-end pipeline.

## License

MIT — see [LICENSE](./LICENSE).

Built with [ts-morph](https://github.com/dsherret/ts-morph) for AST manipulation.
