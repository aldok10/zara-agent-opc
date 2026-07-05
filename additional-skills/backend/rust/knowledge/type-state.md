---
type: fact
title: "Type-State Pattern in Rust"
---

# Type-State Pattern

Encode state machines in the type system. Invalid transitions become compile errors.

## Core Idea

Instead of runtime checks ("is this connection authenticated?"), use different types for each state. The compiler prevents calling methods that don't apply to the current state.

## Builder Pattern with Type-State

```rust
// States (zero-sized types, no runtime cost)
pub struct NoHost;
pub struct HasHost;
pub struct NoPort;
pub struct HasPort;

pub struct ServerBuilder<H, P> {
    host: Option<String>,
    port: Option<u16>,
    _state: PhantomData<(H, P)>,
}

impl ServerBuilder<NoHost, NoPort> {
    pub fn new() -> Self {
        Self { host: None, port: None, _state: PhantomData }
    }
}

impl<P> ServerBuilder<NoHost, P> {
    pub fn host(self, host: impl Into<String>) -> ServerBuilder<HasHost, P> {
        ServerBuilder { host: Some(host.into()), port: self.port, _state: PhantomData }
    }
}

impl<H> ServerBuilder<H, NoPort> {
    pub fn port(self, port: u16) -> ServerBuilder<H, HasPort> {
        ServerBuilder { host: self.host, port: Some(port), _state: PhantomData }
    }
}

// build() only available when both host AND port are set
impl ServerBuilder<HasHost, HasPort> {
    pub fn build(self) -> Server {
        Server {
            host: self.host.unwrap(),  // safe: type guarantees it's set
            port: self.port.unwrap(),
        }
    }
}

// Usage:
let server = ServerBuilder::new()
    .host("localhost")
    .port(3000)
    .build();  // compiles

// ServerBuilder::new().build();  // compile error! build() doesn't exist on this type
```

## Request Pipeline States

```rust
pub struct Unauthenticated;
pub struct Authenticated;
pub struct Authorized;

pub struct Request<S> {
    inner: http::Request<Body>,
    claims: Option<Claims>,
    _state: PhantomData<S>,
}

impl Request<Unauthenticated> {
    pub fn authenticate(self, token: &str) -> Result<Request<Authenticated>, AuthError> {
        let claims = validate_jwt(token)?;
        Ok(Request { inner: self.inner, claims: Some(claims), _state: PhantomData })
    }
}

impl Request<Authenticated> {
    pub fn authorize(self, permission: &str) -> Result<Request<Authorized>, AuthError> {
        let claims = self.claims.as_ref().unwrap();
        if !claims.has_permission(permission) {
            return Err(AuthError::Forbidden);
        }
        Ok(Request { inner: self.inner, claims: self.claims, _state: PhantomData })
    }

    pub fn user_id(&self) -> Uuid {
        self.claims.as_ref().unwrap().sub
    }
}

impl Request<Authorized> {
    pub fn into_inner(self) -> (http::Request<Body>, Claims) {
        (self.inner, self.claims.unwrap())
    }
}
```

## Connection State Machine

```rust
pub struct Disconnected;
pub struct Connected;
pub struct InTransaction;

pub struct DbConn<S> {
    inner: PgConnection,
    _state: PhantomData<S>,
}

impl DbConn<Connected> {
    pub async fn begin(self) -> Result<DbConn<InTransaction>> { ... }
    pub async fn query(&self, sql: &str) -> Result<Rows> { ... }
}

impl DbConn<InTransaction> {
    pub async fn commit(self) -> Result<DbConn<Connected>> { ... }
    pub async fn rollback(self) -> Result<DbConn<Connected>> { ... }
    pub async fn query(&self, sql: &str) -> Result<Rows> { ... }
}
// Can't call commit() on a Connected connection -- type error!
```

## When to Use Type-State

| Use Case | Benefit |
|----------|---------|
| Builders with required fields | Can't forget a field |
| Auth pipelines | Can't access data before auth |
| Protocol state machines | Invalid transitions are compile errors |
| Resource lifecycle (open/closed) | Use-after-close impossible |

## When NOT to Use

- Simple boolean flags (over-engineering)
- State determined at runtime with many variants (use enums instead)
- When it makes the API unergonomic for callers
- Prototyping (add it once the states stabilize)

## Zero-Cost Guarantee

`PhantomData<T>` is zero-sized. The state types are zero-sized. The compiled binary has NO overhead from type-state -- it's purely a compile-time construct. This is "zero-cost abstraction" in practice.

## Combining with Sealed Traits

```rust
mod sealed {
    pub trait Sealed {}
    impl Sealed for super::Unauthenticated {}
    impl Sealed for super::Authenticated {}
}

pub trait RequestState: sealed::Sealed {}
impl RequestState for Unauthenticated {}
impl RequestState for Authenticated {}
```

Sealed trait prevents external code from creating new states, maintaining the state machine invariants.
