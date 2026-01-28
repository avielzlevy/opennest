# Error Handling Pattern: Lenient Mode

## Philosophy

Phase 2 uses **lenient error handling**: never crash on malformed data, always attempt to generate
a usable operation name, and track skipped operations separately.

## Pattern Overview

```
┌─ Parse operationId
│
├─ Is it invalid/missing?
│  └─ YES: Generate fallback from path
│  └─ NO: Detect convention and normalize
│
├─ Success?
│  └─ YES: Return result with operation name
│  └─ NO: Return result with fallback (path-based)
│
└─ Never throw, always return OperationNameParseResult
```

## Key Rules

1. **No crashes on malformed input**
   - Null/undefined operationId → fallback
   - Invalid characters → sanitize
   - Parse errors → fallback + warning
   - Unrecognized convention → treat as single name

2. **Track all decisions**
   - Record warnings for each operation
   - Track which operations used fallback
   - Log sanitization events
   - Maintain decision trail for debugging

3. **Consistent output**
   - All operation names normalized to camelCase
   - All results are valid TypeScript identifiers
   - All results follow pattern: [a-z_$][a-z0-9_$]*

4. **Graceful degradation**
   - Spec issues don't prevent entire parse
   - Individual operation failures don't block others
   - Always return something usable, even if not ideal

## Integration Points

### Operation Parser
- Coordinates convention detection and fallback
- Returns `OperationNameParseResult` for each operation
- Returns `ParseSpecOperationsResult` for entire spec

### Spec Traversal (Phase 3)
- Consumes `ParseSpecOperationsResult`
- Groups operations by tag/resource
- Handles skipped operations separately

### CLI Error Handler
- Displays warnings to user
- Lists skipped operations with reasons
- Uses --verbose flag for detailed parsing info
