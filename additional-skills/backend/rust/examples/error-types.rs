//! Comprehensive error handling with thiserror, IntoResponse, and error context.
//!
//! Pattern: domain errors -> app error enum -> HTTP response mapping

#![deny(unsafe_code)]

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

// --- Domain Errors (per module/crate) ---

#[derive(Debug, Error)]
pub enum AuthError {
    #[error("invalid token")]
    InvalidToken,

    #[error("token expired")]
    TokenExpired,

    #[error("missing authorization header")]
    MissingHeader,

    #[error("insufficient permissions: requires {required}")]
    Forbidden { required: String },
}

#[derive(Debug, Error)]
pub enum ValidationError {
    #[error("field `{field}`: {message}")]
    Field { field: String, message: String },

    #[error("multiple validation errors")]
    Multiple(Vec<ValidationError>),
}

// --- Application Error (aggregates all domain errors) ---

#[derive(Debug, Error)]
pub enum AppError {
    #[error("not found: {0}")]
    NotFound(String),

    #[error(transparent)]
    Auth(#[from] AuthError),

    #[error("validation: {0}")]
    Validation(#[from] ValidationError),

    #[error("conflict: {0}")]
    Conflict(String),

    #[error(transparent)]
    Database(#[from] sqlx::Error),

    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

// --- HTTP Response Mapping ---

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = match &self {
            // 404
            Self::NotFound(msg) => (StatusCode::NOT_FOUND, "NOT_FOUND", msg.clone()),

            // 401 / 403
            Self::Auth(AuthError::Forbidden { .. }) => {
                (StatusCode::FORBIDDEN, "FORBIDDEN", self.to_string())
            }
            Self::Auth(_) => (StatusCode::UNAUTHORIZED, "UNAUTHORIZED", self.to_string()),

            // 422
            Self::Validation(e) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "VALIDATION_ERROR",
                e.to_string(),
            ),

            // 409
            Self::Conflict(msg) => (StatusCode::CONFLICT, "CONFLICT", msg.clone()),

            // 500 - never leak internals
            Self::Database(e) => {
                tracing::error!(error = %e, "database error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "INTERNAL_ERROR",
                    "an internal error occurred".into(),
                )
            }
            Self::Internal(e) => {
                tracing::error!(error = ?e, "internal error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "INTERNAL_ERROR",
                    "an internal error occurred".into(),
                )
            }
        };

        let body = json!({
            "error": {
                "code": code,
                "message": message,
            }
        });

        (status, Json(body)).into_response()
    }
}

// --- Smart From implementations ---

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        match &e {
            sqlx::Error::RowNotFound => Self::NotFound("resource not found".into()),
            sqlx::Error::Database(db_err) => {
                // PostgreSQL unique violation
                if db_err.code().map_or(false, |c| c == "23505") {
                    return Self::Conflict("resource already exists".into());
                }
                // Foreign key violation
                if db_err.code().map_or(false, |c| c == "23503") {
                    return Self::Validation(ValidationError::Field {
                        field: "reference".into(),
                        message: "referenced resource does not exist".into(),
                    });
                }
                Self::Database(e)
            }
            _ => Self::Database(e),
        }
    }
}

// --- Usage in handlers ---

use anyhow::Context;
use uuid::Uuid;

pub type Result<T> = std::result::Result<T, AppError>;

async fn get_order(pool: &sqlx::PgPool, order_id: Uuid) -> Result<Order> {
    let order = sqlx::query_as!(
        Order,
        "SELECT id, user_id, total, status FROM orders WHERE id = $1",
        order_id
    )
    .fetch_optional(pool)
    .await
    .context("failed to query order")?  // wraps sqlx error with context
    .ok_or_else(|| AppError::NotFound(format!("order {order_id}")))?;

    Ok(order)
}

async fn cancel_order(pool: &sqlx::PgPool, order_id: Uuid) -> Result<Order> {
    let order = get_order(pool, order_id).await?;

    if order.status != "pending" {
        return Err(AppError::Conflict(format!(
            "cannot cancel order in '{}' status",
            order.status
        )));
    }

    let updated = sqlx::query_as!(
        Order,
        "UPDATE orders SET status = 'cancelled' WHERE id = $1 RETURNING *",
        order_id
    )
    .fetch_one(pool)
    .await
    .context("failed to cancel order")?;

    Ok(updated)
}

// --- Supporting types ---

#[derive(Debug, serde::Serialize)]
pub struct Order {
    pub id: Uuid,
    pub user_id: Uuid,
    pub total: rust_decimal::Decimal,
    pub status: String,
}
