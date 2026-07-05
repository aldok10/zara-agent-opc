/**
 * Form type utilities with discriminated unions.
 * Demonstrates: utility types, satisfies, discriminated unions, state machines.
 */

// --- Base domain model ---
interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "moderator";
  avatar: string | null;
  bio: string;
  createdAt: Date;
  updatedAt: Date;
}

// --- Utility: make specific keys optional ---
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// --- Utility: make specific keys required ---
type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// --- Derive form types from model ---
type CreateUserInput = Omit<User, "id" | "createdAt" | "updatedAt">;
type UpdateUserInput = Partial<Omit<User, "id" | "createdAt" | "updatedAt">>;
type UserProfileForm = Pick<User, "name" | "bio" | "avatar">;

// --- Form field state (discriminated union) ---
type FieldState<T> =
  | { status: "pristine"; value: T }
  | { status: "dirty"; value: T; originalValue: T }
  | { status: "validating"; value: T }
  | { status: "valid"; value: T }
  | { status: "invalid"; value: T; errors: string[] };

// --- Form state machine ---
type FormState<TFields extends Record<string, unknown>> =
  | { status: "idle"; fields: { [K in keyof TFields]: FieldState<TFields[K]> } }
  | { status: "submitting"; fields: { [K in keyof TFields]: FieldState<TFields[K]> } }
  | { status: "submitted"; fields: { [K in keyof TFields]: FieldState<TFields[K]> } }
  | { status: "error"; fields: { [K in keyof TFields]: FieldState<TFields[K]> }; error: string };

// --- Field validation rules ---
type ValidationRule<T> = {
  validate: (value: T) => boolean;
  message: string;
};

type FieldConfig<T> = {
  defaultValue: T;
  rules: ValidationRule<T>[];
};

// --- Form config with satisfies validation ---
const userFormConfig = {
  name: {
    defaultValue: "",
    rules: [
      { validate: (v: string) => v.length >= 2, message: "Name must be at least 2 characters" },
      { validate: (v: string) => v.length <= 50, message: "Name must be at most 50 characters" },
    ],
  },
  email: {
    defaultValue: "",
    rules: [
      { validate: (v: string) => v.includes("@"), message: "Must be a valid email" },
      { validate: (v: string) => v.length > 0, message: "Email is required" },
    ],
  },
  role: {
    defaultValue: "user" as const,
    rules: [
      {
        validate: (v: "admin" | "user" | "moderator") => ["admin", "user", "moderator"].includes(v),
        message: "Invalid role",
      },
    ],
  },
  bio: {
    defaultValue: "",
    rules: [
      { validate: (v: string) => v.length <= 500, message: "Bio must be under 500 characters" },
    ],
  },
} satisfies Record<string, FieldConfig<unknown>>;

// --- Extract field types from config ---
type FieldValues<TConfig extends Record<string, FieldConfig<unknown>>> = {
  [K in keyof TConfig]: TConfig[K]["defaultValue"];
};

type UserFormValues = FieldValues<typeof userFormConfig>;
// { name: string; email: string; role: "user"; bio: string }

// --- Form actions (discriminated union) ---
type FormAction<TFields extends Record<string, unknown>> =
  | { type: "SET_FIELD"; field: keyof TFields; value: TFields[keyof TFields] }
  | { type: "VALIDATE_FIELD"; field: keyof TFields }
  | { type: "SUBMIT" }
  | { type: "SUBMIT_SUCCESS" }
  | { type: "SUBMIT_ERROR"; error: string }
  | { type: "RESET" };

// --- Typed form reducer ---
function createFormReducer<TFields extends Record<string, unknown>>() {
  return function reducer(
    state: FormState<TFields>,
    action: FormAction<TFields>
  ): FormState<TFields> {
    switch (action.type) {
      case "SET_FIELD": {
        const field = state.fields[action.field];
        return {
          ...state,
          status: "idle",
          fields: {
            ...state.fields,
            [action.field]: {
              status: "dirty",
              value: action.value,
              originalValue: field.value,
            } satisfies FieldState<unknown>,
          },
        };
      }
      case "SUBMIT":
        return { ...state, status: "submitting" };
      case "SUBMIT_SUCCESS":
        return { ...state, status: "submitted" };
      case "SUBMIT_ERROR":
        return { ...state, status: "error", error: action.error };
      case "RESET": {
        const resetFields = Object.fromEntries(
          Object.entries(state.fields).map(([key, field]) => [
            key,
            { status: "pristine" as const, value: field.value },
          ])
        ) as FormState<TFields>["fields"];
        return { status: "idle", fields: resetFields };
      }
      case "VALIDATE_FIELD":
        return state; // simplified
      default: {
        const _exhaustive: never = action;
        return _exhaustive;
      }
    }
  };
}

// --- Conditional required fields based on context ---
type ConditionalForm<TRole extends User["role"]> = TRole extends "admin"
  ? RequiredBy<UserProfileForm, "avatar">
  : PartialBy<UserProfileForm, "avatar">;

// Admin must have avatar, regular users it's optional
type AdminProfile = ConditionalForm<"admin">; // avatar required
type UserProfile = ConditionalForm<"user">; // avatar optional

export {
  type FieldState,
  type FormState,
  type FormAction,
  type FieldConfig,
  type ValidationRule,
  type PartialBy,
  type RequiredBy,
  type CreateUserInput,
  type UpdateUserInput,
  createFormReducer,
  userFormConfig,
};
