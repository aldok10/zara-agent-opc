---
type: fact
title: "Injection Prevention"
---

# Injection Prevention

Comprehensive guide to preventing SQL, XSS, command, and template injection vulnerabilities.

## SQL Injection

### The Problem
Untrusted input concatenated into SQL queries allows attackers to modify query logic.

```sql
-- Vulnerable (string concatenation)
SELECT * FROM users WHERE id = '" + userId + "'
-- Attack: userId = "1' OR '1'='1"
-- Result: SELECT * FROM users WHERE id = '1' OR '1'='1'
```

### Prevention: Parameterized Queries

Every language/framework has parameterized query support. Use it unconditionally.

**Node.js (pg):**
```typescript
const result = await pool.query(
  'SELECT * FROM users WHERE id = $1 AND status = $2',
  [userId, status]
);
```

**Go (database/sql):**
```go
row := db.QueryRowContext(ctx, "SELECT * FROM users WHERE id = $1", userID)
```

**Python (psycopg):**
```python
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```

### ORM Pitfalls

ORMs prevent SQL injection by default, but raw queries bypass protection:
```typescript
// SAFE: ORM parameterizes automatically
await db.user.findFirst({ where: { id: userId } });

// VULNERABLE: raw query with interpolation
await db.$queryRaw(`SELECT * FROM users WHERE id = '${userId}'`);

// SAFE: raw query with parameterization
await db.$queryRaw(Prisma.sql`SELECT * FROM users WHERE id = ${userId}`);
```

### Dynamic SQL Patterns (Safe)

When query structure must vary (ORDER BY, table names):
```typescript
const ALLOWED_SORT_FIELDS = new Set(['name', 'created_at', 'email']);
const ALLOWED_DIRECTIONS = new Set(['ASC', 'DESC']);

function buildOrderClause(field: string, direction: string): string {
  if (!ALLOWED_SORT_FIELDS.has(field)) throw new Error('Invalid sort field');
  if (!ALLOWED_DIRECTIONS.has(direction)) throw new Error('Invalid direction');
  return `ORDER BY ${field} ${direction}`;
}
```

## Cross-Site Scripting (XSS)

### Context-Aware Output Encoding

The encoding depends on WHERE the output appears:

| Context | Encoding | Example |
|---------|----------|---------|
| HTML body | HTML entity encode | `<` becomes `&lt;` |
| HTML attribute | Attribute encode | `"` becomes `&quot;` |
| JavaScript string | JS string encode | `'` becomes `\x27` |
| URL parameter | URL encode | `&` becomes `%26` |
| CSS value | CSS encode | `(` becomes `\28` |

### Framework Protections

Modern frameworks auto-encode by default -- but have escape hatches:

**React:** Auto-escapes JSX. Dangerous: `dangerouslySetInnerHTML`
**Vue:** Auto-escapes `{{ }}`. Dangerous: `v-html`
**Angular:** Auto-sanitizes. Dangerous: `bypassSecurityTrustHtml()`
**Go templates:** `html/template` auto-escapes. Dangerous: `template.HTML()`

### Content Security Policy (CSP)

Defense-in-depth even if XSS exists:
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{random}';
  style-src 'self' 'nonce-{random}';
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

Nonce-based: each page load generates random nonce, only scripts with matching nonce execute.

### DOM-Based XSS

Client-side JavaScript moving untrusted data into dangerous sinks:

**Dangerous sinks:**
- `element.innerHTML`
- `document.write()`
- `eval()`
- `setTimeout/setInterval` with string argument
- `location.href` assignment (javascript: protocol)
- `.setAttribute('onclick', ...)`

**Safe alternatives:**
- `element.textContent` instead of `innerHTML`
- Template literals with proper encoding
- `addEventListener` instead of inline handlers
- URL validation before location assignment

## Command Injection

### The Problem
User input passed to shell commands allows arbitrary command execution.

```typescript
// VULNERABLE
exec(`convert ${filename} output.png`);
// Attack: filename = "; rm -rf /"
```

### Prevention

**Use execFile/spawn with argument arrays (no shell interpretation):**
```typescript
import { execFile } from 'node:child_process';
execFile('convert', [filename, 'output.png'], (error, stdout) => {
  // filename is a single argument, not shell-interpreted
});
```

**Go:**
```go
cmd := exec.CommandContext(ctx, "convert", filename, "output.png")
```

**Python:**
```python
import subprocess
subprocess.run(["convert", filename, "output.png"], check=True)
# shell=False is the default -- NEVER set shell=True with user input
```

### When Shell is Required

If you must use shell features (pipes, redirects):
1. Validate input against strict allowlist (alphanumeric + limited chars)
2. Use shell escaping functions (but prefer argument arrays)
3. Run in sandboxed environment with minimal permissions

## Template Injection (SSTI)

### The Problem
User input rendered as template code executes on the server.

```python
# VULNERABLE
template = Template(f"Hello {user_input}")
# Attack: user_input = "{{config.SECRET_KEY}}"
```

### Prevention

1. Never pass user input as part of the template string
2. Pass user input as template variables only:
```python
# SAFE: user_input is data, not code
template = Template("Hello {{name}}")
template.render(name=user_input)
```

3. Use sandboxed template engines (Jinja2 sandbox mode)
4. Restrict template functionality in user-facing templates
5. If users must create templates: use logic-less formats (Mustache)

## Prompt Injection (2026 Addition)

### The Problem
User input mixed with system prompts allows manipulation of LLM behavior.

### Prevention Patterns
- Separate system instructions from user content with clear delimiters
- Validate and sanitize user input before including in prompts
- Use structured output formats (JSON mode) to constrain responses
- Implement output validation -- don't trust LLM output blindly
- Least privilege: limit tool access available to the LLM
- Defense in depth: post-processing filters on LLM output

## Universal Principles

1. **Input validation at boundaries**: reject unexpected data types, lengths, formats
2. **Output encoding by context**: encode data based on where it's rendered
3. **Parameterization over concatenation**: separate code from data
4. **Allowlists over denylists**: define what's valid, reject everything else
5. **Defense in depth**: multiple layers (validation + encoding + CSP + sandbox)
6. **Framework defaults**: use framework-provided security features, don't bypass them
