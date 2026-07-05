---
type: subskill
title: "Subskill: Database with sqlx"
---

# Subskill: Database with sqlx

sqlx patterns for Rust backends. Compile-time checked queries, migrations, transactions, pooling.

## Connection Pool Setup

```rust
use sqlx::postgres::PgPoolOptions;

let pool = PgPoolOptions::new()
    .max_connections(20)
    .min_connections(5)
    .acquire_timeout(Duration::from_secs(3))
    .idle_timeout(Duration::from_secs(600))
    .connect(&database_url)
    .await?;

// Verify connection at startup
pool.acquire().await?;
```

Pass `PgPool` via Axum state. It's `Clone` (internally `Arc`).

## Compile-Time Queries

```rust
// query_as! maps to a struct
let user = sqlx::query_as!(
    User,
    r#"SELECT id, email, name, created_at FROM users WHERE id = $1"#,
    user_id
)
.fetch_optional(&pool)
.await?;

// query! for ad-hoc (returns anonymous struct)
let row = sqlx::query!(
    "SELECT count(*) as count FROM users WHERE active = $1",
    true
)
.fetch_one(&pool)
.await?;
let count = row.count.unwrap_or(0);
```

Requires `DATABASE_URL` at compile time. Use `sqlx prepare` for CI without DB.

## Migrations

```
migrations/
├── 20240101000000_create_users.sql
├── 20240102000000_add_user_email_index.sql
└── 20240103000000_create_orders.sql
```

```rust
// Run at startup
sqlx::migrate!("./migrations").run(&pool).await?;
```

CLI: `sqlx migrate add create_users` generates timestamped file.

## Transactions

```rust
async fn create_order(pool: &PgPool, input: CreateOrderInput) -> Result<Order, AppError> {
    let mut tx = pool.begin().await?;

    let order = sqlx::query_as!(
        Order,
        r#"INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING *"#,
        input.user_id,
        input.total
    )
    .fetch_one(&mut *tx)
    .await?;

    for item in &input.items {
        sqlx::query!(
            "INSERT INTO order_items (order_id, product_id, qty) VALUES ($1, $2, $3)",
            order.id,
            item.product_id,
            item.quantity
        )
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(order)
}
```

Transaction auto-rolls-back on drop if not committed.

## Repository Pattern

```rust
pub struct UserRepo;

impl UserRepo {
    pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<User>, sqlx::Error> {
        sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id)
            .fetch_optional(pool)
            .await
    }

    pub async fn find_by_email(pool: &PgPool, email: &str) -> Result<Option<User>, sqlx::Error> {
        sqlx::query_as!(User, "SELECT * FROM users WHERE email = $1", email)
            .fetch_optional(pool)
            .await
    }

    pub async fn create(pool: &PgPool, input: CreateUser) -> Result<User, sqlx::Error> {
        sqlx::query_as!(
            User,
            "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *",
            input.email,
            input.name,
            input.password_hash
        )
        .fetch_one(pool)
        .await
    }
}
```

## Offline Mode (CI without DB)

```bash
# Generate query metadata
cargo sqlx prepare --workspace

# Check in CI (no DB needed)
cargo sqlx prepare --check --workspace
```

Stores query metadata in `.sqlx/` directory. Commit this to version control.

## Type Mappings

| Postgres | Rust |
|----------|------|
| `UUID` | `Uuid` (uuid crate) |
| `TIMESTAMPTZ` | `chrono::DateTime<Utc>` or `time::OffsetDateTime` |
| `JSONB` | `sqlx::types::Json<T>` |
| `TEXT[]` | `Vec<String>` |
| `BIGINT` | `i64` |
| `NUMERIC` | `rust_decimal::Decimal` |

## Rules

1. Always `fetch_optional` when a row might not exist. Never `fetch_one` and handle `RowNotFound`.
2. Use `RETURNING *` for insert/update to avoid a second query.
3. Transactions for multi-statement operations. No "hope both succeed" patterns.
4. Run migrations at startup, not as a separate deployment step (simpler, atomic).
5. Index your WHERE clauses. sqlx won't warn about missing indexes.
6. Use `query_scalar!` for single-value queries (COUNT, EXISTS).
