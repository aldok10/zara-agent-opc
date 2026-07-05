---
type: fact
title: "Testing Rust Web Services"
---

# Testing Rust

Testing patterns for Axum/Tokio backends. Unit, integration, property-based.

## Unit Tests (in-module)

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_email() {
        assert!(validate_email("user@example.com"));
        assert!(!validate_email("invalid"));
        assert!(!validate_email(""));
    }

    #[test]
    fn test_error_display() {
        let err = AppError::NotFound("user 123".into());
        assert_eq!(err.to_string(), "not found: user 123");
    }
}
```

## Async Tests with Tokio

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_fetch_user() {
        let pool = setup_test_db().await;
        let user = UserRepo::create(&pool, sample_input()).await.unwrap();

        let found = UserRepo::find_by_id(&pool, user.id).await.unwrap();
        assert_eq!(found.unwrap().email, "test@example.com");
    }
}
```

## Integration Tests with TestClient

```rust
// tests/api/users.rs
use axum::http::StatusCode;
use axum_test::TestServer;

#[tokio::test]
async fn test_create_user() {
    let app = create_test_app().await;
    let server = TestServer::new(app).unwrap();

    let response = server
        .post("/api/users")
        .json(&json!({
            "email": "new@example.com",
            "name": "Test User"
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::CREATED);
    let body: User = response.json();
    assert_eq!(body.email, "new@example.com");
}

#[tokio::test]
async fn test_get_nonexistent_user_returns_404() {
    let app = create_test_app().await;
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/users/00000000-0000-0000-0000-000000000000").await;
    assert_eq!(response.status_code(), StatusCode::NOT_FOUND);
}
```

## Test Utilities

```rust
// tests/common/mod.rs
use sqlx::PgPool;

pub async fn setup_test_db() -> PgPool {
    let url = std::env::var("TEST_DATABASE_URL")
        .unwrap_or_else(|_| "postgres://test:test@localhost/test_db".into());

    let pool = PgPool::connect(&url).await.unwrap();
    sqlx::migrate!("./migrations").run(&pool).await.unwrap();
    pool
}

pub async fn create_test_app() -> Router {
    let pool = setup_test_db().await;
    let state = AppState { db: pool, /* ... */ };
    create_router(state)
}

pub fn sample_create_user() -> CreateUserInput {
    CreateUserInput {
        email: format!("test-{}@example.com", Uuid::new_v4()),
        name: "Test User".into(),
        password: "SecurePass123!".into(),
    }
}
```

## Mock Traits for Unit Testing

```rust
// Define trait for the dependency
pub trait UserRepository: Send + Sync {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, AppError>;
    async fn create(&self, input: CreateUserInput) -> Result<User, AppError>;
}

// Production implementation
pub struct PgUserRepo { pool: PgPool }

impl UserRepository for PgUserRepo { /* ... */ }

// Test mock
#[cfg(test)]
pub struct MockUserRepo {
    pub users: Vec<User>,
}

#[cfg(test)]
impl UserRepository for MockUserRepo {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, AppError> {
        Ok(self.users.iter().find(|u| u.id == id).cloned())
    }
    async fn create(&self, input: CreateUserInput) -> Result<User, AppError> {
        Ok(User { id: Uuid::new_v4(), email: input.email, name: input.name, ..Default::default() })
    }
}
```

## Property-Based Testing with proptest

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_email_validation_never_panics(s in "\\PC{0,100}") {
        // Should never panic, regardless of input
        let _ = validate_email(&s);
    }

    #[test]
    fn test_pagination_bounds(page in 1u32..1000, size in 1u32..100) {
        let params = PaginationParams { page, page_size: size };
        let (offset, limit) = params.to_offset_limit();
        assert!(offset >= 0);
        assert!(limit > 0);
        assert!(limit <= 100);
    }
}
```

## Test Organization

```
tests/
├── common/
│   └── mod.rs          # shared setup, fixtures
├── api/
│   ├── mod.rs
│   ├── users.rs        # /api/users endpoint tests
│   └── orders.rs       # /api/orders endpoint tests
└── integration/
    └── workflows.rs    # multi-step business flows
```

## Rules

1. Integration tests use a real database (not mocks). Spin up via Docker in CI.
2. Each test gets a clean state (transactions that rollback, or fresh DB per test).
3. Test error paths as thoroughly as success paths. Assert status codes AND response bodies.
4. Use `#[tokio::test]` for all async tests. Never `block_on` in tests.
5. Property tests for validation/parsing logic -- find edge cases humans miss.
6. Name tests descriptively: `test_<action>_<condition>_<expected_result>`.
