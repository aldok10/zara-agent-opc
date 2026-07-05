---
type: fact
title: "Elixir Patterns"
---

# Elixir Patterns

## with/else (Happy Path Pipelines)

```elixir
# Each step pattern-matches; else handles all failure cases
def register_user(params) do
  with {:ok, validated} <- validate_params(params),
       {:ok, user} <- Accounts.create_user(validated),
       {:ok, _token} <- Accounts.send_confirmation(user) do
    {:ok, user}
  else
    {:error, %Ecto.Changeset{} = changeset} -> {:error, :validation, changeset}
    {:error, :email_taken} -> {:error, :conflict, "Email already registered"}
    {:error, :mail_service_down} -> {:error, :temporary, "Try again later"}
  end
end
```

Rules:
- Each step returns `{:ok, value}` or `{:error, reason}`
- `else` matches on the FIRST non-matching value
- Keep `with` chains under 5 steps  -  extract sub-functions beyond that

## Pipe Operator

```elixir
# Data flows left to right, each function takes previous result as first arg
user_params
|> Map.put(:role, :member)
|> User.changeset()
|> Repo.insert()
```

Rules:
- First argument must be the "subject"  -  reshape functions to take data first
- Don't pipe into anonymous functions  -  extract named function
- Don't pipe `case`/`if`  -  use `then/1` if needed: `value |> then(&if(&1 > 0, do: &1, else: 0))`

## Protocols (Polymorphism)

```elixir
# Define protocol:
defprotocol Renderable do
  @doc "Renders the entity to a map for JSON serialization"
  def render(entity)
end

# Implement for each type:
defimpl Renderable, for: MyApp.Post do
  def render(post) do
    %{id: post.id, title: post.title, body: post.body}
  end
end

defimpl Renderable, for: MyApp.Comment do
  def render(comment) do
    %{id: comment.id, body: comment.body, author: comment.author_name}
  end
end
```

Use when: different types need same operation with different implementations.
Don't use when: you control all types  -  multi-clause function is simpler.

## Behaviours (Contracts)

```elixir
# Define contract:
defmodule MyApp.PaymentGateway do
  @callback charge(amount :: pos_integer(), currency :: atom(), token :: String.t()) ::
    {:ok, transaction_id :: String.t()} | {:error, reason :: atom()}

  @callback refund(transaction_id :: String.t()) ::
    {:ok, refund_id :: String.t()} | {:error, reason :: atom()}
end

# Implement:
defmodule MyApp.PaymentGateway.Stripe do
  @behaviour MyApp.PaymentGateway

  @impl true
  def charge(amount, currency, token) do
    # Stripe API call
  end

  @impl true
  def refund(transaction_id) do
    # Stripe refund
  end
end
```

Use when: swappable implementations (payment, mailer, storage), testing with Mox.

## Pattern Matching in Function Heads

```elixir
# Multi-clause functions  -  each clause handles a specific case
def handle_response({:ok, %{status: 200, body: body}}), do: {:ok, Jason.decode!(body)}
def handle_response({:ok, %{status: 404}}), do: {:error, :not_found}
def handle_response({:ok, %{status: 429}}), do: {:error, :rate_limited}
def handle_response({:ok, %{status: status}}) when status >= 500, do: {:error, :server_error}
def handle_response({:error, %{reason: reason}}), do: {:error, {:connection, reason}}

# Guard clauses for runtime checks:
def process(value) when is_binary(value), do: String.trim(value)
def process(value) when is_integer(value), do: Integer.to_string(value)
def process(value) when is_list(value), do: Enum.join(value, ", ")
```

## Macros (Use Sparingly)

Compile-time code generation. Only when:
- You need to reduce boilerplate across many modules (not just 2-3)
- The pattern is stable and well-understood
- You've exhausted functions, protocols, behaviours first

```elixir
# Good: well-scoped, eliminates repeated pattern
defmacro route(method, path, handler) do
  quote do
    def handle(%{method: unquote(method), path: unquote(path)} = conn) do
      unquote(handler).(conn)
    end
  end
end
```

Anti-patterns:
- Macros for "DSL coolness"  -  confuses developers, breaks tooling
- Macros that could be functions  -  if it doesn't need compile-time, don't use macros
- Nested macros  -  extremely hard to debug

## Recursion Patterns

```elixir
# Tail-recursive with accumulator:
def sum(list), do: do_sum(list, 0)
defp do_sum([], acc), do: acc
defp do_sum([head | tail], acc), do: do_sum(tail, acc + head)

# Body recursion (ok for tree traversal, avoid for lists):
def depth(%{children: []}), do: 0
def depth(%{children: children}) do
  1 + (children |> Enum.map(&depth/1) |> Enum.max())
end
```

Note: `Enum.reduce/3` preferred over manual recursion for most list operations.
