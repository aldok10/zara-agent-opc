/**
 * Type-safe generic API client with discriminated union responses.
 * Demonstrates: constrained generics, conditional types, branded types at boundaries.
 */

import { z, type ZodType } from "zod";

// --- Branded request ID for tracing ---
declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };
type RequestId = Brand<string, "RequestId">;

function RequestId(): RequestId {
  return crypto.randomUUID() as RequestId;
}

// --- Discriminated response type ---
type ApiResponse<T> =
  | { success: true; data: T; requestId: RequestId }
  | { success: false; error: ApiError; requestId: RequestId };

interface ApiError {
  code: string;
  message: string;
  statusCode: number;
}

// --- Endpoint configuration with inferred types ---
interface EndpointConfig<TResponse> {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  schema: ZodType<TResponse>;
}

// --- Generic API client ---
function createApiClient(baseUrl: string) {
  async function request<TResponse>(
    config: EndpointConfig<TResponse>,
    options?: { body?: unknown; params?: Record<string, string> }
  ): Promise<ApiResponse<TResponse>> {
    const requestId = RequestId();
    const url = new URL(config.path, baseUrl);

    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        url.searchParams.set(key, value);
      }
    }

    try {
      const response = await fetch(url, {
        method: config.method,
        headers: { "Content-Type": "application/json", "X-Request-Id": requestId },
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        return {
          success: false,
          requestId,
          error: {
            code: `HTTP_${response.status}`,
            message: response.statusText,
            statusCode: response.status,
          },
        };
      }

      const raw: unknown = await response.json();
      const data = config.schema.parse(raw);

      return { success: true, data, requestId };
    } catch (err) {
      return {
        success: false,
        requestId,
        error: {
          code: "NETWORK_ERROR",
          message: err instanceof Error ? err.message : "Unknown error",
          statusCode: 0,
        },
      };
    }
  }

  return { request };
}

// --- Usage: define endpoints ---
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["admin", "user", "moderator"]),
});
type User = z.infer<typeof UserSchema>;

const UsersListSchema = z.array(UserSchema);

const endpoints = {
  getUser: {
    path: "/users/:id",
    method: "GET" as const,
    schema: UserSchema,
  },
  listUsers: {
    path: "/users",
    method: "GET" as const,
    schema: UsersListSchema,
  },
} satisfies Record<string, EndpointConfig<unknown>>;

// --- Usage: make requests ---
async function example() {
  const api = createApiClient("https://api.example.com");

  const result = await api.request(endpoints.getUser, {
    params: { id: "abc-123" },
  });

  // Discriminated union narrows cleanly
  if (result.success) {
    // result.data is User (inferred from schema)
    console.log(result.data.name);
    console.log(result.data.role);
  } else {
    // result.error is ApiError
    console.error(`[${result.requestId}] ${result.error.code}: ${result.error.message}`);
  }
}

export { createApiClient, type ApiResponse, type EndpointConfig, type ApiError };
