---
name: golang-compare
description: Compare Go code quality with and without golang-expert skill applied. Use when asked to demonstrate skill value, review existing code against standards, or benchmark code quality improvement.
---

# Go Code Comparison — With vs Without Skill

Produce TWO versions of any Go code task to demonstrate golang-expert skill value.

## Version A: Without Skill (Naive AI Output)

Write code as a generic AI would — functional but missing:
- No pre-allocation
- No timeout on HTTP clients
- Missing return after http.Error
- Interfaces at producer side
- Mutable globals
- No error wrapping context
- defer in loops
- fire-and-forget goroutines
- No field tags
- String concatenation with +=
- Embedded mutex in exported struct

## Version B: With Skill (golang-expert Applied)

Apply all SKILL.md rules + Uber 40 rules + 100 Mistakes guard rails:
- Pre-allocated containers
- Timeouts everywhere
- Proper error handling (wrap once, return after http.Error)
- Interfaces at consumer
- Dependency injection
- Goroutine lifecycle management
- Field tags on all marshaled structs
- strings.Builder with Grow
- `var _ Interface = (*Type)(nil)` checks
- Private mutex field
- Defensive copies at boundaries

## Output Format

```markdown
## Without golang-expert skill

[code]

### Problems (auto-detected):
- [ ] Mistake #N: description
- [ ] Uber Rule #N violated: description

---

## With golang-expert skill

[code]

### Improvements applied:
- [x] Rule description (source)

### Metrics:
- Mistakes prevented: N
- Uber rules followed: N/40
- Potential production issues avoided: N
```

## Reference Example

See `examples/http-handler-compare.md` for a complete HTTP handler comparison demonstrating all patterns.

## Related Knowledge (load on demand)

- `knowledge_load(section: "code-smells")` — identify smells in Version A
- `knowledge_load(section: "principles")` — SOLID violations to flag
- `knowledge_search("refactoring")` — techniques for Version B improvements
