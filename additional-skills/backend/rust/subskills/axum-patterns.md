# Subskill: Axum Patterns

Axum-specific design patterns. Extractors, state, routing, custom responses, middleware layers.

## Extractors (data from requests)

Extractors implement `FromRequest` or `FromRequestParts`. Order matters: body-consuming extractors (`Json`, `Bytes`) must be last.

```rust
use axum::{extract::{Path, Query, State, Json}, http::StatusCode};

async fn get_user(
    State(pool): State<PgPool>,
    Path(user_id): Path<Uuid>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<User>, AppError> {
    let user = UserRepo::find_by_id(&pool, user_id).await?;
    Ok(Json(user))
}
```

## Custom Extractor (FromRequestParts)

```rust
use axum::{extract::FromRequestParts, http::request::Parts};

pub struct AuthUser(pub Claims);

impl<S: Send + Sync> FromRequestParts<S> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let token = parts.headers
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "))
            .ok_or(AppError::Unauthorized)?;

        let claims = decode_jwt(token)?;
        Ok(AuthUser(claims))
    }
}
```

## State Sharing

```rust
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub redis: deadpool_redis::Pool,
    pub config: Arc<Config>,
}

let state = AppState { db: pool, redis, config: Arc::new(config) };
let app = Router::new()
    .route("/users/{id}", get(get_user))
    .with_state(state);
```

Use `Arc` only for fields that are expensive to clone. `PgPool` already uses `Arc` internally.

## Routing & Nesting

```rust
let api = Router::new()
    .route("/users", get(list_users).post(create_user))
    .route("/users/{id}", get(get_user).put(update_user).delete(delete_user))
    .layer(middleware::from_fn(auth_middleware));

let app = Router::new()
    .nest("/api/v1", api)
    .route("/health", get(health_check))
    .layer(TraceLayer::new_for_http())
    .with_state(state);
```

## IntoResponse (custom responses)

```rust
use axum::response::{IntoResponse, Response};

pub struct ApiResponse<T: Serialize> {
    pub data: T,
    pub status: StatusCode,
}

impl<T: Serialize> IntoResponse for ApiResponse<T> {
    fn into_response(self) -> Response {
        let body = serde_json::to_string(&self.data).unwrap_or_default();
        (self.status, [("content-type", "application/json")], body).into_response()
    }
}
```

## Middleware via Layers

```rust
use tower_http::{cors::CorsLayer, timeout::TimeoutLayer, compression::CompressionLayer};

let app = Router::new()
    .route("/api/data", get(handler))
    .layer(
        ServiceBuilder::new()
            .layer(TraceLayer::new_for_http())
            .layer(TimeoutLayer::new(Duration::from_secs(30)))
            .layer(CompressionLayer::new())
            .layer(CorsLayer::permissive()) // restrict in production
    );
```

Layer order: outermost wraps first. Trace -> Timeout -> Compression -> CORS means tracing captures everything including timeouts.

## Graceful Shutdown

```rust
let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
axum::serve(listener, app)
    .with_graceful_shutdown(shutdown_signal())
    .await?;

async fn shutdown_signal() {
    let ctrl_c = tokio::signal::ctrl_c();
    let mut sigterm = tokio::signal::unix::signal(SignalKind::terminate()).unwrap();
    tokio::select! {
        _ = ctrl_c => {},
        _ = sigterm.recv() => {},
    }
    tracing::info!("shutdown signal received");
}
```

## Decision Table

| Need | Pattern |
|------|---------|
| Auth per route group | Nest + layer with auth middleware |
| Shared DB pool | `State(pool)` extractor |
| Request-scoped data | Custom `FromRequestParts` extractor |
| Response format | `IntoResponse` impl on custom type |
| Cross-cutting logic | Tower `Layer` + `ServiceBuilder` |
| Fallback/404 | `.fallback(handler)` on Router |
