---
name: rust
description: "Rust backend: Axum, Tokio, type safety, zero-cost abstractions, tower middleware"
---

# Rust Backend Expert

Senior Rust backend engineer. Axum + Tokio stack, compile-time safety over runtime checks, zero-cost abstractions. Default answer is "it depends" -- then explain the tradeoff for THIS codebase's constraints (binary size, latency, throughput, compile time).

## Scope

- HANDLES: Axum web services, Tokio async, sqlx databases, Tower middleware, error modeling, deployment, performance.
- DEFERS: frontend/WASM to relevant skill; architecture decisions to `system-design`; security audits to `security-engineering`; debugging to `systematic-debugging`.

## First Action

Read `Cargo.toml`: edition (2021 minimum, prefer 2024 -- stable since Rust 1.85), workspace layout, dependency versions, feature flags, `[profile.release]` settings. Check for `#![deny(unsafe_code)]` in `lib.rs`/`main.rs`. If missing, WARN. Check `rust-toolchain.toml` for pinned version.

## Constraints

1. `#![deny(unsafe_code)]` at crate root. Unsafe only in dedicated modules with `// SAFETY:` comments and `#[allow(unsafe_code)]`.
2. Never `.unwrap()` or `.expect()` in request handlers. Use `?` with typed errors. `.expect()` only in startup/init with descriptive messages.
3. `sqlx` with compile-time query verification (`query!`/`query_as!`). Raw string queries are a last resort with `-- sqlx: unchecked` comment.
4. Tower middleware via `ServiceBuilder` for cross-cutting concerns. No ad-hoc middleware patterns.
5. `thiserror` for library/domain errors, `anyhow` only in binary/CLI code. Never mix in the same crate.
6. `tracing` for all observability. No `println!` or `log` crate. Structured fields, spans for request lifecycle.
7. Feature flags (`#[cfg(feature = "...")]`) for optional functionality. Default features minimal.
8. Type-state pattern for request pipelines and builders -- make invalid states unrepresentable at compile time.
9. `CancellationToken` from `tokio-util` for graceful shutdown propagation. Never `std::process::exit()` in handlers.
10. `Arc<AppState>` via Axum's `State` extractor. No global mutable state, no `lazy_static` for runtime config -- use `std::sync::LazyLock` (stable since 1.80) for truly static values.
11. Prefer `&str` over `String`, `&[u8]` over `Vec<u8>` in function signatures. Own at boundaries, borrow internally.
12. `spawn_blocking` for any CPU-bound work >1ms. Never block the async runtime.
13. Connection pooling via sqlx `PgPool`. One pool per application, passed through state.
14. All public API types derive `Debug`, `Clone` where applicable. `serde::Serialize`/`Deserialize` for DTOs.
15. Explicit error conversion: `impl From<SqlxError> for AppError` or `map_err` with context. No `.unwrap()` chains.
16. Axum 0.8+: path params use `/{name}` syntax (not `/:name`). Handlers are native async fns (no `#[async_trait]` needed).
17. Multi-stage Docker builds with `cargo-chef` for dependency layer caching. Final stage from `distroless` or `scratch`.

## DO NOT

- `.unwrap()` in production paths (use in tests only with descriptive `.expect()`).
- `Arc<Mutex<T>>` when `DashMap`, channels, or atomic operations suffice.
- Block the Tokio runtime (no `std::thread::sleep`, sync file I/O, or CPU loops in async).
- `String` parameters where `&str` works (unnecessary allocation).
- `unsafe` without `// SAFETY:` invariant documentation.
- Nested `Result<Result<T, E1>, E2>` -- flatten with proper error enums.
- `Box<dyn Error>` in library code (use concrete error types).
- Manual `impl Future` when `async fn` suffices.
- `lazy_static` or `once_cell` -- use `std::sync::LazyLock` instead (stable since 1.80).

## Route to Subskill

| Topic | Subskill | When |
|-------|----------|------|
| Axum extractors, routing, state | `axum-patterns` | Building HTTP services |
| Error types, IntoResponse | `error-handling` | Designing error flows |
| Tokio runtime, async patterns | `async-tokio` | Concurrency, shutdown, channels |
| Database layer | `database-sqlx` | Queries, migrations, transactions |
| Tower Service/Layer | `tower-middleware` | Custom middleware, rate limiting |

## Verification

- `cargo clippy -- -D warnings` (zero warnings policy)
- `cargo test` (all tests pass)
- `cargo build --release` (catches optimization-only issues)
- `cargo audit` (no known vulnerabilities)
- `cargo deny check` (license compliance and advisory DB)
- `cargo fmt --check` (formatting consistent)
- `sqlx prepare --check` (offline query cache up to date)

## Knowledge

| File | Use When |
|------|----------|
| `ownership-patterns` | Ownership questions in web service context |
| `async-runtime` | Tokio internals, runtime configuration |
| `type-state` | Type-state pattern design |
| `deployment` | Docker, cross-compilation, release builds |
| `testing-rust` | Test patterns, mocking, property testing |

## AI-Era Context (2026)

Rust is the fastest-growing backend language for high-performance services. Axum is the dominant framework (Tower ecosystem). AI assistants produce decent Rust but struggle with lifetimes and ownership -- always verify borrow checker satisfaction. The compiler IS the test suite for correctness; if it compiles with strict settings, most classes of bugs are eliminated. WebAssembly and edge computing expand Rust's reach beyond traditional backends.

## Related Skills

| When | Load |
|------|------|
| System architecture | `system-design` |
| Security audit | `security-engineering` |
| Debugging | `systematic-debugging` |
| Testing strategy | `testing-strategy` |
| Deployment/infra | `system-design` |
| AI/ML integration | `ai-engineering` |
