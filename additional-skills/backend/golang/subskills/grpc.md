# gRPC

Go gRPC services. Protobuf-first, interceptors, streaming, production-ready.

## Rules

1. Protobuf is the contract -- generate Go code with `protoc-gen-go` + `protoc-gen-go-grpc`.
2. Use `buf` for proto management (lint, breaking change detection, generation).
3. Interceptors (middleware) for cross-cutting: logging, auth, metrics, recovery.
4. Always set deadlines/timeouts on client calls -- never unbounded RPC.
5. Health checks via `grpc.health.v1.Health` -- required for Kubernetes readiness.
6. Reflection enabled in non-production for debugging (`grpcurl`, `grpcui`).
7. Error codes: use canonical gRPC codes, attach details with `status.WithDetails`.
8. Streaming: server-stream for subscriptions, client-stream for uploads, bidirectional for chat.
9. Connection management: client-side load balancing, keepalive, connection pooling.
10. Graceful shutdown: `GracefulStop()` with timeout fallback to `Stop()`.

## Patterns

### Service Definition

```protobuf
syntax = "proto3";
package api.v1;
option go_package = "internal/gen/apiv1";

service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc ListUsers(ListUsersRequest) returns (stream User);
}
```

### Server Setup

```go
func newGRPCServer(svc *service.UserService) *grpc.Server {
    srv := grpc.NewServer(
        grpc.ChainUnaryInterceptor(
            recovery.UnaryServerInterceptor(),
            logging.UnaryServerInterceptor(slogInterceptorLogger()),
            otelgrpc.UnaryServerInterceptor(),
        ),
        grpc.ChainStreamInterceptor(
            recovery.StreamServerInterceptor(),
            logging.StreamServerInterceptor(slogInterceptorLogger()),
        ),
        grpc.KeepaliveParams(keepalive.ServerParameters{
            MaxConnectionIdle: 5 * time.Minute,
            Time:              1 * time.Minute,
            Timeout:           20 * time.Second,
        }),
    )
    apiv1.RegisterUserServiceServer(srv, svc)
    grpc_health_v1.RegisterHealthServer(srv, health.NewServer())
    reflection.Register(srv) // dev/staging only
    return srv
}
```

### Client with Deadline

```go
func (c *client) GetUser(ctx context.Context, id string) (*User, error) {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    resp, err := c.userClient.GetUser(ctx, &apiv1.GetUserRequest{Id: id})
    if err != nil {
        return nil, fmt.Errorf("get user %s: %w", id, err)
    }
    return fromProto(resp), nil
}
```

### Graceful Shutdown

```go
func shutdownGRPC(srv *grpc.Server, timeout time.Duration) {
    done := make(chan struct{})
    go func() {
        srv.GracefulStop()
        close(done)
    }()
    select {
    case <-done:
    case <-time.After(timeout):
        srv.Stop() // force
    }
}
```

### Error Handling

```go
import "google.golang.org/grpc/status"

func (s *server) GetUser(ctx context.Context, req *apiv1.GetUserRequest) (*apiv1.User, error) {
    if req.GetId() == "" {
        return nil, status.Error(codes.InvalidArgument, "id is required")
    }
    user, err := s.repo.Find(ctx, req.GetId())
    if errors.Is(err, ErrNotFound) {
        return nil, status.Error(codes.NotFound, "user not found")
    }
    if err != nil {
        return nil, status.Error(codes.Internal, "internal error")
    }
    return toProto(user), nil
}
```

## Anti-Patterns

- No deadlines on client calls -- unbounded waits cause cascading failures.
- Returning `err.Error()` as status message -- leaks internal details.
- Huge proto messages without streaming -- memory pressure, timeout risk.
- No health checks -- Kubernetes kills pods during deployments.
- Using REST status codes (404) instead of gRPC codes (NotFound).
- Reflection enabled in production -- information disclosure.

## Verification

- `buf lint` passes on all proto files
- `buf breaking --against .git#branch=main` -- no breaking changes
- `go test -race ./...` on generated service implementations
- Health check responds correctly under load
- Client deadline propagation tested
- Interceptor chain order verified (recovery first, then logging)
