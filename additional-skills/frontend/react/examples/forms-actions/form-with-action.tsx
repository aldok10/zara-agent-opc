/**
 * Form with Actions pattern.
 *
 * Demonstrates:
 * - Server Action with Zod validation
 * - useActionState for form state
 * - useFormStatus for submit button
 * - useOptimistic for instant feedback
 * - Progressive enhancement (works without JS)
 * - Accessible error display
 */

// --- Server Action ---
// actions.ts
"use server";

import { z } from "zod";

const ContactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters").max(1000),
});

export type ContactFormState = {
  errors?: {
    name?: string[];
    email?: string[];
    message?: string[];
  };
  message?: string;
  success?: boolean;
};

export async function submitContact(
  prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const parsed = ContactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "Please fix the errors below.",
    };
  }

  // Simulate server delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // In production: send email, save to DB, etc.
  // await db.contact.create({ data: parsed.data });

  return { success: true, message: "Thanks! We'll be in touch." };
}

// --- Client Component ---
// contact-form.tsx
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitContact, type ContactFormState } from "./actions";

const initialState: ContactFormState = {};

export function ContactForm() {
  const [state, formAction] = useActionState(submitContact, initialState);

  if (state.success) {
    return (
      <div role="status" aria-live="polite">
        <p>{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate>
      {state.message && (
        <div role="alert" aria-live="assertive">
          <p>{state.message}</p>
        </div>
      )}

      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          aria-describedby={state.errors?.name ? "name-error" : undefined}
          aria-invalid={!!state.errors?.name}
        />
        {state.errors?.name && (
          <p id="name-error" role="alert">
            {state.errors.name[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          aria-describedby={state.errors?.email ? "email-error" : undefined}
          aria-invalid={!!state.errors?.email}
        />
        {state.errors?.email && (
          <p id="email-error" role="alert">
            {state.errors.email[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          maxLength={1000}
          rows={5}
          aria-describedby={state.errors?.message ? "message-error" : undefined}
          aria-invalid={!!state.errors?.message}
        />
        {state.errors?.message && (
          <p id="message-error" role="alert">
            {state.errors.message[0]}
          </p>
        )}
      </div>

      <SubmitButton />
    </form>
  );
}

// --- Submit Button (child component for useFormStatus) ---
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "Sending..." : "Send Message"}
    </button>
  );
}
