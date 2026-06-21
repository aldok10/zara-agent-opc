# Subskill: Code Review

> Activate when: review, smell, refactor, naming, readability, simplify, debt, cleanup, improve, quality
>
> Prevents mistakes: #1-#54 (100 Go Mistakes — all code-level issues)

**Senior DNA**: "It depends" — not all code needs to be perfect. Hot paths need optimization; cold paths need readability. A 3-month prototype has different quality bar than a 5-year library. Review for: will this break at 3am? Can a new hire understand it? Is this solving a real problem? Prefer deleting code over adding abstractions.

## Philosophy

- If it can be simpler, make it simpler.
- Code is written once, read a hundred times.
- Delete first. Add second. Only if you must.
- Consistency is the closest thing to correctness.

## Review Checklist

### Correctness
- [ ] Does it handle errors properly? (no `_ = err`)
- [ ] Are concurrent accesses safe? (race detector passes)
- [ ] Are edge cases handled? (nil, empty, zero values)
- [ ] Is context propagated correctly?

### Readability
- [ ] Can a stranger understand this in 30 seconds?
- [ ] Are names descriptive and consistent?
- [ ] Is the function <50 lines? (split if longer)
- [ ] Are comments explaining "why", not "what"?

### Simplicity
- [ ] Can anything be deleted?
- [ ] Is there premature abstraction? (interface for 1 impl)
- [ ] Is there speculative generality? ("just in case" code)
- [ ] Could stdlib replace a dependency?

### Performance (only if on hot path)
- [ ] Unnecessary allocations?
- [ ] Missing pre-allocation for known-size slices?
- [ ] Fmt.Sprintf on hot path? (use strconv.Append*)
- [ ] Interface boxing in tight loops?

## Common Code Smells in Go

| Smell | Fix |
|-------|-----|
| Function >50 lines | Extract sub-functions |
| >3 parameters | Introduce config struct or functional options |
| Nested if >3 levels | Guard clauses (early return) |
| `interface{}` / `any` everywhere | Use generics or concrete types |
| Stuttering names (`user.UserName`) | `user.Name` |
| Package named `util`, `common`, `helper` | Name by what it does |
| Exported types/funcs unused outside pkg | Unexport them |
| `init()` function | Explicit initialization |
| Commented-out code | Delete it (git remembers) |
| `sync.Mutex` in exported struct field | Make it private |

## Naming Conventions

```go
// Packages: short, lowercase, no underscores
package httputil   // good
package http_util  // bad
package HTTPUtil   // bad

// Variables: camelCase, descriptive
userCount := len(users)  // good
uc := len(users)         // bad (unclear)
n := len(users)          // ok in small scope

// Interfaces: -er suffix for single method
type Reader interface { Read([]byte) (int, error) }
type Validator interface { Validate() error }

// Acronyms: all caps or all lower
userID   // good
userId   // bad
httpURL  // good
httpUrl  // bad

// Unexported = private to package
type server struct { ... }  // internal
type Server struct { ... }  // exported API
```

## Guard Clause Pattern

```go
// BAD: deep nesting
func process(u *User) error {
    if u != nil {
        if u.Active {
            if u.Age > 18 {
                // actual logic
            }
        }
    }
    return nil
}

// GOOD: early returns
func process(u *User) error {
    if u == nil {
        return ErrNilUser
    }
    if !u.Active {
        return ErrInactive
    }
    if u.Age <= 18 {
        return ErrUnderage
    }
    // actual logic — no nesting
    return nil
}
```

## Refactoring Signals

When to refactor:
- Same pattern copy-pasted 3+ times → extract
- Function does 2 things → split
- Test is hard to write → design problem
- Change requires touching 5+ files → shotgun surgery smell

When NOT to refactor:
- "Might need this later" → YAGNI
- Code works and isn't changing → leave it
- No tests covering it → write tests first

## 50 Shades of Go Pitfalls (Common Review Catches)

- Variable shadowing with `:=` in new block
- `defer resp.Body.Close()` before error check
- Map iteration order is random
- Slice hidden data (sub-slice shares backing array)
- `json.Encoder` adds newline
- JSON numbers unmarshal as float64 into interface{}
- Unexported struct fields not encoded
- WaitGroup passed by value (must be pointer)
- Sending to closed channel panics
- nil channel blocks forever

## Delegates To

- **performance** — when review finds allocation issues
- **concurrency** — when review finds race conditions
- **security** — when review finds vulnerabilities
- **architecture** — when review finds structural issues

## References

- [golang50shades.com](https://golang50shades.com/) — 50+ traps and gotchas
- [github.com/uber-go/guide](https://github.com/uber-go/guide) — Uber style guide
- [google.github.io/styleguide/go](https://google.github.io/styleguide/go) — Google decisions
