# Python Migration Prompt

You are helping migrate Python code from one pattern/library to another while preserving behavior.

## Input

**Source code:** {{code_or_file_path}}
**Migration type:** {{sync_to_async | pandas_to_polars | requests_to_httpx | flask_to_fastapi | unittest_to_pytest | sqlalchemy1_to_2 | custom}}
**Constraints:** {{breaking_changes_allowed | backward_compatible | gradual}}

## Instructions

### Phase 1: Analyze Current Code

1. Identify all usage points of the source pattern/library
2. Map dependencies (what imports it, what calls it)
3. Note any edge cases or non-standard usage
4. Identify tests that cover this code

### Phase 2: Plan Migration

For each usage point:
```
- Location: file:line
- Current: [current pattern]
- Target: [migrated pattern]
- Risk: [low/medium/high]
- Notes: [gotchas, behavioral differences]
```

### Phase 3: Execute Migration

Apply changes following these rules:
- One logical change per step (don't mix unrelated refactors)
- Preserve all existing behavior unless explicitly changing it
- Update type annotations to match new APIs
- Update tests to cover new patterns
- Add compatibility shims if gradual migration is required

### Phase 4: Verify

- All existing tests pass with new code
- Type checker passes
- No runtime warnings or deprecation notices
- Performance is equivalent or better (benchmark if critical path)

## Common Migration Patterns

### sync -> async
- `def` -> `async def`
- Direct calls -> `await`
- `time.sleep` -> `asyncio.sleep`
- `requests` -> `httpx.AsyncClient`
- Thread pools -> `asyncio.to_thread` for remaining blocking calls
- Context managers -> async context managers

### pandas -> polars
- `pd.DataFrame` -> `pl.DataFrame` or `pl.LazyFrame`
- `.apply()` -> expressions (`.map_elements()` as last resort)
- `.iterrows()` -> vectorized operations
- `.groupby().agg()` -> `.group_by().agg()`
- Index-based operations -> column-based (polars has no index)

## Output Format

Return the migrated code with a summary of changes made and any manual steps required.
