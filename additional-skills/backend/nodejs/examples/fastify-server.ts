// Production Fastify server with plugins, Zod validation, graceful shutdown
// Run: node --env-file=.env dist/server.js

import fastify from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

// --- Config ---
const configSchema = z.object({
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const config = configSchema.parse(process.env);

// --- App Factory ---
export async function buildApp() {
  const app = fastify({
    logger: { level: config.LOG_LEVEL },
  }).withTypeProvider<ZodTypeProvider>();

  // Zod type provider
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // --- Plugins ---
  // Database plugin (example with decorator)
  app.decorate('config', config);

  // --- Error Handler ---
  app.setErrorHandler((error, request, reply) => {
    if (error.validation) {
      return reply.status(422).send({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.validation,
      });
    }

    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        code: error.code ?? 'CLIENT_ERROR',
        message: error.message,
      });
    }

    request.log.error({ err: error }, 'Unhandled error');
    return reply.status(500).send({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
  });

  // --- Routes ---
  app.get('/health', {
    schema: {
      response: { 200: z.object({ status: z.literal('ok'), uptime: z.number() }) },
    },
  }, async () => {
    return { status: 'ok' as const, uptime: process.uptime() };
  });

  const createUserSchema = {
    body: z.object({
      name: z.string().min(1).max(100),
      email: z.string().email(),
    }),
    response: {
      201: z.object({ id: z.string().uuid(), name: z.string(), email: z.string() }),
    },
  };

  app.post('/users', { schema: createUserSchema }, async (request, reply) => {
    const { name, email } = request.body;
    const id = crypto.randomUUID();
    // In real app: await db.insert(users).values({ id, name, email });
    return reply.status(201).send({ id, name, email });
  });

  return app;
}

// --- Server Start with Graceful Shutdown ---
async function main(): Promise<void> {
  const app = await buildApp();

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info({ signal }, 'Received shutdown signal');
      try {
        await app.close(); // drains connections, runs onClose hooks
        app.log.info('Server closed gracefully');
        process.exit(0);
      } catch (err) {
        app.log.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    });
  }

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
  } catch (err) {
    app.log.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

main();
