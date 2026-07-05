---
type: subskill
title: "Streams"
---

# Streams

Node.js stream processing: Transform streams, pipeline API, backpressure handling, web streams interop, and async iterators for memory-efficient data processing.

## Core Principles

1. Streams process data in chunks -- constant memory regardless of input size
2. Backpressure is automatic with `pipeline()` -- never use `.pipe()` (no error propagation)
3. Prefer `stream/promises` API -- async/await over event-based patterns
4. Async iterators are the modern consumption API -- `for await...of` on any Readable

## Pipeline API (Always use this)

```typescript
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';
import { Transform } from 'node:stream';

// Compose streams with automatic error handling and cleanup
await pipeline(
  createReadStream('./input.jsonl'),
  new Transform({
    transform(chunk, encoding, callback) {
      const lines = chunk.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        const parsed = JSON.parse(line);
        this.push(JSON.stringify({ ...parsed, processed: true }) + '\n');
      }
      callback();
    },
  }),
  createGzip(),
  createWriteStream('./output.jsonl.gz'),
);
```

## Transform Streams (Class-based)

```typescript
import { Transform, TransformCallback } from 'node:stream';

class JsonParser extends Transform {
  private buffer = '';

  constructor() {
    super({ objectMode: true }); // emit objects, not buffers
  }

  _transform(chunk: Buffer, _encoding: string, callback: TransformCallback): void {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? ''; // keep incomplete line

    for (const line of lines) {
      if (line.trim()) {
        try {
          this.push(JSON.parse(line));
        } catch (err) {
          return callback(new Error(`Invalid JSON: ${line.slice(0, 50)}`));
        }
      }
    }
    callback();
  }

  _flush(callback: TransformCallback): void {
    if (this.buffer.trim()) {
      try { this.push(JSON.parse(this.buffer)); } catch { /* ignore trailing */ }
    }
    callback();
  }
}
```

## Async Iterators (Modern consumption)

```typescript
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

// Line-by-line processing with constant memory
async function* processLines(filePath: string): AsyncGenerator<Record<string, unknown>> {
  const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.trim()) yield JSON.parse(line);
  }
}

// Consume
for await (const record of processLines('./data.jsonl')) {
  await processRecord(record);
}
```

## Web Streams (Standard API)

```typescript
// Node.js now supports Web Streams API natively
import { ReadableStream, TransformStream, WritableStream } from 'node:stream/web';
import { Readable } from 'node:stream';

// Convert between Node streams and Web streams
const nodeReadable = createReadStream('./file.txt');
const webReadable = Readable.toWeb(nodeReadable);

// Web TransformStream
const uppercaser = new TransformStream({
  transform(chunk, controller) {
    controller.enqueue(chunk.toString().toUpperCase());
  },
});

// Pipe using web streams
await webReadable.pipeThrough(uppercaser).pipeTo(new WritableStream({
  write(chunk) { process.stdout.write(chunk); },
}));
```

## Backpressure Handling

```typescript
import { Readable, Writable } from 'node:stream';

// Manual backpressure (when not using pipeline)
const source = getSomeReadable();
const dest = getSomeWritable();

source.on('data', (chunk) => {
  const canContinue = dest.write(chunk);
  if (!canContinue) {
    source.pause(); // stop reading until drain
  }
});

dest.on('drain', () => source.resume());
source.on('end', () => dest.end());
```

## Duplex & PassThrough

```typescript
import { Duplex, PassThrough } from 'node:stream';

// PassThrough for branching/teeing
const passthrough = new PassThrough();
const chunks: Buffer[] = [];
passthrough.on('data', (chunk) => chunks.push(chunk));

await pipeline(source, passthrough, destination);
const fullContent = Buffer.concat(chunks); // also captured
```

## Stream from Async Generator

```typescript
import { Readable } from 'node:stream';

async function* generateData(): AsyncGenerator<string> {
  for (let i = 0; i < 1000; i++) {
    yield JSON.stringify({ id: i, ts: Date.now() }) + '\n';
    if (i % 100 === 0) await new Promise((r) => setTimeout(r, 10)); // simulate async
  }
}

const readable = Readable.from(generateData());
await pipeline(readable, createWriteStream('./output.jsonl'));
```

## HTTP Streaming Response (Fastify)

```typescript
app.get('/export', async (req, reply) => {
  const cursor = db.query('SELECT * FROM records').cursor(100);

  reply.raw.writeHead(200, { 'Content-Type': 'application/x-ndjson' });

  for await (const batch of cursor) {
    for (const row of batch) {
      const canContinue = reply.raw.write(JSON.stringify(row) + '\n');
      if (!canContinue) await new Promise((r) => reply.raw.once('drain', r));
    }
  }

  reply.raw.end();
});
```

## Best Practices

1. Always use `pipeline()` from `node:stream/promises` -- handles errors and cleanup
2. Set `highWaterMark` based on chunk size (default 16KB for bytes, 16 objects for objectMode)
3. Object mode for parsed data, binary mode for raw bytes -- don't mix
4. Handle `_flush()` in Transform to emit buffered data on stream end
5. Use AbortSignal with pipeline for cancellation: `pipeline(src, dest, { signal })`
6. Never `.pipe()` in production -- no error propagation, no cleanup
