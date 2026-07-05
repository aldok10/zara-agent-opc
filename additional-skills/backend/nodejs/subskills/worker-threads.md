# Worker Threads

CPU-bound parallelism in Node.js without forking processes. Worker threads share memory via SharedArrayBuffer, communicate via message passing, and maintain isolated V8 instances.

## When to Use

- CPU-intensive: image processing, compression, cryptography, parsing large files
- Blocking computation that would starve the event loop (>50ms sync work)
- Parallel data processing across multiple cores
- NOT for I/O-bound work (use async/await + event loop instead)

## Basic Worker

```typescript
// worker.ts
import { parentPort, workerData } from 'node:worker_threads';

interface WorkerInput { numbers: number[] }
interface WorkerOutput { sum: number; threadId: number }

const { numbers } = workerData as WorkerInput;
const sum = numbers.reduce((a, b) => a + b, 0);

parentPort!.postMessage({ sum, threadId: 0 } satisfies WorkerOutput);
```

```typescript
// main.ts
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

function runWorker(data: { numbers: number[] }): Promise<{ sum: number }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(fileURLToPath(new URL('./worker.ts', import.meta.url)), {
      workerData: data,
    });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
    });
  });
}
```

## Worker Pool Pattern

```typescript
import { Worker } from 'node:worker_threads';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';
import { cpus } from 'node:os';

interface Task<T, R> { data: T; resolve: (value: R) => void; reject: (err: Error) => void }

export class WorkerPool<T, R> {
  private workers: Worker[] = [];
  private freeWorkers: Worker[] = [];
  private queue: Task<T, R>[] = [];

  constructor(private workerPath: string, private poolSize = cpus().length - 1) {
    for (let i = 0; i < this.poolSize; i++) {
      this.addWorker();
    }
  }

  private addWorker(): void {
    const worker = new Worker(this.workerPath);
    worker.on('message', (result: R) => {
      const task = (worker as any).__task as Task<T, R>;
      task.resolve(result);
      this.freeWorkers.push(worker);
      this.drain();
    });
    worker.on('error', (err) => {
      const task = (worker as any).__task as Task<T, R> | undefined;
      task?.reject(err);
    });
    this.freeWorkers.push(worker);
    this.workers.push(worker);
  }

  exec(data: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ data, resolve, reject });
      this.drain();
    });
  }

  private drain(): void {
    while (this.queue.length > 0 && this.freeWorkers.length > 0) {
      const worker = this.freeWorkers.pop()!;
      const task = this.queue.shift()!;
      (worker as any).__task = task;
      worker.postMessage(task.data);
    }
  }

  async destroy(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.terminate()));
  }
}
```

## SharedArrayBuffer (Zero-copy shared memory)

```typescript
// main.ts
import { Worker } from 'node:worker_threads';

const sharedBuffer = new SharedArrayBuffer(1024 * Int32Array.BYTES_PER_ELEMENT);
const sharedArray = new Int32Array(sharedBuffer);

// Fill data
for (let i = 0; i < 1024; i++) sharedArray[i] = i;

const worker = new Worker('./compute-worker.js', { workerData: { buffer: sharedBuffer } });
```

```typescript
// compute-worker.ts
import { parentPort, workerData } from 'node:worker_threads';

const sharedArray = new Int32Array(workerData.buffer);
// Read/write directly -- no copying, no serialization
let sum = 0;
for (let i = 0; i < sharedArray.length; i++) sum += sharedArray[i];
parentPort!.postMessage({ sum });
```

## Atomics (Thread-safe operations)

```typescript
const sharedBuffer = new SharedArrayBuffer(4);
const view = new Int32Array(sharedBuffer);

// Thread-safe increment
Atomics.add(view, 0, 1);

// Wait/notify pattern (producer-consumer)
// Worker: wait until signaled
Atomics.wait(view, 0, 0); // blocks until value at index 0 !== 0

// Main: signal worker
Atomics.store(view, 0, 1);
Atomics.notify(view, 0, 1); // wake 1 waiter
```

## Piscina (Production worker pool)

```typescript
import Piscina from 'piscina';
import { fileURLToPath } from 'node:url';

const pool = new Piscina({
  filename: fileURLToPath(new URL('./worker.ts', import.meta.url)),
  maxThreads: 4,
  minThreads: 2,
  idleTimeout: 30_000,
});

// Type-safe execution
const result = await pool.run({ input: 'data' });

// With abort support
const controller = new AbortController();
const result2 = await pool.run({ input: 'data' }, { signal: controller.signal });
```

## MessageChannel (Direct worker-to-worker)

```typescript
import { Worker, MessageChannel } from 'node:worker_threads';

const { port1, port2 } = new MessageChannel();
const worker1 = new Worker('./worker1.js');
const worker2 = new Worker('./worker2.js');

// Transfer ports to workers (zero-copy transfer)
worker1.postMessage({ port: port1 }, [port1]);
worker2.postMessage({ port: port2 }, [port2]);
// Workers can now communicate directly without going through main thread
```

## Best Practices

1. Pool workers -- creating workers is expensive (~30ms), reuse them
2. Transfer large data -- use `transferList` for ArrayBuffers to avoid copying
3. Keep messages small -- structured clone is not free, send references not copies
4. Handle errors -- workers can crash independently, always handle `error` event
5. Graceful shutdown -- terminate workers on SIGTERM, wait for in-flight tasks
6. Monitor pool saturation -- track queue depth, reject/backpressure when full
7. Avoid shared state complexity -- prefer message passing over SharedArrayBuffer unless perf-critical
