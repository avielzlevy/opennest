# OpenNest

Generate NestJS skeleton code from OpenAPI specifications in seconds.

[![npm version](https://img.shields.io/npm/v/opennest.svg)](https://www.npmjs.com/package/opennest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

✓ Production Ready v1.0

## What This Is

OpenNest is a CLI tool that generates compilable NestJS skeleton code from OpenAPI specifications. It automatically creates:

- **DTOs** with validation decorators (class-validator)
- **Controllers** with route handlers and dependency injection
- **Swagger decorators** for auto-generated API documentation

Perfect for API-first teams building with NestJS.

## Core Value

Never write boilerplate CRUD code again. OpenNest converts your OpenAPI spec into production-ready NestJS skeleton code, letting your team focus on business logic.

**Input:** OpenAPI Spec → **Output:** Compilable NestJS Code (DTOs, Controllers, Decorators)

## Features

- ✓ Generates valid TypeScript with strict mode support
- ✓ Creates DTOs with class-validator decorators
- ✓ Scaffolds controllers with route handlers
- ✓ Generates Swagger/OpenAPI decorators
- ✓ Supports OpenAPI 3.0.0-3.0.3
- ✓ Graceful error handling (never crashes)
- ✓ Multiple validation strategies (--strict, --lenient, --validate-only)
- ✓ Configurable output structures (type-based, domain-based)
- ✓ 600+ tests, 85%+ coverage

## Installation

OpenNest is distributed via GitHub Package Registry. See [Installation Guide](docs/INSTALLATION.md) for detailed setup instructions.

### Quick Start

1. **Configure npm authentication:**
   ```bash
   npm login --scope=@anthropics --registry=https://npm.pkg.github.com --auth-type=legacy
   ```

2. **Install OpenNest:**
   ```bash
   npm install @anthropics/opennest
   ```

3. **Generate code:**
   ```bash
   npx @anthropics/opennest ./api-spec.yaml --output ./src/generated
   ```

For CI/CD setup and troubleshooting, see the [full installation guide](docs/INSTALLATION.md).

**Requirements:** Node.js >=16.0.0, TypeScript >=4.8

## Quick Start

### Basic Usage

```bash
# From local file
opennest ./petstore.openapi.json --output ./generated

# From remote URL
opennest https://petstore3.swagger.io/api/v3/openapi.json --output ./generated
```

### With Validation Flags

```bash
# Strict mode (fail on any error)
opennest spec.json --strict

# Lenient mode (skip invalid schemas)
opennest spec.json --lenient

# Validation only (no generation)
opennest spec.json --validate-only

# Verbose output
opennest spec.json --verbose
```

## Understanding Output Structures

OpenNest supports two output organization patterns to match your project preferences:

### Type-based Structure (Default)

Organizes generated files by type (DTOs, controllers, decorators) - ideal for small to medium APIs:

```
generated/
├── dtos/
│   ├── User.dto.ts
│   ├── Product.dto.ts
│   ├── Order.dto.ts
│   └── ...
├── controllers/
│   ├── users.controller.ts
│   ├── products.controller.ts
│   ├── orders.controller.ts
│   └── ...
└── decorators/
    └── endpoint.decorator.ts
```

**Usage:**
```bash
opennest ./api.yaml
# or explicitly:
opennest ./api.yaml --structure type-based
```

### Domain-based Structure

Organizes files by domain/resource - ideal for large APIs with many resources:

```
generated/
├── user/
│   ├── dtos/
│   │   └── User.dto.ts
│   └── controllers/
│       └── user.controller.ts
├── product/
│   ├── dtos/
│   │   └── Product.dto.ts
│   └── controllers/
│       └── product.controller.ts
├── order/
│   ├── dtos/
│   │   └── Order.dto.ts
│   └── controllers/
│       └── order.controller.ts
└── decorators/
    └── endpoint.decorator.ts
```

**Usage:**
```bash
opennest ./api.yaml --structure domain-based
```

### Choosing a Structure

**Use Type-based when:**
- Your API has fewer than 10 resources/tags
- You prefer organizing by technical layers
- You want quick access to all DTOs or controllers
- Your team is familiar with traditional NestJS project layouts

**Use Domain-based when:**
- Your API has many resources (10+)
- You organize by business domains/bounded contexts
- Each resource has multiple DTOs and complex logic
- You want to co-locate domain-related files

## Supported Versions

- **OpenAPI:** 3.0.0, 3.0.1, 3.0.2, 3.0.3
- **Node.js:** >=16.0.0
- **NestJS:** 10.x (tested)
- **TypeScript:** >=4.8

(3.1.x coming in future updates)

## Known Limitations

- Service layer generation not included (intentional design focus on skeleton)
- No database/ORM integration (Prisma, TypeORM setup not generated)
- Limited support for complex circular schema references
- operationId required for optimal controller method naming (uses path fallback)
- Single generator per invocation (run multiple times for full output)
- OpenAPI 2.0 (Swagger) and 3.1.x not yet supported
- Validation errors may skip schemas (use --strict to fail instead)
- Currently supports two structure patterns; others not available

## Roadmap

- [ ] OpenAPI 3.1.x (Swagger) support

## Contributing

Interested in contributing? Check out [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Local development setup
- Testing your changes
- Code style guidelines
- Pull request process

Report bugs and request features on [GitHub Issues](https://github.com/anthropics/opennest/issues).

## License

MIT License - see [LICENSE](./LICENSE) file for details.

Built with [ts-morph](https://github.com/dsherret/ts-morph) for AST manipulation.
Inspired by NestJS, API-first development methodologies.

---

## Part of LiveSpec

This package is the code-generation engine powering [LiveSpec](https://github.com/avielzlevy/livespec) — an AI-driven platform that takes your OpenAPI spec all the way to a live, containerized API on Kubernetes. The server invokes the OpenNest CLI as a subprocess, then passes the generated code to Gemini AI agents that write the business logic, build a Docker image, and deploy to a Kubernetes cluster.

Use OpenNest standalone to generate boilerplate into your own project, or use LiveSpec for the full end-to-end pipeline.
