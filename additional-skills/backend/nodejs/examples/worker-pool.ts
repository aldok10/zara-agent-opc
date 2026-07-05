// Generic typed worker pool for CPU-intensive tasks
// Uses node:worker_threads with proper lifecycle management

import { Worker } from 'node:worker_threads';
import { EventEmitter } from 'node:events';
import { cpus } from 'node:os';

interface PoolOptions {
  workerPath: string;
  minThreads?: number;
  maxThreads?: number;
  idleTimeoutMs?: number;
}

interface QueuedTask<TResult> {
  data: unknown;
  resolve: (value: TResult) => void;
  reject: (error: Error) => void;
  signal?: AbortSignal;
}

interface WorkerWrapper {
  worker: Worker;
  busy: boolean;
  taskCount: number;
}

export class WorkerPool<TInput, TResult> extends EventEmitter {
  private workers: WorkerWrapper[] = [];
  private queue: QueuedTask<TResult>[] = [];
  private readonly maxThreads: number;
  private readonly minThreads: number;
  private closed = false;

  constructor(private readonly options: PoolOptions) {
    super();
    this.maxThreads = options.maxThreads ?? cpus().length - 1;
    this.minThreads = options.minThreads ?? Math.max(1, Math.floor(this.maxThreads / 2));

    // Pre-warm minimum threads
    for (let i = 0; i < this.minThreads; i++) {
      this.workers.push(this.createWorker());
    }
  }

  private createWorker(): WorkerWrapper {
    const worker = new Worker(this.options.workerPath);
    const wrapper: WorkerWrapper = { worker, busy: false, taskCount: 0 };

    worker.on('error', (err) => {
      this.emit('workerError', err);
      // Replace crashed worker
      const index = this.workers.indexOf(wrapper);
      if (index !== -1) {
        this.workers.splice(index, 1);
        if (this.workers.length < this.minThreads && !this.closed) {
          this.workers.push(this.createWorker());
        }
      }
    });

    return wrapper;
  }

  async exec(data: TInput, options?: { signal?: AbortSignal }): Promise<TResult> {
    if (this.closed) throw new Error('Pool is closed');

    const signal = options?.signal;
    if (signal?.aborted) throw new Error('Task aborted');

    return new Promise<TResult>((resolve, reject) => {
      const task: QueuedTask<TResult> = { data, resolve, reject, signal };

      // Listen for abort
      signal?.addEventListener('abort', () => {
        const index = this.queue.indexOf(task);
        if (index !== -1) {
          this.queue.splice(index, 1);
          reject(new Error('Task aborted'));
        }
      }, { once: true });

      this.queue.push(task);
      this.drain();
    });
  }

  private drain(): void {
    while (this.queue.length > 0) {
      let wrapper = this.workers.find((w) => !w.busy);

      // Scale up if needed and allowed
      if (!wrapper && this.workers.length < this.maxThreads) {
        wrapper = this.createWorker();
        this.workers.push(wrapper);
      }

      if (!wrapper) break; // all busy, wait

      const task = this.queue.shift()!;
      if (task.signal?.aborted) continue; // skip aborted tasks

      this.runTask(wrapper, task);
    }
  }

  private runTask(wrapper: WorkerWrapper, task: QueuedTask<TResult>): void {
    wrapper.busy = true;
    wrapper.taskCount++;

    const onMessage = (result: TResult) => {
      cleanup();
      wrapper.busy = false;
      task.resolve(result);
      this.drain();
    };

    const onError = (err: Error) => {
      cleanup();
      wrapper.busy = false;
      task.reject(err);
      this.drain();
    };

    const cleanup = () => {
      wrapper.worker.removeListener('message', onMessage);
      wrapper.worker.removeListener('error', onError);
    };

    wrapper.worker.on('message', onMessage);
    wrapper.worker.on('error', onError);
    wrapper.worker.postMessage(task.data);
  }

  get stats() {
    return {
      totalWorkers: this.workers.length,
      busyWorkers: this.workers.filter((w) => w.busy).length,
      queuedTasks: this.queue.length,
      totalTasksProcessed: this.workers.reduce((sum, w) => sum + w.taskCount, 0),
    };
  }

  async close(): Promise<void> {
    this.closed = true;

    // Reject queued tasks
    for (const task of this.queue) {
      task.reject(new Error('Pool is shutting down'));
    }
    this.queue.length = 0;

    // Terminate all workers
    await Promise.all(this.workers.map((w) => w.worker.terminate()));
    this.workers.length = 0;
  }
}

// --- Example Worker (hash-worker.ts) ---
// import { parentPort } from 'node:worker_threads';
// import { createHash } from 'node:crypto';
//
// parentPort!.on('message', (data: { input: string; algorithm?: string }) => {
//   const hash = createHash(data.algorithm ?? 'sha256')
//     .update(data.input)
//     .digest('hex');
//   parentPort!.postMessage({ hash });
// });

// --- Usage ---
// const pool = new WorkerPool<{ input: string }, { hash: string }>({
//   workerPath: fileURLToPath(new URL('./hash-worker.js', import.meta.url)),
//   minThreads: 2,
//   maxThreads: 8,
// });
//
// const result = await pool.exec({ input: 'hello world' });
// console.log(result.hash);
//
// await pool.close();
