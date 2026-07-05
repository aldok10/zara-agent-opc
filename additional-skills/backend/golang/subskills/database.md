# Database

Go + SQL patterns. Type-safe queries, proper transactions, production-ready connection management.

## Rules

1. `sqlc` for query generation -- type-safe, zero reflection, compile-time verified SQL.
2. `pgx` as PostgreSQL driver -- native protocol, better performance than database/sql for Postgres.
3. Always use connection pool settings: `MaxConns`, `MinConns`, `MaxConnLifetime`, `MaxConnIdleTime`.
4. Transactions via `pgx.Tx` or `database/sql.Tx` -- pass tx as dependency, never global.
5. Migrations: `golang-migrate/migrate` or Atlas -- versioned, tested, reversible.
6. Context on every query -- timeouts prevent long-running queries from holding connections.
7. Prepared statements for repeated queries (pgx auto-prepares by default).
8. Query timeouts: `context.WithTimeout` on individual queries for safety.
9. Repository pattern: interface at consumer, implementation with pool/connection.
10. Test with real database (`testcontainers-go`) -- mocking SQL gives false confidence.

## Patterns

### sqlc Configuration

```yaml
# sqlc.yaml
version: "2"
sql:
  - engine: "postgresql"
    queries: "internal/repository/queries/"
    schema: "migrations/"
    gen:
      go:
        package: "repository"
        out: "internal/repository"
        sql_package: "pgx/v5"
        emit_json_tags: true
        emit_interface: true
```

### Connection Pool Setup (pgx)

```go
func newPool(ctx context.Context, dsn string) (*pgxpool.Pool, error) {
    cfg, err := pgxpool.ParseConfig(dsn)
    if err != nil {
        return nil, fmt.Errorf("parse dsn: %w", err)
    }
    cfg.MaxConns = 25
    cfg.MinConns = 5
    cfg.MaxConnLifetime = 5 * time.Minute
    cfg.MaxConnIdleTime = 1 * time.Minute
    cfg.HealthCheckPeriod = 30 * time.Second

    pool, err := pgxpool.NewWithConfig(ctx, cfg)
    if err != nil {
        return nil, fmt.Errorf("create pool: %w", err)
    }
    if err := pool.Ping(ctx); err != nil {
        pool.Close()
        return nil, fmt.Errorf("ping: %w", err)
    }
    return pool, nil
}
```

### Transaction Helper

```go
func withTx(ctx context.Context, pool *pgxpool.Pool, fn func(pgx.Tx) error) error {
    tx, err := pool.Begin(ctx)
    if err != nil {
        return fmt.Errorf("begin tx: %w", err)
    }
    defer tx.Rollback(ctx) // no-op if committed

    if err := fn(tx); err != nil {
        return err
    }
    return tx.Commit(ctx)
}
```

### Repository Pattern

```go
type UserRepository interface {
    FindByID(ctx context.Context, id int64) (*User, error)
    Create(ctx context.Context, u *CreateUserParams) (*User, error)
}

type userRepo struct {
    q *repository.Queries // sqlc-generated
}

func NewUserRepository(pool *pgxpool.Pool) UserRepository {
    return &userRepo{q: repository.New(pool)}
}

func (r *userRepo) FindByID(ctx context.Context, id int64) (*User, error) {
    ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
    defer cancel()
    row, err := r.q.GetUser(ctx, id)
    if errors.Is(err, pgx.ErrNoRows) {
        return nil, ErrNotFound
    }
    if err != nil {
        return nil, fmt.Errorf("get user %d: %w", id, err)
    }
    return mapUser(row), nil
}
```

### Migration (golang-migrate)

```bash
# Create migration
migrate create -ext sql -dir migrations -seq add_users_table

# Run migrations
migrate -path migrations -database "$DATABASE_URL" up
```

```go
// Embed migrations for deployment
//go:embed migrations/*.sql
var migrationsFS embed.FS

func runMigrations(dbURL string) error {
    source, _ := iofs.New(migrationsFS, "migrations")
    m, err := migrate.NewWithSourceInstance("iofs", source, dbURL)
    if err != nil {
        return fmt.Errorf("init migrate: %w", err)
    }
    if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
        return fmt.Errorf("run migrations: %w", err)
    }
    return nil
}
```

## Anti-Patterns

- Using `database/sql` defaults (unlimited connections, no timeouts).
- String concatenation for SQL -- always use parameterized queries (`$1`, `$2`).
- Testing with mocked SQL -- misses schema mismatches, query bugs.
- Opening transaction in handler, passing to service -- transaction scope too wide.
- No context timeout on queries -- one slow query blocks the pool.
- `SELECT *` instead of explicit columns -- breaks on schema changes.
- Ignoring `pgx.ErrNoRows` -- not checking means returning zero-value as valid.

## Verification

- `sqlc compile` passes (queries match schema)
- `migrate` up/down cycle works (reversible migrations)
- Integration tests with testcontainers-go and real PostgreSQL
- Connection pool metrics exposed (active, idle, waiting)
- Query timeout tested (context cancellation propagates)
