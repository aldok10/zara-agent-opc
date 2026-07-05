---
type: subskill
title: "Subskill: Error Handling"
---

# Subskill: Error Handling

Rust error design for web services. thiserror for structure, IntoResponse for HTTP, context for debugging.

## Core Pattern: thiserror Enum

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("not found: {0}")]
    NotFound(String),

    #[error("unauthorized")]
    Unauthorized,

    #[error("validation failed: {0}")]
    Validation(String),

    #[error("conflict: {0}")]
    Conflict(String),

    #[error(transparent)]
    Database(#[from] sqlx::Error),

    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}
```

## IntoResponse Implementation

```rust
use axum::{response::{IntoResponse, Response}, http::StatusCode, Json};
use serde_json::json;

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            Self::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, "unauthorized".into()),
            Self::Validation(msg) => (StatusCode::UNPROCESSABLE_ENTITY, msg.clone()),
            Self::Conflict(msg) => (StatusCode::CONFLICT, msg.clone()),
            Self::Database(e) => {
                tracing::error!(error = %e, "database error");
                (StatusCode::INTERNAL_SERVER_ERROR, "internal error".into())
            }
            Self::Internal(e) => {
                tracing::error!(error = ?e, "internal error");
                (StatusCode::INTERNAL_SERVER_ERROR, "internal error".into())
            }
        };

        let body = json!({ "error": message });
        (status, Json(body)).into_response()
    }
}
```

Key: never leak internal details (DB errors, stack traces) to clients. Log them, return generic message.

## Error Context with anyhow

```rust
use anyhow::Context;

async fn process_order(pool: &PgPool, order_id: Uuid) -> Result<Order, AppError> {
    let order = sqlx::query_as!(Order, "SELECT * FROM orders WHERE id = $1", order_id)
        .fetch_optional(pool)
        .await
        .context("failed to query order")?  // adds context to sqlx error
        .ok_or_else(|| AppError::NotFound(format!("order {order_id}")))?;

    Ok(order)
}
```

## From Implementations for Domain Errors

```rust
impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        match e {
            sqlx::Error::RowNotFound => Self::NotFound("resource not found".into()),
            sqlx::Error::Database(ref db_err) if db_err.is_unique_violation() => {
                Self::Conflict("resource already exists".into())
            }
            _ => Self::Database(e),
        }
    }
}
```

## Handler Pattern

```rust
type Result<T> = std::result::Result<T, AppError>;

async fn create_user(
    State(pool): State<PgPool>,
    Json(input): Json<CreateUserInput>,
) -> Result<(StatusCode, Json<User>)> {
    input.validate().map_err(|e| AppError::Validation(e.to_string()))?;

    let user = UserRepo::create(&pool, input).await?;
    Ok((StatusCode::CREATED, Json(user)))
}
```

## Layered Error Strategy

| Layer | Error Type | Tool |
|-------|-----------|------|
| Domain/lib | Specific enum | `thiserror` |
| Application | `AppError` (aggregates domain) | `thiserror` + `From` |
| Handler | `Result<T, AppError>` | `?` operator |
| Response | HTTP status + JSON body | `IntoResponse` |

## Rules

1. One `AppError` per service. Domain crates have their own error types that convert via `From`.
2. `#[error(transparent)]` for wrapping errors you don't want to match on.
3. Never `unwrap` or `expect` in handler code paths.
4. Log at the boundary (IntoResponse), not at every error site.
5. Use `.context()` from anyhow to add human-readable breadcrumbs.
6. Test error responses: assert status codes and body shape in integration tests.
