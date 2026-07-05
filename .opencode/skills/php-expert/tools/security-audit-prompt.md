# PHP Security Audit Prompt

You are conducting a security audit of a PHP application. Systematically check for vulnerabilities using OWASP Top 10 and PHP-specific attack vectors.

## Input

**Target:** {{file_path | directory | endpoint}}
**Framework:** {{laravel | symfony | codeigniter | wordpress | custom}}
**PHP version:** {{version}}
**Database:** {{mysql | postgresql | sqlite | none}}
**Auth mechanism:** {{session | jwt | oauth | basic | none}}

## Audit Checklist

### 1. SQL Injection (CWE-89)

- [ ] All queries use parameterized statements or prepared statements
- [ ] No string concatenation in SQL (`"SELECT * FROM users WHERE id = " . $id`)
- [ ] ORM usage does not bypass parameterization (raw queries audited)
- [ ] `LIKE` clauses escape `%` and `_` in user input
- [ ] `ORDER BY` / column names validated against allowlist (not parameterizable)
- [ ] Stored procedures reviewed for dynamic SQL

```php
// VULNERABLE
$db->query("SELECT * FROM users WHERE email = '$email'");

// SAFE
$stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
$stmt->execute([$email]);
```

### 2. Cross-Site Scripting (CWE-79)

- [ ] All output HTML-encoded by default (`htmlspecialchars($var, ENT_QUOTES, 'UTF-8')`)
- [ ] Template engine auto-escapes (Blade `{{ }}`, Twig `{{ }}`)
- [ ] Raw output (`{!! !!}`, `|raw`) audited and justified
- [ ] JSON output uses `JSON_HEX_TAG | JSON_HEX_AMP` flags
- [ ] Content-Security-Policy header set
- [ ] DOM manipulation with user input sanitized

### 3. Authentication & Session

- [ ] Passwords hashed with `password_hash()` (bcrypt/argon2id)
- [ ] No MD5/SHA1 for passwords
- [ ] Session ID regenerated on login (`session_regenerate_id(true)`)
- [ ] Session cookie flags: `HttpOnly`, `Secure`, `SameSite=Lax|Strict`
- [ ] Session timeout configured and enforced
- [ ] Brute force protection (rate limiting, account lockout)
- [ ] Timing-safe comparison for tokens (`hash_equals()`)
- [ ] CSRF tokens on all state-changing requests

### 4. File Upload & Include

- [ ] File uploads validated by content (magic bytes), not just extension
- [ ] Upload directory outside webroot or with `.htaccess` deny
- [ ] No user input in `include`/`require` paths
- [ ] `open_basedir` configured
- [ ] Filenames sanitized (no `../`, null bytes, special chars)
- [ ] File size limits enforced server-side
- [ ] Image uploads re-processed to strip EXIF/embedded payloads

### 5. Cryptography

- [ ] Using `random_bytes()` / `random_int()` (not `rand()`, `mt_rand()`)
- [ ] Encryption via `sodium_*` functions or `openssl_*` with AEAD
- [ ] No ECB mode, no bare `mcrypt_*`
- [ ] API keys/secrets in environment variables, not source code
- [ ] TLS 1.2+ enforced for external connections
- [ ] Key rotation mechanism exists

### 6. Deserialization (CWE-502)

- [ ] No `unserialize()` on user-controlled input
- [ ] If `unserialize()` required, use `allowed_classes` parameter
- [ ] Prefer `json_decode()` over `unserialize()` for data exchange
- [ ] Check for POP chains in autoloaded classes

### 7. Command Injection (CWE-78)

- [ ] No user input in `exec()`, `system()`, `shell_exec()`, `passthru()`, backticks
- [ ] If shell commands needed, use `escapeshellarg()` + `escapeshellcmd()`
- [ ] Prefer PHP-native functions over shell commands
- [ ] `proc_open()` uses array syntax (not string) for arguments

### 8. Information Disclosure

- [ ] `display_errors = Off` in production
- [ ] Custom error handler that logs but does not expose stack traces
- [ ] No `phpinfo()` accessible in production
- [ ] Version headers suppressed (`expose_php = Off`, server tokens)
- [ ] Debug/dev routes disabled in production
- [ ] `.env`, `.git/`, `composer.lock` not web-accessible

### 9. Access Control

- [ ] Authorization checks on every endpoint (not just authentication)
- [ ] IDOR prevention: verify ownership before returning resources
- [ ] Mass assignment protection (fillable/guarded in ORMs)
- [ ] Privilege escalation: role changes require re-authentication
- [ ] API endpoints enforce same authorization as web routes

### 10. Dependencies & Supply Chain

- [ ] `composer audit` shows no known vulnerabilities
- [ ] Lock file (`composer.lock`) committed and reviewed
- [ ] No abandoned/unmaintained packages in critical paths
- [ ] Autoloader does not scan user-writable directories
- [ ] Post-install scripts in dependencies reviewed

## Process

1. **Static scan**: Run automated tools first
   ```bash
   composer audit
   # phpstan with security rules
   vendor/bin/phpstan analyse --level=max
   # psalm taint analysis
   vendor/bin/psalm --taint-analysis
   ```

2. **Manual review**: Walk through each checklist item on critical paths (auth, payment, file handling)

3. **Dynamic testing**: Test actual requests for injection points

4. **Report**: Document findings by severity

## Output Format

```
## Summary
- Critical: [count]
- High: [count]
- Medium: [count]
- Low: [count]

## Findings

### [CRITICAL/HIGH/MEDIUM/LOW] [Title] (CWE-XXX)
- Location: [file:line]
- Description: [what's wrong]
- Impact: [what an attacker can do]
- Proof: [code snippet or reproduction]
- Fix: [specific remediation]

## Recommendations
- Immediate: [actions to take now]
- Short-term: [within sprint]
- Long-term: [architectural changes]
```

## Rules

- Severity based on impact + exploitability, not just presence.
- Every finding needs a concrete fix, not just "sanitize input."
- False positives noted as such -- do not pad the report.
- If taint analysis tooling is unavailable, state what was checked manually vs what needs tooling.
