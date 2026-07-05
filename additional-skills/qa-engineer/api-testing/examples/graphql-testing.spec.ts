import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";

const gql = (query: string, variables?: Record<string, unknown>) =>
  request(app)
    .post("/graphql")
    .send({ query, variables })
    .set("Content-Type", "application/json");

describe("GraphQL API", () => {
  describe("Queries", () => {
    it("fetches user with variables", async () => {
      const query = `
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            email
            orders { id totalAmount }
          }
        }
      `;
      const res = await gql(query, { id: "user-1" });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.user).toMatchObject({
        id: "user-1",
        email: expect.stringContaining("@"),
      });
      expect(res.body.data.user.orders).toBeInstanceOf(Array);
    });
  });

  describe("Mutations", () => {
    it("creates order and returns generated fields", async () => {
      const mutation = `
        mutation CreateOrder($input: OrderInput!) {
          createOrder(input: $input) {
            id
            status
            createdAt
          }
        }
      `;
      const res = await gql(mutation, {
        input: { userId: "user-1", items: [{ sku: "SKU-1", quantity: 2 }] },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.createOrder.id).toBeDefined();
      expect(res.body.data.createOrder.status).toBe("PENDING");
    });
  });

  describe("Error handling", () => {
    it("returns typed error for not found", async () => {
      const res = await gql(`{ user(id: "nonexistent") { id } }`);

      expect(res.status).toBe(200); // GraphQL returns 200 with errors
      expect(res.body.errors).toHaveLength(1);
      expect(res.body.errors[0].extensions.code).toBe("NOT_FOUND");
    });

    it("rejects query exceeding depth limit", async () => {
      // depth 6: user -> orders -> items -> product -> reviews -> author
      const deepQuery = `{
        user(id: "user-1") {
          orders { items { product { reviews { author { email } } } } }
        }
      }`;
      const res = await gql(deepQuery);

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toMatch(/depth/i);
    });

    it("rejects query exceeding complexity limit", async () => {
      const complexQuery = `{
        users(first: 1000) { orders(first: 1000) { items { id } } }
      }`;
      const res = await gql(complexQuery);

      expect(res.body.errors[0].message).toMatch(/complex/i);
    });
  });

  describe("Subscriptions", () => {
    it("receives order status update via WebSocket", async () => {
      // Pattern: use graphql-ws client for subscription testing
      const { createClient } = await import("graphql-ws");
      const client = createClient({ url: "ws://localhost:4000/graphql" });

      const results: unknown[] = [];
      const subscription = client.iterate({
        query: `subscription { orderUpdated(userId: "user-1") { id status } }`,
      });

      // Trigger mutation in parallel
      setTimeout(() => {
        gql(
          `mutation { updateOrderStatus(id: "order-1", status: SHIPPED) { id } }`
        );
      }, 100);

      for await (const result of subscription) {
        results.push(result.data);
        if (results.length >= 1) break;
      }

      expect(results[0]).toMatchObject({
        orderUpdated: { id: "order-1", status: "SHIPPED" },
      });
      client.dispose();
    });
  });
});
