---
type: fact
title: "Secure Coding"
---
# Secure Coding

Technical reference for defensive coding patterns: input validation, output encoding, injection prevention, and safe error handling.

---

## Input Validation

### Allowlist Over Denylist

Denylist approach is always incomplete. New attack vectors bypass it. Allowlist defines what IS valid.

```typescript
// BAD: denylist
function sanitizeFilename(name: string): string {
  return name.replace(/[\/\\\.\.]/g, ""); // Incomplete, bypassable
}

// GOOD: allowlist
function validateFilename(name: string): string {
  const ALLOWED = /^[a-zA-Z0-9_\-]{1,255}\.[a-zA-Z0-9]{1,10}$/;
  if (!ALLOWED.test(name)) throw new ValidationError("Invalid filename");
  return name;
}
```

### Validation Layers

```typescript
import { z } from "zod";

const CreateUserSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().min(1).max(100).regex(/^[\p{L}\p{N}\s\-'.]+$/u),
  age: z.number().int().min(13).max(150),
  role: z.enum(["user", "editor"]), // Never trust client-sent role escalation
});

type CreateUserInput = z.infer<typeof CreateUserSchema>;

function handleCreateUser(rawInput: unknown): CreateUserInput {
  return CreateUserSchema.parse(rawInput); // Throws on invalid
}
```

### Validation Principles

- Validate at trust boundaries (API entry, file upload, webhook)
- Validate type, length, range, format, and business rules
- Reject early, fail closed (invalid = denied)
- Normalize before validation (Unicode NFC, trim whitespace)
- Never validate then transform (transform then validate)

---

## Output Encoding

Context determines encoding. HTML encoding does NOT protect in JavaScript context.

| Context | Encoding | Example |
|---|---|---|
| HTML body | HTML entity encode | `<` -> `&lt;` |
| HTML attribute | HTML entity encode + quote | `"` -> `&quot;` |
| JavaScript | JS escape or JSON.stringify | `'` -> `\x27` |
| URL parameter | encodeURIComponent | ` ` -> `%20` |
| CSS | CSS hex escape | `\` -> `\5c` |
| SQL | Parameterized queries | Never inline |

```typescript
// HTML context
function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
  };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}

// URL context
function buildUrl(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value); // Auto-encodes
  }
  return url.toString();
}
```

---

## Injection Prevention

### SQL Injection

```typescript
// BAD: string concatenation
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// GOOD: parameterized query
const result = await db.query("SELECT * FROM users WHERE id = $1", [userId]);

// GOOD: query builder with parameters
const user = await db
  .selectFrom("users")
  .where("id", "=", userId)
  .selectAll()
  .executeTakeFirst();
```

### Command Injection

```typescript
import { execFile } from "node:child_process";

// BAD: shell interpolation
exec(`convert ${inputFile} ${outputFile}`); // Shell injection via filename

// GOOD: execFile with array arguments (no shell)
execFile("convert", [inputFile, outputFile], (err, stdout) => {
  // inputFile/outputFile are passed as separate args, not shell-interpreted
});

// GOOD: explicit allowlist for dynamic commands
const ALLOWED_FORMATS = new Set(["png", "jpg", "webp"]);
function convertImage(input: string, format: string): void {
  if (!ALLOWED_FORMATS.has(format)) throw new Error("Invalid format");
  execFile("convert", [input, `output.${format}`]);
}
```

### LDAP Injection

```typescript
function escapeLDAP(input: string): string {
  return input.replace(/[\\*()\/\0]/g, (c) => `\\${c.charCodeAt(0).toString(16)}`);
}
```

### Template Injection (SSTI)

Never pass user input as template source. Only pass as template data.

```python
# BAD
template = jinja2.Template(user_input)

# GOOD
template = jinja2.Template("Hello {{ name }}")
result = template.render(name=user_input)
```

---

## Deserialization Safety

### Never Deserialize Untrusted Data with Unsafe Formats

Dangerous: Java ObjectInputStream, Python pickle, PHP unserialize, Ruby Marshal, YAML load.

```python
# BAD
import pickle
data = pickle.loads(user_provided_bytes)  # Arbitrary code execution

# GOOD
import json
data = json.loads(user_provided_string)  # Safe (no code execution)

# If you MUST use complex formats, use safe loaders
import yaml
data = yaml.safe_load(user_provided_string)  # safe_load, not load
```

### JSON Schema Validation After Parsing

```typescript
import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

function parsePayload(raw: string): ValidatedPayload {
  const parsed = JSON.parse(raw); // Safe parse
  if (!validate(parsed)) {
    throw new ValidationError(validate.errors);
  }
  return parsed as ValidatedPayload;
}
```

---

## Race Conditions and TOCTOU

### Time-of-Check to Time-of-Use

```typescript
// BAD: check then act (race window between check and use)
if (await fs.access(filePath)) {  // Check
  await fs.readFile(filePath);     // Use -- file may have changed
}

// BAD: check balance then debit
const balance = await getBalance(userId);
if (balance >= amount) {
  await debit(userId, amount); // Another request may have debited first
}

// GOOD: atomic operation
await db.query(
  "UPDATE accounts SET balance = balance - $1 WHERE user_id = $2 AND balance >= $1",
  [amount, userId],
);
// Check affected rows -- 0 means insufficient balance

// GOOD: optimistic locking
const account = await db.query(
  "UPDATE accounts SET balance = balance - $1, version = version + 1 WHERE user_id = $2 AND version = $3 AND balance >= $1 RETURNING *",
  [amount, userId, expectedVersion],
);
```

### Mutex / Advisory Locks

```typescript
async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const lockId = hashToInt(key);
  await db.query("SELECT pg_advisory_lock($1)", [lockId]);
  try {
    return await fn();
  } finally {
    await db.query("SELECT pg_advisory_unlock($1)", [lockId]);
  }
}
```

---

## Memory Safety Patterns

For languages with manual memory management (C, C++, Rust unsafe):

| Vulnerability | Prevention |
|---|---|
| Buffer overflow | Bounds checking, use safe APIs (strncpy vs strcpy) |
| Use-after-free | Clear pointers after free, ownership semantics |
| Double free | Single ownership, null after free |
| Integer overflow | Check before arithmetic, use safe math libs |

For managed languages: still watch for logical equivalents (array index out of bounds, regex DoS, infinite allocation).

```go
// Go: protect against integer overflow before allocation
func safeAllocate(count, size int) ([]byte, error) {
    if count <= 0 || size <= 0 {
        return nil, errors.New("invalid dimensions")
    }
    if count > math.MaxInt/size {
        return nil, errors.New("allocation would overflow")
    }
    return make([]byte, count*size), nil
}
```

---

## Error Handling

### Don't Leak Internals

```typescript
// BAD: leaks implementation details
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ error: err.message, stack: err.stack });
});

// GOOD: generic message to client, detailed log server-side
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const errorId = randomUUID();
  logger.error({ errorId, err, req: { method: req.method, path: req.path } });
  res.status(500).json({
    error: "Internal server error",
    errorId, // Client can reference this for support
  });
});
```

### Error Response Rules

- Never expose: stack traces, SQL queries, file paths, dependency versions, internal IPs
- Always include: correlation ID for support lookup
- Log: full details server-side with correlation ID
- Rate limit error responses (prevent enumeration via error messages)

```typescript
// BAD: information leakage via different error messages
if (!user) return res.status(401).json({ error: "User not found" });
if (!validPassword) return res.status(401).json({ error: "Wrong password" });

// GOOD: identical message prevents user enumeration
if (!user || !validPassword) {
  return res.status(401).json({ error: "Invalid credentials" });
}
```
