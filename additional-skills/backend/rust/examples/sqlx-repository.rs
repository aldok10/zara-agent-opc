//! Repository pattern with sqlx, compile-time queries, and transactions.
//!
//! Demonstrates: query_as!, transactions, pagination, soft delete.

#![deny(unsafe_code)]

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

// --- Models ---

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub password_hash: String,
    pub active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct Order {
    pub id: Uuid,
    pub user_id: Uuid,
    pub total_cents: i64,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct OrderItem {
    pub id: Uuid,
    pub order_id: Uuid,
    pub product_id: Uuid,
    pub quantity: i32,
    pub unit_price_cents: i64,
}

// --- Input types ---

#[derive(Debug, Deserialize)]
pub struct CreateUserInput {
    pub email: String,
    pub name: String,
    pub password_hash: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateOrderInput {
    pub user_id: Uuid,
    pub items: Vec<CreateOrderItemInput>,
}

#[derive(Debug, Deserialize)]
pub struct CreateOrderItemInput {
    pub product_id: Uuid,
    pub quantity: i32,
    pub unit_price_cents: i64,
}

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: u32,
    pub page_size: u32,
}

impl PaginationParams {
    pub fn offset(&self) -> i64 {
        ((self.page.saturating_sub(1)) * self.page_size) as i64
    }

    pub fn limit(&self) -> i64 {
        self.page_size.min(100) as i64
    }
}

// --- User Repository ---

pub struct UserRepo;

impl UserRepo {
    pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<User>, sqlx::Error> {
        sqlx::query_as!(
            User,
            "SELECT * FROM users WHERE id = $1 AND active = true",
            id
        )
        .fetch_optional(pool)
        .await
    }

    pub async fn find_by_email(pool: &PgPool, email: &str) -> Result<Option<User>, sqlx::Error> {
        sqlx::query_as!(
            User,
            "SELECT * FROM users WHERE email = $1 AND active = true",
            email
        )
        .fetch_optional(pool)
        .await
    }

    pub async fn list(
        pool: &PgPool,
        params: &PaginationParams,
    ) -> Result<Vec<User>, sqlx::Error> {
        sqlx::query_as!(
            User,
            r#"
            SELECT * FROM users
            WHERE active = true
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
            params.limit(),
            params.offset(),
        )
        .fetch_all(pool)
        .await
    }

    pub async fn count(pool: &PgPool) -> Result<i64, sqlx::Error> {
        let row = sqlx::query_scalar!("SELECT count(*) FROM users WHERE active = true")
            .fetch_one(pool)
            .await?;
        Ok(row.unwrap_or(0))
    }

    pub async fn create(pool: &PgPool, input: CreateUserInput) -> Result<User, sqlx::Error> {
        sqlx::query_as!(
            User,
            r#"
            INSERT INTO users (id, email, name, password_hash, active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, true, now(), now())
            RETURNING *
            "#,
            Uuid::new_v4(),
            input.email,
            input.name,
            input.password_hash,
        )
        .fetch_one(pool)
        .await
    }

    pub async fn update_name(
        pool: &PgPool,
        id: Uuid,
        name: &str,
    ) -> Result<Option<User>, sqlx::Error> {
        sqlx::query_as!(
            User,
            r#"
            UPDATE users SET name = $1, updated_at = now()
            WHERE id = $2 AND active = true
            RETURNING *
            "#,
            name,
            id,
        )
        .fetch_optional(pool)
        .await
    }

    /// Soft delete: sets active = false
    pub async fn delete(pool: &PgPool, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query!(
            "UPDATE users SET active = false, updated_at = now() WHERE id = $1 AND active = true",
            id
        )
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }
}

// --- Order Repository (with transactions) ---

pub struct OrderRepo;

impl OrderRepo {
    /// Creates an order with items in a single transaction.
    pub async fn create(
        pool: &PgPool,
        input: CreateOrderInput,
    ) -> Result<Order, sqlx::Error> {
        let mut tx = pool.begin().await?;

        // Calculate total
        let total_cents: i64 = input
            .items
            .iter()
            .map(|item| item.unit_price_cents * item.quantity as i64)
            .sum();

        // Insert order
        let order = sqlx::query_as!(
            Order,
            r#"
            INSERT INTO orders (id, user_id, total_cents, status, created_at)
            VALUES ($1, $2, $3, 'pending', now())
            RETURNING *
            "#,
            Uuid::new_v4(),
            input.user_id,
            total_cents,
        )
        .fetch_one(&mut *tx)
        .await?;

        // Insert order items
        for item in &input.items {
            sqlx::query!(
                r#"
                INSERT INTO order_items (id, order_id, product_id, quantity, unit_price_cents)
                VALUES ($1, $2, $3, $4, $5)
                "#,
                Uuid::new_v4(),
                order.id,
                item.product_id,
                item.quantity,
                item.unit_price_cents,
            )
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;
        Ok(order)
    }

    pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<Order>, sqlx::Error> {
        sqlx::query_as!(Order, "SELECT * FROM orders WHERE id = $1", id)
            .fetch_optional(pool)
            .await
    }

    pub async fn find_items(
        pool: &PgPool,
        order_id: Uuid,
    ) -> Result<Vec<OrderItem>, sqlx::Error> {
        sqlx::query_as!(
            OrderItem,
            "SELECT * FROM order_items WHERE order_id = $1",
            order_id
        )
        .fetch_all(pool)
        .await
    }

    pub async fn update_status(
        pool: &PgPool,
        id: Uuid,
        status: &str,
    ) -> Result<Option<Order>, sqlx::Error> {
        sqlx::query_as!(
            Order,
            "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
            status,
            id,
        )
        .fetch_optional(pool)
        .await
    }

    /// Find orders by user with pagination
    pub async fn find_by_user(
        pool: &PgPool,
        user_id: Uuid,
        params: &PaginationParams,
    ) -> Result<Vec<Order>, sqlx::Error> {
        sqlx::query_as!(
            Order,
            r#"
            SELECT * FROM orders
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#,
            user_id,
            params.limit(),
            params.offset(),
        )
        .fetch_all(pool)
        .await
    }
}
