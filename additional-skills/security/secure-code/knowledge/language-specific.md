---
type: fact
title: "Language-Specific Secure Coding"
---

# Language-Specific Secure Coding

## Go

### Memory Safety
- No buffer overflows (bounds-checked slices and arrays)
- No use-after-free (garbage collected)
- Goroutine safety requires explicit synchronization

### Common Pitfalls
- Integer overflow: Go doesn't panic on overflow, wraps silently
- Race conditions: use `-race` flag in tests, always
- Slice aliasing: appending to a slice may or may not create a new backing array
- Error handling: unchecked errors hide failures silently

### Secure Patterns
```go
// Always validate and bound-check user input
func ParseAge(input string) (int, error) {
    age, err := strconv.Atoi(input)
    if err != nil {
        return 0, fmt.Errorf("invalid age: %w", err)
    }
    if age < 0 || age > 150 {
        return 0, fmt.Errorf("age out of range: %d", age)
    }
    return age, nil
}
```

### Dependency Security
- Use `go mod verify` to check checksums
- Pin with go.sum (automatic)
- `govulncheck` for known vulnerability scanning
- Prefer stdlib: `crypto/*`, `net/http`, `encoding/json`

## Python

### Common Vulnerabilities
- `eval()` / `exec()`: never with user input, use AST literal_eval for data
- `pickle` deserialization: arbitrary code execution, never unpickle untrusted data
- YAML `load()` vs `safe_load()`: always use safe_load
- Template injection: Jinja2 sandboxed environment for user templates
- SQL injection: always use parameterized queries, never f-strings in SQL

### Type Safety as Security
- Type hints + mypy/pyright catch None dereferences, wrong types
- Pydantic for input validation at boundaries
- dataclasses with `__post_init__` validation

### Secure Patterns
```python
# Input validation with Pydantic
from pydantic import BaseModel, Field, field_validator

class UserInput(BaseModel):
    email: str = Field(max_length=254)
    age: int = Field(ge=0, le=150)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v or ".." in v:
            raise ValueError("Invalid email format")
        return v.lower().strip()
```

### Dependency Security
- `pip-audit` for known vulnerabilities
- Pin exact versions in requirements.txt or poetry.lock
- Use `--require-hashes` for supply chain integrity
- Virtual environments isolate project dependencies

## TypeScript / JavaScript

### Common Vulnerabilities
- Prototype pollution: `Object.create(null)` for dictionaries, or Map
- ReDoS: catastrophic backtracking in regex, use `re2` for user patterns
- XSS: framework auto-escaping (React JSX), but dangerouslySetInnerHTML bypasses it
- SSRF: validate URLs before fetch, allowlist schemes and hosts
- Path traversal: never join user input with `path.join` without validation

### Secure Patterns
```typescript
// Input validation at API boundary
import { z } from "zod";

const CreateUserSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().min(1).max(100).trim(),
  role: z.enum(["viewer", "editor"]),
});

type CreateUserInput = z.infer<typeof CreateUserSchema>;

function createUser(raw: unknown): CreateUserInput {
  return CreateUserSchema.parse(raw); // throws on invalid
}
```

### Dependency Security
- `npm audit` / `pnpm audit` in CI
- Lockfile integrity: commit package-lock.json / pnpm-lock.yaml
- Use `--ignore-scripts` for untrusted packages
- Avoid postinstall scripts in published packages
- Socket.dev or Snyk for supply chain monitoring

### Runtime Protections
- CSP headers prevent inline script execution
- SameSite cookies prevent CSRF
- Subresource Integrity (SRI) for CDN scripts
- Node.js permission model (--experimental-permission) for filesystem/network

## Rust

### Memory Safety by Design
- Ownership system prevents use-after-free, double-free, data races at compile time
- No null pointers: `Option<T>` forces explicit handling
- No exceptions: `Result<T, E>` forces error handling
- Borrow checker prevents aliased mutability

### Where Rust Still Needs Care
- `unsafe` blocks: bypass borrow checker, audit carefully
- Integer overflow: panics in debug, wraps in release (use `checked_*` methods)
- Logic bugs: type system can't prevent all vulnerabilities
- FFI boundaries: calling C code inherits C's unsafety
- `mem::transmute`: type-punning can violate invariants

### Secure Patterns
```rust
// Explicit overflow handling
fn safe_multiply(a: u64, b: u64) -> Option<u64> {
    a.checked_mul(b)
}

// Newtype pattern prevents parameter confusion
struct UserId(u64);
struct OrderId(u64);

fn get_order(user: UserId, order: OrderId) -> Result<Order, Error> {
    // Can't accidentally swap user_id and order_id
    todo!()
}
```

### Dependency Security
- `cargo audit` for known vulnerabilities
- `cargo deny` for license and source policy enforcement
- `cargo vet` for supply chain review tracking
- Minimal `unsafe` surface: prefer safe abstractions

## Cross-Language Patterns

### Input Validation
- Validate at system boundaries (API handlers, message consumers)
- Allowlist over denylist
- Validate type, length, range, format
- Reject early, before any processing

### Secret Handling
- Never log secrets (mask in error messages)
- Use constant-time comparison for tokens/hashes
- Zero memory after use where language allows
- Environment variables or secret manager, never source code

### Error Handling
- Never expose stack traces to users
- Log detailed errors internally, return generic messages externally
- Distinguish client errors (4xx) from server errors (5xx)
- Structured logging with correlation IDs, without sensitive data

### Dependency Management
- Minimal dependency tree (fewer deps = smaller attack surface)
- Audit transitive dependencies, not just direct
- Automated updates with CI verification (Dependabot, Renovate)
- SBOM generation for supply chain visibility
