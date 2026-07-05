import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import request from "supertest";
import { app } from "../src/app";

// Generators derived from OpenAPI schema properties
const userPayloadArb = fc.record({
  email: fc.emailAddress(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  age: fc.integer({ min: 18, max: 120 }),
});

const invalidEmailArb = fc.oneof(
  fc.constant(""),
  fc.constant("not-an-email"),
  fc.string().filter((s) => !s.includes("@"))
);

describe("POST /api/users - property-based", () => {
  it("always returns id and createdAt for valid payloads", async () => {
    await fc.assert(
      fc.asyncProperty(userPayloadArb, async (payload) => {
        const res = await request(app)
          .post("/api/users")
          .send(payload)
          .set("Content-Type", "application/json");

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("id");
        expect(typeof res.body.id).toBe("string");
        expect(res.body).toHaveProperty("createdAt");
        expect(res.body.email).toBe(payload.email.toLowerCase());
      }),
      { numRuns: 50 }
    );
  });

  it("never returns 5xx for any valid input shape", async () => {
    await fc.assert(
      fc.asyncProperty(userPayloadArb, async (payload) => {
        const res = await request(app)
          .post("/api/users")
          .send(payload)
          .set("Content-Type", "application/json");

        expect(res.status).toBeLessThan(500);
      }),
      { numRuns: 100 }
    );
  });

  it("returns 400 for invalid email (shrinks to minimal case)", async () => {
    await fc.assert(
      fc.asyncProperty(invalidEmailArb, async (badEmail) => {
        const res = await request(app)
          .post("/api/users")
          .send({ email: badEmail, name: "Test", age: 25 })
          .set("Content-Type", "application/json");

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
        expect(
          res.body.errors.some((e: { field: string }) => e.field === "email")
        ).toBe(true);
      }),
      { numRuns: 50 }
    );
  });

  it("response time stays under SLA for random valid payloads", async () => {
    await fc.assert(
      fc.asyncProperty(userPayloadArb, async (payload) => {
        const start = performance.now();
        const res = await request(app)
          .post("/api/users")
          .send(payload)
          .set("Content-Type", "application/json");
        const duration = performance.now() - start;

        expect(res.status).toBeLessThan(500);
        expect(duration).toBeLessThan(500); // 500ms SLA
      }),
      { numRuns: 30 }
    );
  });
});
