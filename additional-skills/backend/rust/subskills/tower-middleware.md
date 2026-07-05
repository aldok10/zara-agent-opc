---
type: subskill
title: "Subskill: Tower Middleware"
---

# Subskill: Tower Middleware

Tower Service trait, Layer composition, custom middleware for Axum backends.

## Core Concepts

Tower is a framework for composable network services. Two traits:
- `Service<Request>`: processes a request into a response
- `Layer<S>`: wraps a service to produce a new service (middleware)

Axum is built on Tower. All Axum middleware IS Tower middleware.

## ServiceBuilder (composing layers)

```rust
use tower::ServiceBuilder;
use tower_http::{
    cors::CorsLayer,
    compression::CompressionLayer,
    timeout::TimeoutLayer,
    trace::TraceLayer,
    request_id::{MakeRequestUuid, SetRequestIdLayer, PropagateRequestIdLayer},
};

let middleware = ServiceBuilder::new()
    .layer(SetRequestIdLayer::x_request_id(MakeRequestUuid))
    .layer(TraceLayer::new_for_http())
    .layer(TimeoutLayer::new(Duration::from_secs(30)))
    .layer(CompressionLayer::new())
    .layer(CorsLayer::new()
        .allow_origin(["https://app.example.com".parse().unwrap()])
        .allow_methods([Method::GET, Method::POST]))
    .layer(PropagateRequestIdLayer::x_request_id());

let app = Router::new()
    .route("/api/data", get(handler))
    .layer(middleware);
```

Order: layers added first are outermost (execute first on request, last on response).

## Custom Middleware with from_fn

```rust
use axum::middleware::{self, Next};
use axum::extract::Request;

async fn auth_middleware(
    request: Request,
    next: Next,
) -> Result<Response, AppError> {
    let token = request.headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(AppError::Unauthorized)?;

    let claims = validate_token(token)?;

    let mut request = request;
    request.extensions_mut().insert(claims);

    Ok(next.run(request).await)
}

// Apply to specific routes
let protected = Router::new()
    .route("/me", get(get_profile))
    .layer(middleware::from_fn(auth_middleware));
```

## Custom Tower Layer (full implementation)

```rust
use tower::{Layer, Service};
use std::task::{Context, Poll};
use std::pin::Pin;
use std::future::Future;

#[derive(Clone)]
pub struct RateLimitLayer {
    max_requests: u64,
    window: Duration,
}

impl<S> Layer<S> for RateLimitLayer {
    type Service = RateLimitService<S>;

    fn layer(&self, inner: S) -> Self::Service {
        RateLimitService {
            inner,
            limiter: Arc::new(RateLimiter::new(self.max_requests, self.window)),
        }
    }
}

#[derive(Clone)]
pub struct RateLimitService<S> {
    inner: S,
    limiter: Arc<RateLimiter>,
}

impl<S, B> Service<Request<B>> for RateLimitService<S>
where
    S: Service<Request<B>, Response = Response> + Clone + Send + 'static,
    S::Future: Send + 'static,
    B: Send + 'static,
{
    type Response = Response;
    type Error = S::Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, request: Request<B>) -> Self::Future {
        let limiter = self.limiter.clone();
        let mut inner = self.inner.clone();

        Box::pin(async move {
            if !limiter.check().await {
                return Ok(StatusCode::TOO_MANY_REQUESTS.into_response());
            }
            inner.call(request).await
        })
    }
}
```

## Common tower-http Layers

| Layer | Purpose |
|-------|---------|
| `TraceLayer` | Request/response tracing with spans |
| `TimeoutLayer` | Request timeout |
| `CorsLayer` | CORS headers |
| `CompressionLayer` | Response compression (gzip, br) |
| `SetRequestIdLayer` | Generate request IDs |
| `CatchPanicLayer` | Convert panics to 500 responses |
| `RequestBodyLimitLayer` | Limit request body size |
| `SensitiveHeadersLayer` | Redact headers in logs |

## Middleware Decision Guide

| Complexity | Approach |
|-----------|----------|
| Simple pre/post logic | `middleware::from_fn` |
| Needs state/config | `middleware::from_fn_with_state` |
| Reusable across projects | Full `Layer` + `Service` impl |
| Already exists in tower-http | Use the crate, don't reimplement |

## Rules

1. Prefer `tower-http` built-in layers before writing custom ones.
2. `from_fn` for app-specific middleware. Full `Layer`/`Service` for reusable crates.
3. Always propagate request IDs for distributed tracing.
4. Place `TraceLayer` outermost so it captures everything including timeouts/panics.
5. Rate limiting: use `tower::limit::RateLimitLayer` or `governor` for production.
6. Test middleware in isolation: create a mock service, wrap it, assert behavior.
