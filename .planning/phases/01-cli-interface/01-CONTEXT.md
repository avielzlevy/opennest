# Phase 1: CLI Interface & Spec Input - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can invoke OpenNest via CLI with OpenAPI spec (URL or file path), configure output destination and directory structure, and select which generators to run. The CLI validates inputs and handles errors gracefully.

</domain>

<decisions>
## Implementation Decisions

### Spec Input Handling
- Support both remote URLs and local file paths (not URL-only or file-only)
- For unreachable URLs: Retry multiple times before failing (handle transient network issues)
- Fail gracefully on malformed/invalid specs with user-friendly error messages (no stack traces)
- Support OpenAPI 3.0+ only (3.0, 3.0.1, 3.0.2, 3.0.3, 3.1)

### Output Configuration
- Organize generated files by API domain/resource (e.g., output/users/, output/posts/)
- Store controllers, DTOs, decorators within each domain folder
- When files exist: Prompt user before overwriting (not silent, not skip)
- File naming: Schema-based (petstore.controller.ts, petstore.dto.ts) using operationId prefix

### Generator Selection
- Default behavior: Run all generators by default (DTOs, controllers, decorators, common)
- User selection: Use inclusive flags (--only-dto, --only-controller) to limit scope
- CommonGenerator: Claude discretion on whether to always run or treat as optional based on dependency analysis

### Help & Feedback
- --help output includes: usage examples, generator descriptions, documentation links, supported OpenAPI versions
- Verbosity: Minimal output by default, verbose details available via -v flag
- Always show generation summary (e.g., "Generated 3 DTOs, 2 controllers in 245ms")

</decisions>

<specifics>
## Specific Ideas

- CLI should feel like established tools (e.g., ts-node, nest-cli) — familiar to TypeScript developers
- Error messages should suggest corrective actions when possible (e.g., "Spec unreachable. Check URL or save locally and use file path.")
- Prompt for overwriting should be clear and non-destructive (show what would be replaced)

</specifics>

<deferred>
## Deferred Ideas

- Interactive prompts for generator selection — Phase could support this in future iteration
- Configuration files (.opennestrc) for defaults — future phase after CLI is stable
- Custom naming strategies — backlog

</deferred>

---

*Phase: 01-cli-interface*
*Context gathered: 2026-01-28*
