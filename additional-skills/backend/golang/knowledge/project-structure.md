---
type: fact
title: "Project Structure"
---

# Project Structure

Go project layout for backend services. Pragmatic, not dogmatic.

## Standard Layout

```
myservice/
├── cmd/
│   └── server/
│       └── main.go          # Entry point: parse config, wire deps, start server
├── internal/
│   ├── config/
│   │   └── config.go        # Environment parsing, validation
│   ├── domain/
│   │   ├── user.go          # Domain types (structs, interfaces, errors)
│   │   └── errors.go        # Sentinel errors
│   ├── handler/
│   │   ├── user.go          # HTTP handlers
│   │   ├── middleware.go    # HTTP middleware
│   │   └── routes.go        # Route registration
│   ├── service/
│   │   └── user.go          # Business logic orchestration
│   └── repository/
│       ├── queries/         # SQL files (for sqlc)
│       ├── user.go          # Data access implementation
│       └── migrations/      # SQL migrations
├── pkg/                     # Truly reusable utilities (rare)
├── go.mod
├── go.sum
├── Dockerfile
├── Makefile
└── .golangci.yml
```

## Key Principles

1. `cmd/` -- only main packages. Wire dependencies, start server, handle signals.
2. `internal/` -- all application code. Cannot be imported by other modules.
3. `domain/` (or `model/`) -- pure business types. No external imports.
4. `handler/` -- HTTP/gRPC transport layer. Thin: validate, call service, format response.
5. `service/` -- orchestration. Calls repositories, applies business rules.
6. `repository/` -- data access. Implements interfaces defined near consumers.
7. `pkg/` -- only if genuinely reusable across projects. Most teams overuse this.

## Dependency Flow

```
cmd → handler → service → repository
         ↓          ↓          ↓
       domain     domain     domain
```

- Dependencies point inward (toward domain).
- Domain has zero external imports.
- Interfaces defined at consumer site (handler defines ServiceInterface, service defines RepoInterface).

## Module Management

### Single Module (default for services)

```
go.mod at repo root
```

### Multi-Module Workspace (monorepo)

```
go.work
├── services/api/go.mod
├── services/worker/go.mod
└── shared/pkg/go.mod
```

```
// go.work
go 1.22

use (
    ./services/api
    ./services/worker
    ./shared/pkg
)
```

## Configuration Pattern

```go
// internal/config/config.go
type Config struct {
    Port        int           `env:"PORT" envDefault:"8080"`
    DatabaseURL string        `env:"DATABASE_URL,required"`
    LogLevel    string        `env:"LOG_LEVEL" envDefault:"info"`
    Timeout     time.Duration `env:"REQUEST_TIMEOUT" envDefault:"30s"`
}

func Load() (*Config, error) {
    var cfg Config
    if err := env.Parse(&cfg); err != nil {
        return nil, fmt.Errorf("parse config: %w", err)
    }
    return &cfg, nil
}
```

## Anti-Patterns

- Putting business logic in handlers (handlers should be thin).
- Circular imports between packages (restructure or extract interface).
- `pkg/` for everything (most code belongs in `internal/`).
- Domain types importing infrastructure (`domain/` should be pure).
- Single `models/` package with all types (split by domain concept).
- Flat structure with 50+ files in one package (split by responsibility).
