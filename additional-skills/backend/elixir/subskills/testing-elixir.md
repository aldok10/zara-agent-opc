---
type: subskill
title: "Testing Elixir"
---

# Testing Elixir

ExUnit, Mox, async tests, property-based testing (StreamData), Wallaby, test isolation.

## Rules

1. `async: true` on all test modules that don't share state  -  Ecto sandbox allows concurrent DB access per test
2. Mox for external dependencies  -  define behaviours, mock at boundaries only
3. `setup` for per-test state, `setup_all` only for truly expensive shared fixtures
4. Test the public API (context functions)  -  don't test GenServer internals directly
5. Property-based tests for pure functions with wide input domains  -  StreamData generators
6. `Ecto.Adapters.SQL.Sandbox` in shared mode for LiveView/integration tests
7. `ExUnit.CaptureLog` for asserting log output without polluting test output
8. Factory pattern with `ex_machina` or custom builders  -  never seed test DB globally
9. Tags for slow/integration tests: `@tag :integration` + `--exclude integration` in config
10. Assert on specific patterns, not entire structs  -  `assert %{status: :ok, id: id} = result`

## Test Structure

```elixir
defmodule MyApp.AccountsTest do
  use MyApp.DataCase, async: true

  alias MyApp.Accounts
  import MyApp.Factory

  describe "create_user/1" do
    test "with valid attrs creates user" do
      attrs = %{email: "test@example.com", name: "Test User"}
      assert {:ok, user} = Accounts.create_user(attrs)
      assert user.email == "test@example.com"
      assert user.confirmed_at == nil
    end

    test "with duplicate email returns error changeset" do
      existing = insert(:user)
      attrs = %{email: existing.email, name: "Other"}
      assert {:error, changeset} = Accounts.create_user(attrs)
      assert errors_on(changeset).email == ["has already been taken"]
    end

    test "with invalid email returns error changeset" do
      assert {:error, changeset} = Accounts.create_user(%{email: "bad", name: "X"})
      assert errors_on(changeset).email == ["has invalid format"]
    end
  end
end
```

## Mox Pattern

```elixir
# Define behaviour:
defmodule MyApp.Mailer.Behaviour do
  @callback send_email(to :: String.t(), subject :: String.t(), body :: String.t()) ::
    :ok | {:error, term()}
end

# In config/test.exs:
config :my_app, :mailer, MyApp.Mailer.Mock

# In test_helper.exs:
Mox.defmock(MyApp.Mailer.Mock, for: MyApp.Mailer.Behaviour)

# In test:
import Mox
setup :verify_on_exit!

test "registration sends welcome email" do
  expect(MyApp.Mailer.Mock, :send_email, fn to, subject, _body ->
    assert to == "new@example.com"
    assert subject =~ "Welcome"
    :ok
  end)

  assert {:ok, _user} = Accounts.register(%{email: "new@example.com", name: "New"})
end
```

## Property-Based Testing

```elixir
use ExUnitProperties

property "encode/decode roundtrips" do
  check all value <- term() do
    assert value == value |> MyApp.Codec.encode() |> MyApp.Codec.decode()
  end
end

property "sort is idempotent" do
  check all list <- list_of(integer()) do
    sorted = Enum.sort(list)
    assert sorted == Enum.sort(sorted)
  end
end
```

## LiveView Testing

```elixir
import Phoenix.LiveViewTest

test "user can submit form", %{conn: conn} do
  {:ok, view, _html} = live(conn, ~p"/posts/new")

  html =
    view
    |> form("#post-form", post: %{title: "Hello", body: "World"})
    |> render_submit()

  assert_redirect(view, ~p"/posts")
end

test "validates on change", %{conn: conn} do
  {:ok, view, _html} = live(conn, ~p"/posts/new")

  html =
    view
    |> form("#post-form", post: %{title: ""})
    |> render_change()

  assert html =~ "can&#39;t be blank"
end
```

## Anti-Patterns

- Testing implementation (internal GenServer state) instead of behaviour (public API)
- `async: false` everywhere  -  dramatically slows test suite
- Mocking modules you own  -  test the real module, mock external boundaries
- Asserting on entire structs  -  brittle, breaks when fields added
- Shared test database state  -  tests must be independent
- `Process.sleep` in tests  -  use `assert_receive` with timeout or `eventually` helpers
- Testing Phoenix controllers without going through the router  -  misses plugs

## Verification

1. `mix test --cover`  -  check coverage on critical paths
2. `mix test --stale`  -  fast feedback during development
3. All async tests pass under `--max-cases 16` (concurrency stress)
4. Mox `verify_on_exit!` catches unmet expectations
5. Property tests run 100+ iterations by default (configurable)
