# Subskill: Secure Coding

> Activate when: injection, SQL, XSS, command injection, SSTI, CSRF, deserialization, file upload, path traversal, SSRF, sanitize, escape.

**Core**: Most vulnerabilities are injection at a boundary. Separate code from data, validate input, encode output for its context. Never build interpreted strings from untrusted input.

## Injection Prevention (OWASP A04)

The universal rule: **keep untrusted data out of the interpreter's control plane.** Parameterize, escape, or sandbox — never concatenate.

### SQL Injection
- Always parameterized queries / prepared statements. Never string-concat user input into SQL.
- ORMs help but raw fragments (`.raw()`, `WHERE ${x}`) reintroduce risk. Allowlist column/table names (can't be parameterized).

### XSS (Cross-Site Scripting)
- Contextual output encoding: HTML body, attribute, JS, URL each need different escaping.
- Prefer auto-escaping template engines; avoid `innerHTML`/`dangerouslySetInnerHTML`. Sanitize rich HTML with DOMPurify.
- Backstop with CSP (nonce/hash-based).

### Command Injection
- Avoid shelling out. If required, pass args as an array (no shell interpretation), never interpolate into a shell string. Allowlist the command + args.

### SSTI (Server-Side Template Injection)
- Never render user input as a template. Pass user data as template *variables*, not template *source*. Use sandboxed/logic-less templates.

## Language-Specific Patterns

| Lang | Pattern |
|------|---------|
| **Go** | `crypto/rand` (not `math/rand`) for secrets; `db.QueryContext(ctx, q, args...)`; `os.Root` (1.24+) for path safety; `html/template` auto-escapes |
| **Python** | Parameterize: `cur.execute("... WHERE id=%s", (id,))`; `subprocess.run([...], shell=False)`; `defusedxml`; `yaml.safe_load` |
| **TypeScript** | **Zod** (or valibot) schema validation at every boundary; parameterized query builders; avoid `eval`/`Function` |
| **PHP** | PDO prepared statements with bound params; `htmlspecialchars()` on output; `password_hash()` (argon2id) |

## CSRF Protection

- SameSite=Strict/Lax cookies + anti-CSRF token (synchronizer or double-submit) on state-changing requests.
- Verify `Origin`/`Referer` for sensitive actions. Not needed for pure token-in-header APIs (no ambient cookie auth).

## Deserialization Safety

- Never deserialize untrusted data into arbitrary objects (RCE risk: Python pickle, PHP unserialize, Java native).
- Use data-only formats (JSON) with schema validation. If binary needed, use safe formats (protobuf) with strict typing.

## File Upload Validation

- Validate type by content (magic bytes), not extension or client `Content-Type`. Enforce size limits.
- Store outside webroot with generated names; never execute uploaded files. Scan for malware. Serve with `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff`.

## Path Traversal Prevention

- Canonicalize then verify the resolved path stays within the allowed base (`filepath.Clean` + prefix check, or Go `os.Root`).
- Reject `..`, absolute paths, null bytes. Prefer opaque IDs mapped to paths over raw filenames.

## SSRF (A10)

- Allowlist outbound target hosts/schemes. Block private/link-local ranges (169.254.0.0/16, 10/8, 127/8, metadata endpoints).
- Re-validate after DNS resolution (defeat rebinding). Disable redirects to internal targets.

## Verification

- No string-built queries/commands/templates from user input.
- Input validated + output encoded at every boundary.
- SAST clean; injection-focused unit tests present.

## Delegates To

- **api-security** — boundary validation, encoding at the edge.
- **language expert skill** — idiomatic implementation.
