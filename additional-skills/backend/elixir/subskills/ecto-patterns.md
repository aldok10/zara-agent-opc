# Ecto Patterns

Ecto: multi-tenancy, composable queries, custom types, migrations, Repo patterns.

## Rules

1. Changesets at every boundary  -  never `Repo.insert(%Schema{})` without changeset validation
2. Composable queries: build query pipelines with functions, each adding one concern
3. `Ecto.Multi` for operations that must succeed/fail together  -  explicit transaction composition
4. Migrations must be reversible  -  always define `down` or use `execute("up SQL", "down SQL")`
5. Use `Repo.preload` explicitly  -  never rely on implicit loading, plan your data access
6. Custom Ecto types for domain values (money, slugs, enums)  -  type safety at the schema layer
7. `Repo.get!` for guaranteed-existing records  -  `Repo.get` returns nil for user-facing lookups
8. Index every foreign key column  -  also add composite indexes for common query patterns
9. `from(q in query)` for composable subqueries  -  avoid hardcoding conditions
10. Schemaless changesets for forms/inputs that don't map 1:1 to tables
11. `Repo.transaction` with explicit `Repo.rollback`  -  never let exceptions be your rollback mechanism
12. Use `on_conflict` with `conflict_target` for upserts  -  avoid race conditions

## Composable Queries

```elixir
defmodule MyApp.Products.Query do
  import Ecto.Query

  def base, do: from(p in MyApp.Products.Product, as: :product)

  def active(query), do: where(query, [product: p], p.status == :active)

  def by_category(query, category_id),
    do: where(query, [product: p], p.category_id == ^category_id)

  def priced_between(query, min, max),
    do: where(query, [product: p], p.price >= ^min and p.price <= ^max)

  def with_category(query),
    do: join(query, :left, [product: p], c in assoc(p, :category), as: :category)

  def ordered(query, field \\ :inserted_at, dir \\ :desc),
    do: order_by(query, [product: p], [{^dir, field(p, ^field)}])

  def paginate(query, page, per_page) do
    offset = (page - 1) * per_page
    query |> limit(^per_page) |> offset(^offset)
  end
end
```

## Multi-Tenancy (Schema-Based)

```elixir
# In Repo:
defmodule MyApp.Repo do
  use Ecto.Repo, otp_app: :my_app

  @impl true
  def default_options(_operation) do
    [prefix: get_tenant()]
  end

  def put_tenant(tenant), do: Process.put(:tenant, tenant)
  def get_tenant, do: Process.get(:tenant, "public")
end

# In Plug:
def call(conn, _opts) do
  tenant = conn.assigns[:current_org].schema_prefix
  MyApp.Repo.put_tenant(tenant)
  conn
end

# Migrations per tenant:
Ecto.Migrator.run(MyApp.Repo, path, :up, prefix: tenant_prefix)
```

## Ecto.Multi

```elixir
def transfer_funds(from_id, to_id, amount) do
  Ecto.Multi.new()
  |> Ecto.Multi.one(:from, from(a in Account, where: a.id == ^from_id, lock: "FOR UPDATE"))
  |> Ecto.Multi.run(:validate, fn _repo, %{from: from} ->
    if from.balance >= amount, do: {:ok, from}, else: {:error, :insufficient_funds}
  end)
  |> Ecto.Multi.update(:debit, fn %{from: from} ->
    Account.changeset(from, %{balance: from.balance - amount})
  end)
  |> Ecto.Multi.update(:credit, fn _changes ->
    from(a in Account, where: a.id == ^to_id)
    |> Repo.one!()
    |> Account.changeset(%{balance: a.balance + amount})
  end)
  |> Repo.transaction()
end
```

## Custom Type

```elixir
defmodule MyApp.Types.Money do
  use Ecto.Type

  def type, do: :integer

  def cast(%{amount: amount, currency: currency}) when is_integer(amount),
    do: {:ok, %{amount: amount, currency: currency}}
  def cast(_), do: :error

  def load(cents) when is_integer(cents),
    do: {:ok, %{amount: cents, currency: :USD}}

  def dump(%{amount: amount}) when is_integer(amount), do: {:ok, amount}
  def dump(_), do: :error
end
```

## Migration Best Practices

```elixir
defmodule MyApp.Repo.Migrations.AddProductsIndex do
  use Ecto.Migration

  # Concurrent index won't lock table
  @disable_ddl_transaction true
  @disable_migration_lock true

  def change do
    create index(:products, [:category_id, :status],
      concurrently: true,
      where: "status = 'active'")
  end
end
```

## Anti-Patterns

- `Repo.insert(%Schema{field: val})`  -  bypasses changeset validation entirely
- `Repo.all(Schema)` without limit  -  unbounded queries on growing tables
- N+1 in loops (`Enum.map(items, fn i -> Repo.preload(i, :assoc) end)`)  -  preload before loop
- Raw SQL for everything Ecto can express  -  lose composability, type safety, migration tracking
- `Repo.get_by!` in user-facing code  -  crashes on nil, use `get_by` + handle nil
- Putting Repo calls in schemas  -  schemas are data, contexts own persistence

## Verification

1. `mix ecto.migrate` + `mix ecto.rollback`  -  both directions work
2. `mix test --trace`  -  verify query counts (no N+1)
3. Check `explain analyze` on hot queries in dev
4. Verify indexes exist for all WHERE/JOIN columns
5. Multi operations roll back fully on any step failure
