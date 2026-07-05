# Ecto Advanced Patterns

## Ecto.Multi (Transaction Composition)

```elixir
# Multi operations are named steps, composable, and explicit about dependencies
Ecto.Multi.new()
|> Ecto.Multi.insert(:user, User.changeset(%User{}, attrs))
|> Ecto.Multi.insert(:profile, fn %{user: user} ->
  Profile.changeset(%Profile{user_id: user.id}, profile_attrs)
end)
|> Ecto.Multi.run(:send_email, fn _repo, %{user: user} ->
  Mailer.send_welcome(user)
end)
|> Repo.transaction()
# Returns {:ok, %{user: user, profile: profile, send_email: result}}
# Or {:error, failed_step, changeset, changes_so_far}
```

## Fragments (Raw SQL in Queries)

```elixir
# Type-safe SQL fragments within Ecto queries:
from(p in Post,
  where: fragment("? @> ?", p.tags, ^["elixir", "otp"]),
  where: fragment("tsearch @@ to_tsquery(?)", ^search_term),
  order_by: fragment("similarity(?, ?) DESC", p.title, ^query)
)
```

## Dynamic Queries

```elixir
def filter(params) do
  Post
  |> apply_filters(params)
  |> Repo.all()
end

defp apply_filters(query, params) do
  Enum.reduce(params, query, fn
    {:status, status}, q -> where(q, [p], p.status == ^status)
    {:author_id, id}, q -> where(q, [p], p.author_id == ^id)
    {:search, term}, q -> where(q, [p], ilike(p.title, ^"%#{term}%"))
    {:sort, {field, dir}}, q -> order_by(q, [p], [{^dir, ^field}])
    _, q -> q
  end)
end

# With Ecto.Query.dynamic for complex conditions:
def build_filter(params) do
  conditions = true

  conditions =
    if params[:status],
      do: dynamic([p], ^conditions and p.status == ^params.status),
      else: conditions

  conditions =
    if params[:min_price],
      do: dynamic([p], ^conditions and p.price >= ^params.min_price),
      else: conditions

  from(p in Post, where: ^conditions)
end
```

## Schemaless Changesets

For forms/APIs that don't map directly to a table:

```elixir
# No schema needed — define types inline:
types = %{email: :string, message: :string, priority: Ecto.Enum, values: [:low, :normal, :high]}
data = %{}

{data, types}
|> Ecto.Changeset.cast(params, Map.keys(types))
|> Ecto.Changeset.validate_required([:email, :message])
|> Ecto.Changeset.validate_format(:email, ~r/@/)
|> Ecto.Changeset.validate_length(:message, min: 10, max: 1000)
```

## Embedded Schemas

For JSON columns or nested form data:

```elixir
defmodule MyApp.Order do
  use Ecto.Schema

  schema "orders" do
    field :status, Ecto.Enum, values: [:pending, :paid, :shipped]
    embeds_many :line_items, LineItem, on_replace: :delete
    timestamps()
  end

  defmodule LineItem do
    use Ecto.Schema

    embedded_schema do
      field :product_name, :string
      field :quantity, :integer
      field :unit_price, :decimal
    end
  end
end
```

## Upserts

```elixir
Repo.insert(
  changeset,
  on_conflict: {:replace, [:name, :updated_at]},
  conflict_target: :external_id,
  returning: true
)

# Bulk upsert:
Repo.insert_all(Product, products,
  on_conflict: {:replace_all_except, [:id, :inserted_at]},
  conflict_target: :sku
)
```

## Lateral Joins & Subqueries

```elixir
# Top N per group (lateral join equivalent):
recent_posts =
  from(p in Post,
    where: p.author_id == parent_as(:author).id,
    order_by: [desc: p.inserted_at],
    limit: 3,
    select: p
  )

from(a in Author, as: :author,
  lateral_join: p in subquery(recent_posts), on: true,
  select: {a.name, p.title}
)
```

## Query Prefixes (Multi-Tenancy)

```elixir
# Per-query prefix:
Repo.all(Post, prefix: "tenant_acme")

# In migration:
def change do
  create table(:posts, prefix: "tenant_acme") do
    add :title, :string
    timestamps()
  end
end

# Dynamic prefix in queries:
from(p in {"tenant_acme.posts", Post})
```

## Repo Patterns

```elixir
# Pagination helper:
def paginate(query, page, per_page) do
  entries = Repo.all(from q in query, limit: ^per_page, offset: ^((page - 1) * per_page))
  count = Repo.aggregate(query, :count)
  %{entries: entries, page: page, per_page: per_page, total: count}
end

# Exists? check (efficient):
Repo.exists?(from p in Post, where: p.slug == ^slug)
```
