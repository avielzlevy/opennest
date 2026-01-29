/**
 * Jest setup file for OpenNest test suite
 *
 * Purpose:
 * - Configure global test timeouts for unit and integration tests
 * - Set up snapshot serialization for deterministic output
 * - Provide custom matchers and helpers for AST validation
 */

// Set default test timeout (5 seconds for unit tests)
jest.setTimeout(5000);

// Custom snapshot serializer for sorting object keys (deterministic snapshots)
expect.addSnapshotSerializer({
  test: (val) => val && typeof val === 'object' && !Array.isArray(val),
  print: (val, serialize) => {
    const obj = val as Record<string, unknown>;
    const sorted = Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = obj[key];
        return acc;
      }, {} as Record<string, unknown>);
    return serialize(sorted);
  },
});

// Helper: Normalize whitespace in generated code for snapshot comparison
export function normalizeCode(code: string): string {
  return code
    .trim()
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n');
}

// Helper: Extract imports from generated code (for partial matching)
export function extractImports(code: string): string[] {
  const importRegex = /^import\s+.+\s+from\s+['"].+['"];?$/gm;
  return (code.match(importRegex) || []).sort();
}

// Helper: Extract class/interface names from generated code
export function extractTypeNames(code: string): string[] {
  const typeRegex = /(?:export\s+)?(?:class|interface|type|enum)\s+(\w+)/g;
  const matches: string[] = [];
  let match;
  while ((match = typeRegex.exec(code)) !== null) {
    matches.push(match[1]);
  }
  return matches.sort();
}

/**
 * Snapshot Testing Guidelines:
 *
 * 1. Snapshot file location: tests/__snapshots__/
 * 2. Update snapshots: `npm test -- -u` (ONLY for intentional changes)
 * 3. Review snapshots: ALWAYS review snapshot diffs in PRs
 * 4. Serialization: Snapshots are pretty-printed for readability
 *
 * Example usage:
 * ```typescript
 * import { normalizeCode } from './jest-setup';
 *
 * test('generates DTO', () => {
 *   const code = generator.generate(spec);
 *   expect(normalizeCode(code)).toMatchSnapshot();
 * });
 * ```
 */
