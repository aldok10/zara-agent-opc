import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PactV4, MatchersV3 } from "@pact-foundation/pact";
import path from "node:path";

const { like, eachLike, string, integer, iso8601DateTimeWithMillis } = MatchersV3;

interface Product {
  id: number;
  name: string;
  price: number;
  updatedAt: string;
}

interface ProductClient {
  getProduct(id: number): Promise<Product>;
  listProducts(): Promise<Product[]>;
}

function createProductClient(baseUrl: string): ProductClient {
  return {
    async getProduct(id: number): Promise<Product> {
      const res = await fetch(`${baseUrl}/api/products/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    async listProducts(): Promise<Product[]> {
      const res = await fetch(`${baseUrl}/api/products`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  };
}

const provider = new PactV4({
  consumer: "ProductUI",
  provider: "ProductAPI",
  dir: path.resolve(process.cwd(), "pacts"),
});

describe("Product API Contract", () => {
  describe("GET /api/products/:id", () => {
    it("returns a product by ID", async () => {
      await provider
        .addInteraction()
        .given("product 42 exists")
        .uponReceiving("a request for product 42")
        .withRequest("GET", "/api/products/42")
        .willRespondWith(200, (builder) => {
          builder.headers({ "Content-Type": "application/json" });
          builder.jsonBody(
            like({
              id: integer(42),
              name: string("Widget"),
              price: integer(1999),
              updatedAt: iso8601DateTimeWithMillis("2024-01-15T10:30:00.000Z"),
            })
          );
        })
        .executeTest(async (mockServer) => {
          const client = createProductClient(mockServer.url);
          const product = await client.getProduct(42);

          expect(product.id).toBe(42);
          expect(product.name).toBeDefined();
          expect(product.price).toBeGreaterThan(0);
        });
    });
  });

  describe("GET /api/products", () => {
    it("returns a list of products", async () => {
      await provider
        .addInteraction()
        .given("products exist")
        .uponReceiving("a request for all products")
        .withRequest("GET", "/api/products")
        .willRespondWith(200, (builder) => {
          builder.headers({ "Content-Type": "application/json" });
          builder.jsonBody(
            eachLike({
              id: integer(1),
              name: string("Item"),
              price: integer(999),
              updatedAt: iso8601DateTimeWithMillis("2024-01-15T10:30:00.000Z"),
            })
          );
        })
        .executeTest(async (mockServer) => {
          const client = createProductClient(mockServer.url);
          const products = await client.listProducts();

          expect(products.length).toBeGreaterThan(0);
          expect(products[0]).toHaveProperty("id");
          expect(products[0]).toHaveProperty("name");
        });
    });
  });
});
