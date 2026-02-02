---
phase: 08-private-npm-package-distribution
plan: 01
subsystem: infra
tags: [npm, github-packages, package-registry, scoped-packages]

# Dependency graph
requires:
  - phase: 06-documentation-release
    provides: README, CHANGELOG, CONTRIBUTING documentation for package distribution
provides:
  - Scoped package name @anthropics/opennest configured for GitHub Package Registry
  - Files whitelist excluding tests and development artifacts
  - Correct entry points for compiled TypeScript structure
  - Package size optimized (65.6 kB tarball)
affects: [08-02, 08-03, 08-04, 08-05, package-publishing, npm-distribution]

# Tech tracking
tech-stack:
  added: []
  patterns: [scoped-package-naming, files-whitelist-pattern, npm-tarball-optimization]

key-files:
  created: []
  modified:
    - package.json: scoped name, files whitelist, corrected entry points
    - src/cli/argument-parser.ts: updated documentation URLs

key-decisions:
  - "Use @anthropics scope for GitHub Package Registry requirement"
  - "Keep CLI command name as 'opennest' (unscoped) for user convenience"
  - "Whitelist only dist/src for published package (exclude tests/fixtures)"
  - "Update entry points to dist/src/cli.js matching TypeScript compilation output"

patterns-established:
  - "Files whitelist pattern: include only compiled source, docs, and metadata"
  - "Scoped package naming: @org/package for GPR, unscoped command for CLI"
  - "Entry point correction: match actual TypeScript compilation structure"

# Metrics
duration: 15min
completed: 2026-02-02
---

# Plan 08-01: Configure package.json for Scoped NPM Distribution Summary

**Scoped package @anthropics/opennest configured with optimized 65.6 kB tarball excluding tests and fixtures**

## Performance

- **Duration:** 15 min
- **Started:** 2026-02-02T[execution-start]
- **Completed:** 2026-02-02T[execution-end]
- **Tasks:** 6
- **Files modified:** 2

## Accomplishments
- Package renamed to @anthropics/opennest for GitHub Package Registry compliance
- Files whitelist configured to exclude test artifacts (reduced from 175.6 kB to 65.6 kB)
- Entry points corrected to match TypeScript compilation output (dist/src/cli.js)
- Documentation URLs updated to anthropics/opennest repository
- Dry run publish verification confirms correct package structure

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename package to scoped name** - `a3a0b5d` (chore)
2. **Task 2: Add files whitelist** - `c539b78` (chore)
3. **Task 3: Verify repository configuration** - No commit (verification only)
4. **Task 4: Verify prepublishOnly hook** - No commit (verification only)
5. **Task 5: Test dry run publish & refine whitelist** - `924f2b0` (fix)
6. **Task 6: Update documentation URLs** - `37ab22e` (docs)

## Files Created/Modified
- `package.json` - Scoped name, files whitelist, corrected main/bin entry points
- `src/cli/argument-parser.ts` - Updated GitHub URLs from placeholder to anthropics repo

## Decisions Made

1. **Scoped package name**: Changed from "opennest" to "@anthropics/opennest" - GitHub Package Registry requires scoped names for organization packages

2. **CLI command remains unscoped**: Binary name stays "opennest" not "@anthropics/opennest" - users run `opennest`, npm handles the scoping

3. **Files whitelist refinement**: Initial whitelist included test files. Refined to `dist/src/**/*.js` only, excluding:
   - dist/tests/ (compiled test files)
   - dist/test*/ (test output directories)
   - dist/generated/ (test fixtures)
   - Reduced package size by 110 kB (62.5% reduction)

4. **Entry point correction**: Updated main and bin from `dist/cli.js` to `dist/src/cli.js` - TypeScript compilation with `include: ["**/*.ts"]` outputs src/cli.ts to dist/src/cli.js, not dist/cli.js

5. **Documentation URLs**: Updated from placeholder example.com to actual anthropics/opennest repository

## Deviations from Plan

### Auto-fixed Issues

**1. Entry point mismatch**
- **Found during:** Task 5 (Test dry run publish)
- **Issue:** package.json referenced dist/cli.js but TypeScript compiles to dist/src/cli.js
- **Fix:** Updated main and bin fields to dist/src/cli.js matching actual compilation output
- **Files modified:** package.json
- **Verification:** npm pack --dry-run succeeds, correct files included
- **Committed in:** 924f2b0 (Task 5 commit)

**2. Files whitelist too broad**
- **Found during:** Task 5 (Test dry run publish)
- **Issue:** Initial whitelist included entire dist/ folder (tests, fixtures, 175.6 kB tarball)
- **Fix:** Refined to dist/src only with negation patterns for test artifacts
- **Files modified:** package.json
- **Verification:** npm pack --dry-run shows 65.6 kB tarball with only source code
- **Committed in:** 924f2b0 (Task 5 commit)

---

**Total deviations:** 2 auto-fixed (both discovered during dry-run testing)
**Impact on plan:** Both fixes necessary for correct package structure. No scope creep - refinements to meet plan objectives.

## Issues Encountered

None - dry run testing caught issues before publishing

## Next Phase Readiness

- Package structure configured and verified for GitHub Package Registry
- Ready for Plan 08-02 (Create .npmrc for GPR authentication)
- Tarball contents validated, size optimized
- Entry points correct, binary accessible

---
*Phase: 08-private-npm-package-distribution*
*Plan: 08-01*
*Completed: 2026-02-02*
