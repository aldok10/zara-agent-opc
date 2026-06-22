# Subskill: Security

> Activate when: auth, crypto, TLS, injection, secret, CORS, input validation, token, JWT, CSRF, XSS, sanitize, permission
>
> Prevents mistakes: #46, #78, #81 (100 Go Mistakes - input handling, SQL, HTTP defaults)

**Senior DNA**: Stdlib first (`crypto/rand`, `crypto/tls`, `crypto/sha256`, `net/http` timeouts - no security framework needed). "It depends" - an internal tool behind VPN has different threat model than public API. Match security investment to actual attack surface. Simple defense > complex security theater.

## Philosophy

- Simple defense beats complex security theater.
- Input is guilty until proven innocent.
- Secrets belong in environment, never in code.
- crypto/rand always. math/rand never for security.

## Input Validation

```go
// Parse, don't validate
func ParseUserID(s string) (UserID, error) {
    id, err := strconv.ParseInt(s, 10, 64)
    if err != nil || id <= 0 {
        return 0, fmt.Errorf("invalid user ID: %q", s)
    }
    return UserID(id), nil
}

// Type system prevents invalid states
type Email string
func ParseEmail(s string) (Email, error) { ... }
```

## SQL Injection Prevention

```go
// ALWAYS parameterized - never string concat
row := db.QueryRowContext(ctx, "SELECT * FROM users WHERE id = ?", id)

// BAD - injectable
query := "SELECT * FROM users WHERE name = '" + name + "'"
```

## Crypto Patterns

```go
// Generate secure random tokens
token := make([]byte, 32)
if _, err := crypto_rand.Read(token); err != nil { panic(err) }
encoded := base64.URLEncoding.EncodeToString(token)

// Password hashing (use golang.org/x/crypto/bcrypt)
hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
err := bcrypt.CompareHashAndPassword(hash, []byte(input))

// Constant-time comparison (prevent timing attacks)
if !hmac.Equal(expectedMAC, messageMAC) { ... }
// Or: crypto/subtle.ConstantTimeCompare
```

## TLS Configuration

```go
tlsCfg := &tls.Config{
    MinVersion: tls.VersionTLS13,
    // Go 1.26+: post-quantum enabled by default
    // CipherSuites auto-selected for TLS 1.3
}
```

## Secret Management

```go
// Load from environment
dbURL := os.Getenv("DATABASE_URL")
if dbURL == "" {
    log.Fatal("DATABASE_URL not set")
}

// Never log secrets
slog.Info("connecting", "host", host) // NOT the full DSN with password
```

## HTTP Security Headers

```go
func SecurityHeaders(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("X-Content-Type-Options", "nosniff")
        w.Header().Set("X-Frame-Options", "DENY")
        w.Header().Set("Strict-Transport-Security", "max-age=63072000")
        next.ServeHTTP(w, r)
    })
}
```

## Rate Limiting

```go
import "golang.org/x/time/rate"

limiter := rate.NewLimiter(rate.Every(time.Second), 10) // 10 req/sec

func rateLimitMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if !limiter.Allow() {
            http.Error(w, "rate limited", http.StatusTooManyRequests)
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

## os.Root (Go 1.24+ - path traversal prevention)

```go
root, err := os.OpenRoot("/var/data")
f, err := root.Open(userProvidedPath) // can't escape /var/data
```

## FIPS 140-3 (Go 1.24+)

```go
import "crypto/fips140"
// Enforced mode: only FIPS-approved algorithms
// Set via GOFIPS140=1 environment variable
```

## Common Vulnerabilities

| Vulnerability | Prevention |
|---------------|-----------|
| SQL injection | Parameterized queries always |
| Path traversal | `filepath.Clean` + `os.Root` |
| SSRF | Allowlist target hosts |
| Timing attack | `subtle.ConstantTimeCompare` |
| Insecure random | `crypto/rand` not `math/rand` |
| Hardcoded secrets | Environment variables |
| Missing TLS | `tls.Config{MinVersion: tls.VersionTLS13}` |

## Delegates To

- **architecture** - when auth patterns need design changes
- **observability** - when security events need logging

## Examples

Reference: `examples/stdlib/01-http-routing-122/` (shows middleware pattern)
