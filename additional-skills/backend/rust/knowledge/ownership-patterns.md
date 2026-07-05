---
type: fact
title: "Ownership Patterns in Web Services"
---

# Ownership Patterns in Web Services

How Rust ownership works in the context of HTTP services. The patterns that make the borrow checker happy.

## Arc<State> for Shared State

Axum handlers are `Clone` + `Send` + `'static`. State must be shareable across threads.

```rust
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,           // PgPool is Arc internally
    pub cache: Arc<DashMap<String, CachedValue>>,
    pub config: Arc<Config>,  // Config is read-only, Arc is cheap
}
```

Rule: `Clone` should be cheap. If a field is expensive to clone, wrap in `Arc`.

## Clone for Handlers

Every handler invocation gets its own clone of state. This is why:
- `PgPool` works (it's an `Arc<SharedPool>` internally)
- `Arc<T>` works (reference count bump)
- `String` in state is wrong (cloned every request)

## Lifetimes in Extractors

Extractors that borrow from the request need lifetime annotations:

```rust
// This borrows from request headers -- needs the request to outlive it
pub struct BearerToken<'a>(&'a str);

// For owned data, no lifetime needed (more common in practice)
pub struct AuthUser(pub Claims);  // Claims is owned
```

Prefer owned types in extractors for simplicity. Borrow only for zero-copy parsing of large bodies.

## Moving into Spawned Tasks

`tokio::spawn` requires `'static`. You can't borrow from the enclosing scope.

```rust
// WRONG: borrows `pool`
// tokio::spawn(async { query(&pool).await });

// RIGHT: clone or move
let pool = pool.clone();
tokio::spawn(async move { query(&pool).await });
```

## String vs &str in APIs

```rust
// Public API: accept &str, return String
pub async fn find_by_email(pool: &PgPool, email: &str) -> Result<User> { ... }

// Structs that own data: String
pub struct CreateUserInput {
    pub email: String,  // owns the data from deserialization
    pub name: String,
}

// Internal processing: &str where possible
fn validate_email(email: &str) -> bool { ... }
```

## Vec<T> vs &[T]

Same principle: own at boundaries, borrow internally.

```rust
// Accepts slice (borrows)
fn process_items(items: &[OrderItem]) -> Result<Summary> { ... }

// Returns owned (caller decides lifetime)
async fn fetch_items(pool: &PgPool, order_id: Uuid) -> Result<Vec<OrderItem>> { ... }
```

## When to Use Cow<'_, str>

`Cow` (Clone on Write) for functions that sometimes need to allocate:

```rust
use std::borrow::Cow;

fn normalize_email(input: &str) -> Cow<'_, str> {
    if input.contains(char::is_uppercase) {
        Cow::Owned(input.to_lowercase())
    } else {
        Cow::Borrowed(input)  // no allocation
    }
}
```

Use when: function MIGHT need to modify, but often doesn't. Avoid when: always modifying (just return String).

## The Ownership Decision Tree

1. Does it cross a spawn/thread boundary? -> Own it (move or clone)
2. Is it shared across handlers? -> `Arc<T>` or `Clone`-cheap type
3. Is it a function parameter? -> Borrow (`&T` / `&str` / `&[T]`)
4. Is it returned from async? -> Own it (can't return borrows from async fn easily)
5. Is it in a struct stored long-term? -> Own it (`String`, `Vec<T>`)
6. Is it temporary within a function? -> Borrow from the owner
