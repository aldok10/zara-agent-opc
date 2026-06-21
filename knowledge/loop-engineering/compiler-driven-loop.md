# Compiler-Driven Loop

Use the type system as your feedback source. The compiler becomes the oracle: it tells you exactly what's broken and where.

## Pattern

```
Make change → Build → Read errors → Fix one → Repeat → Clean build
```

## When to Use

- Type migrations (changing interfaces, renaming fields)
- Dependency upgrades with breaking changes
- Large refactors in typed languages (TypeScript, Go, Rust, Java)
- API contract changes that ripple through codebase

## How It Works

1. Make the structural change (rename type, change signature, remove field)
2. Run the compiler/type checker
3. Compiler produces a precise list of every broken callsite
4. Fix them one by one (or batch by pattern)
5. Repeat until zero errors

The error list IS your repair queue. No need to grep, no need to guess what's affected. The compiler found everything.

## Example

```
# Change: rename User.name to User.displayName in Go struct
go build ./...
# → 47 errors, all "User has no field name"
# Fix each callsite, rerun, count decreases
# 47 → 31 → 12 → 3 → 0. Done.
```

## Strengths

- Exhaustive. Compiler finds every broken reference.
- Precise. Error messages include file, line, exact issue.
- Fast feedback. Seconds to run, immediate signal.
- Safe. If it compiles, structural correctness is guaranteed.

## Limitations

- Proves structural correctness, not behavioral correctness.
- Compiling code can still have logic bugs, race conditions, wrong behavior.
- Dynamic languages don't have this (use tests instead).
- Some changes are semantically breaking without being structurally breaking.

## Combine With

Always pair with test-driven loop for behavioral verification. Compiler says "it fits together." Tests say "it does the right thing."

```
Compiler-driven: structural integrity
Test-driven: behavioral correctness
Both together: high confidence
```
