import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";

interface RateLimitStore {
  [ip: string]: { count: number; resetAt: number };
}

const rateLimitStore: RateLimitStore = {};

function rateLimit(maxRequests: number, windowMs: number) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const ip = request.ip;
    const now = Date.now();
    const entry = rateLimitStore[ip];

    if (!entry || now > entry.resetAt) {
      rateLimitStore[ip] = { count: 1, resetAt: now + windowMs };
      return;
    }

    entry.count++;
    if (entry.count > maxRequests) {
      reply.header("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      return reply.status(429).send({ error: "Too many requests" });
    }
  };
}

const CreateUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100).regex(/^[a-zA-Z\s\-']+$/),
  role: z.enum(["user", "admin", "viewer"]),
});

function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: "Validation failed",
        details: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }
    (request as FastifyRequest & { validated: T }).validated = result.data;
  };
}

function authenticate() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Missing or invalid token" });
    }

    const token = authHeader.slice(7);
    try {
      const payload = await verifyJwt(token);
      (request as FastifyRequest & { user: JwtPayload }).user = payload;
    } catch {
      return reply.status(401).send({ error: "Invalid or expired token" });
    }
  };
}

interface JwtPayload {
  sub: string;
  role: string;
  exp: number;
}

async function verifyJwt(_token: string): Promise<JwtPayload> {
  throw new Error("Implement with jose or jsonwebtoken");
}

export async function secureRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", rateLimit(100, 60_000));

  app.post(
    "/api/users",
    {
      preHandler: [authenticate(), validateBody(CreateUserSchema)],
    },
    async (request, reply) => {
      const validated = (request as FastifyRequest & { validated: z.infer<typeof CreateUserSchema> }).validated;
      const user = (request as FastifyRequest & { user: JwtPayload }).user;

      if (user.role !== "admin") {
        return reply.status(403).send({ error: "Insufficient permissions" });
      }

      return reply.status(201).send({ id: crypto.randomUUID(), ...validated });
    }
  );
}
