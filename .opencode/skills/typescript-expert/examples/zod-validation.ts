import { z } from "zod";

const EmailSchema = z
  .string()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase().trim());

const PasswordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[A-Z]/, "Must contain uppercase")
  .regex(/[0-9]/, "Must contain digit")
  .regex(/[^A-Za-z0-9]/, "Must contain special character");

const AddressSchema = z.object({
  street: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  state: z.string().length(2).transform((v) => v.toUpperCase()),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
  country: z.string().length(2).default("US"),
});

const CreateUserSchema = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
    confirmPassword: z.string(),
    name: z.string().min(1).max(100),
    address: AddressSchema.optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type CreateUserInput = z.infer<typeof CreateUserSchema>;

const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["name", "email", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

type PaginationParams = z.infer<typeof PaginationSchema>;

function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { data: T } | { errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { data: result.data };
  }
  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  );
  return { errors };
}

export { CreateUserSchema, PaginationSchema, validateRequest };
export type { CreateUserInput, PaginationParams };
