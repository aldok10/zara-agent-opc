# Native APIs

Node.js 22+ native APIs that replace common dependencies. Use these first before reaching for npm packages.

## Native Fetch

```typescript
// No axios, no node-fetch needed
const response = await fetch('https://api.example.com/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ key: 'value' }),
  signal: AbortSignal.timeout(5000), // built-in timeout
});

if (!response.ok) throw new AppError('FETCH_FAILED', `HTTP ${response.status}`);
const data = await response.json();
```

## node:crypto

```typescript
import { randomUUID, randomBytes, createHash, createHmac, subtle } from 'node:crypto';

const id = randomUUID(); // v4 UUID
const token = randomBytes(32).toString('hex');
const hash = createHash('sha256').update(data).digest('hex');
const hmac = createHmac('sha256', secret).update(payload).digest('hex');

// Web Crypto (subtle) for modern algorithms
const key = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
```

## node:test

```typescript
import { test, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

test('basic test', () => { assert.equal(1 + 1, 2); });
// Run: node --test
```

## --env-file (no dotenv)

```bash
# Load .env file natively
node --env-file=.env src/index.js
node --env-file=.env --env-file=.env.local src/index.js  # multiple files, later wins
```

```typescript
// Validate at startup with Zod
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const config = envSchema.parse(process.env);
```

## Module Resolution (import.meta)

```typescript
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// ESM equivalent of __dirname / __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const configPath = join(__dirname, '../config/default.json');

// import.meta.resolve (synchronous in Node 22+)
const depPath = import.meta.resolve('some-package');
```

## AbortController / AbortSignal

```typescript
// Timeout pattern
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);

try {
  const result = await longOperation({ signal: controller.signal });
  return result;
} finally {
  clearTimeout(timeout);
}

// Compose signals
const signal = AbortSignal.any([
  AbortSignal.timeout(10_000),   // timeout
  parentSignal,                   // parent cancellation
]);
await fetch(url, { signal });
```

## Structured Clone

```typescript
// Deep copy without JSON.parse(JSON.stringify()) -- handles Date, Map, Set, ArrayBuffer
const copy = structuredClone(original);
```

## Permissions Model (Experimental)

```bash
# Restrict file system access
node --experimental-permission --allow-fs-read=/app/data --allow-fs-write=/tmp src/index.js

# Restrict network
node --experimental-permission --allow-net=api.example.com src/index.js
```

## AsyncLocalStorage (Request context)

```typescript
import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContext { requestId: string; userId?: string }
export const als = new AsyncLocalStorage<RequestContext>();

// In middleware
app.addHook('onRequest', (req, reply, done) => {
  als.run({ requestId: req.id }, done);
});

// Anywhere in the call chain
export function getRequestId(): string {
  return als.getStore()?.requestId ?? 'unknown';
}
```

## node:fs/promises

```typescript
import { readFile, writeFile, mkdir, readdir, stat, rm } from 'node:fs/promises';

// All async, no callbacks
const content = await readFile('./data.json', 'utf-8');
await mkdir('./output', { recursive: true });
await writeFile('./output/result.json', JSON.stringify(data, null, 2));
```

## Other Notable Native APIs

| API | Replaces | Usage |
|-----|----------|-------|
| `node:timers/promises` | setTimeout promisified | `await setTimeout(1000)` |
| `URL` / `URLSearchParams` | url-parse, qs | Standard URL handling |
| `FormData`, `Blob`, `File` | form-data package | Multipart uploads |
| `WebSocket` | ws (for client) | `new WebSocket(url)` (Node 22+) |
| `navigator.hardwareConcurrency` | os.cpus().length | Worker pool sizing |
