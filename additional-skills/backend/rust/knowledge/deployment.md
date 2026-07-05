---
type: fact
title: "Rust Deployment Patterns"
---

# Rust Deployment

Multi-stage Docker, cross-compilation, release profiles, binary optimization.

## Multi-Stage Dockerfile

```dockerfile
# Stage 1: Build
FROM rust:1.87-slim AS builder

WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Cache dependencies
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release && rm -rf src

# Build actual application
COPY src/ src/
COPY migrations/ migrations/
RUN touch src/main.rs && cargo build --release

# Stage 2: Runtime
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
RUN useradd -m -U app

COPY --from=builder /app/target/release/myapp /usr/local/bin/
USER app

EXPOSE 3000
ENTRYPOINT ["myapp"]
```

Key: cache `cargo build` of dependencies before copying source. Rebuilds only when Cargo.lock changes.

## Static Binary with musl

```dockerfile
FROM rust:1.87-slim AS builder
RUN rustup target add x86_64-unknown-linux-musl
RUN apt-get update && apt-get install -y musl-tools

WORKDIR /app
COPY . .
RUN cargo build --release --target x86_64-unknown-linux-musl

FROM scratch
COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/myapp /
ENTRYPOINT ["/myapp"]
```

`scratch` base = smallest possible image (~5-20MB). No shell, no OS. Requires static linking.

## Release Profile

```toml
[profile.release]
opt-level = 3          # max optimization
lto = "thin"           # link-time optimization (balance speed/size)
codegen-units = 1      # slower compile, better optimization
strip = true           # strip debug symbols
panic = "abort"        # smaller binary, no unwinding

[profile.release-small]
inherits = "release"
opt-level = "z"        # optimize for size
lto = "fat"            # aggressive LTO
```

## Binary Size Reduction

| Technique | Savings | Tradeoff |
|-----------|---------|----------|
| `strip = true` | 30-60% | No debug symbols in crash dumps |
| `panic = "abort"` | 5-10% | No catch_unwind, no unwinding |
| `lto = "fat"` | 10-20% | Much slower compile |
| `opt-level = "z"` | 10-30% | Slightly slower runtime |
| `codegen-units = 1` | 5-10% | Slower compile |
| UPX compression | 50-70% | Slower startup, AV false positives |

## Cross-Compilation

```bash
# Install target
rustup target add aarch64-unknown-linux-gnu

# Cross-compile (needs linker)
cargo build --release --target aarch64-unknown-linux-gnu

# Or use cross (Docker-based, handles linkers)
cargo install cross
cross build --release --target aarch64-unknown-linux-gnu
```

## Health Check Endpoint

```rust
async fn health_check(State(state): State<AppState>) -> impl IntoResponse {
    match state.db.acquire().await {
        Ok(_) => (StatusCode::OK, Json(json!({"status": "healthy"}))),
        Err(_) => (StatusCode::SERVICE_UNAVAILABLE, Json(json!({"status": "unhealthy"}))),
    }
}
```

## Environment Configuration

```rust
use config::{Config, Environment, File};

#[derive(Debug, Deserialize)]
pub struct AppConfig {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub log_level: String,
}

impl AppConfig {
    pub fn load() -> Result<Self, config::ConfigError> {
        Config::builder()
            .add_source(File::with_name("config/default"))
            .add_source(File::with_name("config/local").required(false))
            .add_source(Environment::with_prefix("APP").separator("__"))
            .build()?
            .try_deserialize()
    }
}
```

## CI Pipeline Essentials

```yaml
# GitHub Actions
- cargo fmt --check
- cargo clippy -- -D warnings
- cargo test
- cargo audit
- cargo build --release
- cargo sqlx prepare --check  # if using sqlx
```

## Rules

1. Always multi-stage Docker builds. Never ship the Rust toolchain in production images.
2. Pin the Rust version in `rust-toolchain.toml` for reproducible builds.
3. Use `cargo-chef` for better Docker layer caching in CI.
4. Health endpoints that verify downstream dependencies (DB, cache).
5. `strip = true` in release profile unless you need production debug symbols.
6. Run `cargo audit` in CI to catch known vulnerabilities.
