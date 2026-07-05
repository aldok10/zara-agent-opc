# Event Loop

Understanding the Node.js event loop: phases, microtasks, macrotasks, and how to avoid blocking.

## Event Loop Phases (libuv)

```
   ┌───────────────────────────┐
┌─>│           timers          │  setTimeout, setInterval callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │  I/O callbacks deferred to next iteration
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │  internal use only
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           poll            │  retrieve new I/O events; execute I/O callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           check           │  setImmediate callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │      close callbacks      │  socket.on('close', ...)
│  └───────────────────────────┘
└──────── next iteration ────────┘
```

## Microtasks vs Macrotasks

Microtasks execute BETWEEN every phase transition and after every macrotask:

- **Microtasks**: `process.nextTick()`, Promise callbacks, `queueMicrotask()`
- **Macrotasks**: setTimeout, setInterval, setImmediate, I/O callbacks

Execution order:
1. Current operation completes
2. All `process.nextTick()` callbacks drain
3. All Promise microtasks drain
4. Next event loop phase begins

```typescript
console.log('1: sync');
setTimeout(() => console.log('5: timeout'), 0);
setImmediate(() => console.log('6: immediate'));
Promise.resolve().then(() => console.log('3: promise'));
process.nextTick(() => console.log('2: nextTick'));
queueMicrotask(() => console.log('4: microtask'));
// Output: 1, 2, 3, 4, 5, 6 (5 and 6 may swap depending on context)
```

## setImmediate vs process.nextTick

- `process.nextTick()` -- fires before any I/O, before promises. Can starve I/O if recursive.
- `setImmediate()` -- fires in the check phase, after I/O. Safer for deferring work.

```typescript
// DANGER: recursive nextTick starves I/O
function bad() { process.nextTick(bad); } // event loop never advances

// SAFE: recursive setImmediate allows I/O between calls
function good() { setImmediate(good); } // I/O can process between calls
```

## Blocking Detection

The event loop should never be blocked >50ms. Signs of blocking:

```typescript
// Detect with --inspect and Chrome DevTools
// Or use monitoring:
import { monitorEventLoopDelay } from 'node:perf_hooks';

const h = monitorEventLoopDelay({ resolution: 20 });
h.enable();

setInterval(() => {
  console.log({
    min: h.min / 1e6,     // ms
    max: h.max / 1e6,
    mean: h.mean / 1e6,
    p99: h.percentile(99) / 1e6,
  });
  h.reset();
}, 5000);
```

## Common Blocking Operations

| Operation | Problem | Solution |
|-----------|---------|----------|
| `JSON.parse()` on large payloads | Synchronous CPU | Stream parse (JSONStream) or worker thread |
| `crypto.pbkdf2Sync()` | CPU-intensive | Use async `crypto.pbkdf2()` |
| `fs.readFileSync()` | Blocks on disk I/O | `fs.promises.readFile()` |
| Large array `.sort()` or `.map()` | CPU | Chunk processing or worker thread |
| RegExp on untrusted input | ReDoS | Validate input length, use `re2` |

## Thread Pool (libuv)

Some async operations use libuv's thread pool (default 4 threads):
- `fs.*` operations (file system)
- `dns.lookup()` (not `dns.resolve()`)
- `crypto.pbkdf2()`, `crypto.scrypt()`, `crypto.randomBytes()`
- `zlib.*` operations

```bash
# Increase thread pool for I/O-heavy apps
UV_THREADPOOL_SIZE=16 node src/index.js
```

## Yielding Long Operations

```typescript
// Break up CPU-intensive work to avoid blocking
async function processLargeArray<T>(items: T[], processFn: (item: T) => void): Promise<void> {
  const BATCH_SIZE = 1000;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    batch.forEach(processFn);
    // Yield to event loop between batches
    await new Promise((resolve) => setImmediate(resolve));
  }
}
```

## Diagnostics

```bash
# Event loop utilization (Node 22+)
node --experimental-diagnostics-channel src/index.js

# Trace event loop phases
node --trace-event-categories node.perf src/index.js

# Clinic.js for visual diagnostics
npx clinic doctor -- node src/index.js
npx clinic flame -- node src/index.js
```
