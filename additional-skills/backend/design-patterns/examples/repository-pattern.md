---
type: example
title: "Repository Pattern with Interface + Implementation"
---

# Repository Pattern with Interface + Implementation

## Context
When you need to decouple domain logic from data access, allowing easy testing (mock the interface) and swapping storage backends without touching business code.

## Code/Template

```go
package user

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

// Domain entity - no DB tags, pure business object
type User struct {
	ID        string
	Email     string
	Name      string
	CreatedAt time.Time
	UpdatedAt time.Time
}

// Repository interface - domain defines what it needs
type Repository interface {
	FindByID(ctx context.Context, id string) (*User, error)
	FindByEmail(ctx context.Context, email string) (*User, error)
	Save(ctx context.Context, user *User) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, offset, limit int) ([]*User, error)
}

var ErrNotFound = errors.New("user not found")

// PostgreSQL implementation
type postgresRepo struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) Repository {
	return &postgresRepo{db: db}
}

func (r *postgresRepo) FindByID(ctx context.Context, id string) (*User, error) {
	query := `SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1`
	row := r.db.QueryRowContext(ctx, query, id)
	return r.scanUser(row)
}

func (r *postgresRepo) FindByEmail(ctx context.Context, email string) (*User, error) {
	query := `SELECT id, email, name, created_at, updated_at FROM users WHERE email = $1`
	row := r.db.QueryRowContext(ctx, query, email)
	return r.scanUser(row)
}

func (r *postgresRepo) Save(ctx context.Context, user *User) error {
	query := `
		INSERT INTO users (id, email, name, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (id) DO UPDATE SET
			email = EXCLUDED.email,
			name = EXCLUDED.name,
			updated_at = EXCLUDED.updated_at`

	user.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx, query,
		user.ID, user.Email, user.Name, user.CreatedAt, user.UpdatedAt,
	)
	return err
}

func (r *postgresRepo) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM users WHERE id = $1`
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *postgresRepo) List(ctx context.Context, offset, limit int) ([]*User, error) {
	query := `SELECT id, email, name, created_at, updated_at
		FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	var users []*User
	for rows.Next() {
		u := &User{}
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (r *postgresRepo) scanUser(row *sql.Row) (*User, error) {
	u := &User{}
	err := row.Scan(&u.ID, &u.Email, &u.Name, &u.CreatedAt, &u.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}
```

## Key Points
- Interface lives in the domain package; implementation lives in an infrastructure package. This enforces dependency inversion.
- `ErrNotFound` is a domain-level sentinel error, not a DB-specific one. Callers never import `database/sql`.
- `Save` uses upsert (INSERT ON CONFLICT) for idempotent writes, simplifying both create and update flows.
