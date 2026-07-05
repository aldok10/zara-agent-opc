// Graceful shutdown handler with connection draining
// Handles SIGTERM/SIGINT, closes server, drains connections, cleans up resources

import { once } from 'node:events';

type CleanupFn = () => Promise<void> | void;

interface ShutdownOptions {
  /** Max time to wait for graceful shutdown before force-killing (ms) */
  timeoutMs?: number;
  /** Logger instance */
  logger?: { info: (msg: string) => void; error: (msg: string, err?: unknown) => void };
  /** Signals to listen for */
  signals?: NodeJS.Signals[];
}

/**
 * Registers graceful shutdown handlers.
 * Resources are cleaned up in reverse registration order (LIFO).
 *
 * Usage:
 *   const shutdown = createShutdown({ timeoutMs: 10_000 });
 *   shutdown.register('database', () => db.end());
 *   shutdown.register('server', () => server.close());
 *   shutdown.register('cache', () => redis.quit());
 */
export function createShutdown(options: ShutdownOptions = {}) {
  const {
    timeoutMs = 10_000,
    logger = { info: console.log, error: console.error },
    signals = ['SIGTERM', 'SIGINT'],
  } = options;

  const resources: Array<{ name: string; cleanup: CleanupFn }> = [];
  let isShuttingDown = false;

  function register(name: string, cleanup: CleanupFn): void {
    resources.push({ name, cleanup });
  }

  async function shutdown(signal: string): Promise<void> {
    if (isShuttingDown) return; // prevent double shutdown
    isShuttingDown = true;

    logger.info(`Shutdown initiated (${signal}). Cleaning up ${resources.length} resources...`);

    // Force exit after timeout
    const forceTimer = setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, timeoutMs);
    forceTimer.unref(); // don't keep process alive

    // Clean up in reverse order (LIFO)
    const reversed = [...resources].reverse();
    for (const { name, cleanup } of reversed) {
      try {
        await cleanup();
        logger.info(`  Closed: ${name}`);
      } catch (err) {
        logger.error(`  Failed to close: ${name}`, err);
      }
    }

    clearTimeout(forceTimer);
    logger.info('Shutdown complete.');
    process.exit(0);
  }

  // Register signal handlers
  for (const signal of signals) {
    process.on(signal, () => shutdown(signal));
  }

  return { register, shutdown, get isShuttingDown() { return isShuttingDown; } };
}

// --- Full Example ---
// import fastify from 'fastify';
// import { createPool } from './db.js';
// import { createShutdown } from './graceful-shutdown.js';
//
// const shutdown = createShutdown({ timeoutMs: 15_000 });
//
// // Database
// const db = createPool({ connectionString: process.env.DATABASE_URL });
// shutdown.register('database', async () => { await db.end(); });
//
// // Redis
// const redis = createRedisClient();
// shutdown.register('redis', async () => { await redis.quit(); });
//
// // HTTP Server
// const app = fastify({ logger: true });
// await app.listen({ port: 3000, host: '0.0.0.0' });
// shutdown.register('http-server', async () => { await app.close(); });
//
// // Background workers
// const workerPool = new WorkerPool({ workerPath: './worker.js' });
// shutdown.register('worker-pool', async () => { await workerPool.close(); });

// --- Health check that respects shutdown ---
// app.get('/health', async (req, reply) => {
//   if (shutdown.isShuttingDown) {
//     return reply.status(503).send({ status: 'shutting_down' });
//   }
//   return { status: 'ok' };
// });

// --- Kubernetes readiness probe pattern ---
// app.get('/ready', async (req, reply) => {
//   if (shutdown.isShuttingDown) {
//     return reply.status(503).send({ ready: false });
//   }
//   // Check dependencies
//   try {
//     await db.query('SELECT 1');
//     await redis.ping();
//     return { ready: true };
//   } catch {
//     return reply.status(503).send({ ready: false });
//   }
// });
