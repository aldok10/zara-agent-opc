import { z } from "zod";

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const UserRegistrationSchema = z.object({
  email: z
    .string()
    .min(5)
    .max(254)
    .regex(EMAIL_REGEX, "Invalid email format")
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128, "Password must not exceed 128 characters")
    .refine(
      (pw) => /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw),
      "Password must contain lowercase, uppercase, and number",
    ),
  displayName: z
    .string()
    .min(1)
    .max(100)
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, "Display name cannot be empty after trimming"),
});

const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["created_at", "updated_at", "name", "email"]).default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const FileUploadSchema = z.object({
  filename: z
    .string()
    .max(255)
    .refine(
      (name) => !name.includes("..") && !name.includes("/") && !name.includes("\\"),
      "Filename must not contain path separators or traversal sequences",
    )
    .refine(
      (name) => /^[a-zA-Z0-9._-]+$/.test(name),
      "Filename contains invalid characters",
    ),
  mimeType: z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "text/plain",
  ]),
  size: z.number().int().min(1).max(10 * 1024 * 1024),
});

const WebhookPayloadSchema = z.object({
  event: z.enum(["order.created", "order.updated", "payment.completed", "payment.failed"]),
  timestamp: z
    .string()
    .datetime()
    .refine(
      (ts) => {
        const diff = Math.abs(Date.now() - new Date(ts).getTime());
        return diff < 5 * 60 * 1000;
      },
      "Timestamp must be within 5 minutes of current time",
    ),
  data: z.record(z.unknown()),
  signature: z.string().min(64).max(128),
});

const SearchQuerySchema = z.object({
  q: z
    .string()
    .max(200)
    .transform((v) => v.trim())
    .refine((v) => v.length >= 2, "Search query must be at least 2 characters"),
  filters: z
    .object({
      status: z.enum(["active", "inactive", "pending"]).optional(),
      createdAfter: z.string().datetime().optional(),
      createdBefore: z.string().datetime().optional(),
      tags: z.array(z.string().max(50)).max(10).optional(),
    })
    .optional(),
});

const UrlInputSchema = z.object({
  url: z
    .string()
    .url()
    .max(2048)
    .refine(
      (url) => {
        const parsed = new URL(url);
        return parsed.protocol === "https:";
      },
      "Only HTTPS URLs are allowed",
    )
    .refine(
      (url) => {
        const parsed = new URL(url);
        const hostname = parsed.hostname;
        if (hostname === "localhost" || hostname === "127.0.0.1") return false;
        if (hostname.startsWith("10.")) return false;
        if (hostname.startsWith("172.") || hostname.startsWith("192.168.")) return false;
        if (hostname === "169.254.169.254") return false;
        if (hostname.endsWith(".internal") || hostname.endsWith(".local")) return false;
        return true;
      },
      "Internal/private URLs are not allowed",
    ),
});

const IdParamSchema = z.object({
  id: z.string().regex(UUID_REGEX, "Invalid ID format"),
});

const SlugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(SLUG_REGEX, "Invalid slug format"),
});

function validateRequest<T extends z.ZodSchema>(
  schema: T,
  data: unknown,
): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    throw new ValidationError("Request validation failed", errors);
  }
  return result.data;
}

class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = "ValidationError";
  }

  toResponse() {
    return {
      error: "validation_error",
      message: this.message,
      details: this.errors,
    };
  }
}

function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function sanitizeForLog(input: string, maxLength = 200): string {
  const sanitized = input
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/\r?\n/g, " ");
  return sanitized.slice(0, maxLength);
}

export {
  UserRegistrationSchema,
  PaginationSchema,
  FileUploadSchema,
  WebhookPayloadSchema,
  SearchQuerySchema,
  UrlInputSchema,
  IdParamSchema,
  SlugParamSchema,
  validateRequest,
  ValidationError,
  sanitizeHtml,
  sanitizeForLog,
};
