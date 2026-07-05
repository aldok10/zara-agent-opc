# Go Database Patterns

## database/sql

### Connection Pooling
```go
db, err := sql.Open("postgres", connStr)
if err != nil {
    return fmt.Errorf("open db: %w", err)
}
db.SetMaxOpenConns(25)
db.SetMaxIdleConns(10)
db.SetConnMaxLifetime(5 * time.Minute)
db.SetConnMaxIdleTime(1 * time.Minute)
```

### Prepared Statements
```go
stmt, err := db.PrepareContext(ctx, "SELECT name, email FROM users WHERE id = $1")
if err != nil {
    return fmt.Errorf("prepare: %w", err)
}
defer stmt.Close()

var name, email string
err = stmt.QueryRowContext(ctx, userID).Scan(&name, &email)
```

### Transactions
```go
tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
if err != nil {
    return fmt.Errorf("begin tx: %w", err)
}
defer tx.Rollback()

if _, err := tx.ExecContext(ctx, "UPDATE accounts SET balance = balance - $1 WHERE id = $2", amount, from); err != nil {
    return fmt.Errorf("debit: %w", err)
}
if _, err := tx.ExecContext(ctx, "UPDATE accounts SET balance = balance + $1 WHERE id = $2", amount, to); err != nil {
    return fmt.Errorf("credit: %w", err)
}

return tx.Commit()
```

### Row Scanning
```go
rows, err := db.QueryContext(ctx, "SELECT id, name, created_at FROM users WHERE active = $1", true)
if err != nil {
    return nil, fmt.Errorf("query: %w", err)
}
defer rows.Close()

var users []User
for rows.Next() {
    var u User
    if err := rows.Scan(&u.ID, &u.Name, &u.CreatedAt); err != nil {
        return nil, fmt.Errorf("scan: %w", err)
    }
    users = append(users, u)
}
return users, rows.Err()
```

## sqlc

### How It Works
- Write SQL queries in `.sql` files with annotations
- `sqlc generate` produces type-safe Go code
- No reflection, no runtime overhead
- Catches SQL errors at code generation time

### Query Annotations
```sql
-- name: GetUser :one
SELECT id, name, email, created_at
FROM users
WHERE id = $1;

-- name: ListUsers :many
SELECT id, name, email, created_at
FROM users
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: CreateUser :one
INSERT INTO users (name, email)
VALUES ($1, $2)
RETURNING id, name, email, created_at;

-- name: DeleteUser :exec
DELETE FROM users WHERE id = $1;
```

### Generated Code Usage
```go
queries := db.New(pool)
user, err := queries.GetUser(ctx, userID)
users, err := queries.ListUsers(ctx, db.ListUsersParams{Limit: 20, Offset: 0})
```

### sqlc Configuration (sqlc.yaml)
```yaml
version: "2"
sql:
  - engine: "postgresql"
    queries: "query/"
    schema: "schema/"
    gen:
      go:
        package: "db"
        out: "internal/db"
        sql_package: "pgx/v5"
```

## pgx (PostgreSQL Driver)

### Connection Pool
```go
pool, err := pgxpool.New(ctx, connStr)
if err != nil {
    return fmt.Errorf("create pool: %w", err)
}
defer pool.Close()
```

### PostgreSQL-Specific Features
```go
// COPY for bulk inserts
rows := [][]any{
    {1, "alice", "alice@example.com"},
    {2, "bob", "bob@example.com"},
}
_, err := pool.CopyFrom(ctx,
    pgx.Identifier{"users"},
    []string{"id", "name", "email"},
    pgx.CopyFromRows(rows),
)

// LISTEN/NOTIFY
conn, _ := pool.Acquire(ctx)
defer conn.Release()
conn.Exec(ctx, "LISTEN events")
for {
    notification, err := conn.Conn().WaitForNotification(ctx)
    // handle notification.Payload
}

// Array types
var tags []string
err := pool.QueryRow(ctx, "SELECT tags FROM posts WHERE id = $1", id).Scan(&tags)
```

### Batch Queries
```go
batch := &pgx.Batch{}
batch.Queue("SELECT name FROM users WHERE id = $1", id1)
batch.Queue("SELECT name FROM users WHERE id = $1", id2)
results := pool.SendBatch(ctx, batch)
defer results.Close()

name1, _ := results.QueryRow(func(row pgx.Row) error { return row.Scan(&n) })
```

## Migration Tools

### golang-migrate
```bash
migrate create -ext sql -dir migrations -seq add_users_table
migrate -path migrations -database "$DATABASE_URL" up
migrate -path migrations -database "$DATABASE_URL" down 1
migrate -path migrations -database "$DATABASE_URL" force 3
```

### Atlas
```bash
atlas schema inspect -u "$DATABASE_URL" > schema.hcl
atlas schema apply -u "$DATABASE_URL" --to file://schema.hcl
atlas migrate diff --to file://schema.hcl --dir file://migrations
```

### Migration Best Practices
- One change per migration (additive preferred)
- Always provide down migration
- Test migrations on production-size data locally
- Never modify a migration that's been applied
- Use transactions where supported (not for DDL in MySQL)

## Repository Pattern in Go

### Interface Definition
```go
type UserRepository interface {
    Get(ctx context.Context, id string) (*User, error)
    List(ctx context.Context, filter UserFilter) ([]User, error)
    Create(ctx context.Context, u *User) error
    Update(ctx context.Context, u *User) error
    Delete(ctx context.Context, id string) error
}
```

### Implementation
```go
type postgresUserRepo struct {
    pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) UserRepository {
    return &postgresUserRepo{pool: pool}
}

func (r *postgresUserRepo) Get(ctx context.Context, id string) (*User, error) {
    var u User
    err := r.pool.QueryRow(ctx,
        "SELECT id, name, email, created_at FROM users WHERE id = $1", id,
    ).Scan(&u.ID, &u.Name, &u.Email, &u.CreatedAt)
    if errors.Is(err, pgx.ErrNoRows) {
        return nil, ErrNotFound
    }
    return &u, err
}
```

## Testing with Databases

### testcontainers-go
```go
func setupTestDB(t *testing.T) *pgxpool.Pool {
    t.Helper()
    ctx := context.Background()
    container, err := postgres.Run(ctx, "postgres:16",
        postgres.WithDatabase("testdb"),
        testcontainers.WithWaitStrategy(
            wait.ForLog("ready to accept connections").WithOccurrence(2),
        ),
    )
    t.Cleanup(func() { container.Terminate(ctx) })
    connStr, _ := container.ConnectionString(ctx, "sslmode=disable")
    pool, _ := pgxpool.New(ctx, connStr)
    return pool
}
```

### Test Isolation with Transactions
```go
func withTestTx(t *testing.T, pool *pgxpool.Pool, fn func(pgx.Tx)) {
    t.Helper()
    ctx := context.Background()
    tx, err := pool.Begin(ctx)
    require.NoError(t, err)
    defer tx.Rollback(ctx)
    fn(tx)
}
```

### pgx Mock (pgxmock)
```go
mock, err := pgxmock.NewPool()
mock.ExpectQuery("SELECT .+ FROM users").
    WithArgs("user-1").
    WillReturnRows(pgxmock.NewRows([]string{"id", "name"}).AddRow("user-1", "Alice"))

repo := NewUserRepository(mock)
user, err := repo.Get(ctx, "user-1")
assert.Equal(t, "Alice", user.Name)
assert.NoError(t, mock.ExpectationsWereMet())
```
