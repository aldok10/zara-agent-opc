/**
 * Component test example using React Testing Library + Vitest.
 *
 * Demonstrates:
 * - Query by role/label (accessible queries)
 * - userEvent for realistic interactions
 * - Async testing with waitFor
 * - Testing form submission
 * - Accessibility assertions
 * - MSW for network mocking
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

// Component under test
import { TodoApp } from "./todo-app";

// --- MSW Setup ---
const server = setupServer(
  http.get("/api/todos", () => {
    return HttpResponse.json([
      { id: "1", title: "Write tests", completed: false },
      { id: "2", title: "Ship feature", completed: true },
    ]);
  }),
  http.post("/api/todos", async ({ request }) => {
    const body = (await request.json()) as { title: string };
    return HttpResponse.json(
      { id: "3", title: body.title, completed: false },
      { status: 201 },
    );
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// --- Tests ---
describe("TodoApp", () => {
  beforeEach(() => {
    // Fresh user instance per test (recommended by RTL)
    vi.clearAllMocks();
  });

  it("renders todo list after loading", async () => {
    render(<TodoApp />);

    // Verify loading state
    expect(screen.getByRole("status")).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByRole("list")).toBeInTheDocument();
    });

    // Verify items rendered
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Write tests")).toBeInTheDocument();
    expect(screen.getByText("Ship feature")).toBeInTheDocument();
  });

  it("adds a new todo via form submission", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByRole("list")).toBeInTheDocument();
    });

    // Fill in the form
    const input = screen.getByLabelText(/new todo/i);
    await user.type(input, "Deploy to prod");

    // Submit
    const submitButton = screen.getByRole("button", { name: /add/i });
    await user.click(submitButton);

    // Verify new item appears
    await waitFor(() => {
      expect(screen.getByText("Deploy to prod")).toBeInTheDocument();
    });

    // Input should be cleared
    expect(input).toHaveValue("");
  });

  it("shows error when API fails", async () => {
    // Override handler for this test
    server.use(
      http.get("/api/todos", () => {
        return HttpResponse.json({ error: "Server error" }, { status: 500 });
      }),
    );

    render(<TodoApp />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/failed to load/i);
    });
  });

  it("disables submit button while pending", async () => {
    const user = userEvent.setup();

    // Slow response to catch pending state
    server.use(
      http.post("/api/todos", async () => {
        await new Promise((r) => setTimeout(r, 100));
        return HttpResponse.json({ id: "4", title: "test", completed: false });
      }),
    );

    render(<TodoApp />);
    await waitFor(() => screen.getByRole("list"));

    await user.type(screen.getByLabelText(/new todo/i), "Test item");
    await user.click(screen.getByRole("button", { name: /add/i }));

    // Button should be disabled during submission
    expect(screen.getByRole("button", { name: /adding/i })).toBeDisabled();

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add/i })).toBeEnabled();
    });
  });

  it("has no accessibility violations in form", async () => {
    render(<TodoApp />);
    await waitFor(() => screen.getByRole("list"));

    // Verify form is accessible
    const input = screen.getByLabelText(/new todo/i);
    expect(input).toHaveAttribute("type", "text");
    expect(input).toBeRequired();

    // Button has accessible name
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
  });

  it("marks completed todos visually", async () => {
    render(<TodoApp />);

    await waitFor(() => {
      expect(screen.getByRole("list")).toBeInTheDocument();
    });

    // "Ship feature" is completed
    const completedItem = screen.getByText("Ship feature");
    expect(completedItem.closest("li")).toHaveAttribute("data-completed", "true");
  });
});
