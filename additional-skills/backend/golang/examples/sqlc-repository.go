// Repository pattern using sqlc with transactions.
// Demonstrates: pgx pool, sqlc queries, transaction helper, error mapping.
package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Domain errors (sentinel)
var (
	ErrNotFound = errors.New("not found")
	ErrConflict = errors.New("conflict")
)

// User is the domain type.
type User struct {
	ID        int64
	Email     string
	Name      string
	CreatedAt time.Time
}

// CreateUserParams holds validated input for user creation.
type CreateUserParams struct {
	Email string
	Name  string
}

// UserRepository defines the data access contract.
type UserRepository interface {
	FindByID(ctx context.Context, id int64) (*User, error)
	FindByEmail(ctx context.Context, email string) (*User, error)
	Create(ctx context.Context, params CreateUserParams) (*User, error)
	UpdateName(ctx context.Context, id int64, name string) error
	Delete(ctx context.Context, id int64) error
	TransferCredits(ctx context.Context, fromID, toID int64, amount int) error
}

// userRepo implements UserRepository using pgx + sqlc-style queries.
type userRepo struct {
	pool *pgxpool.Pool
}

// NewUserRepository creates a new repository backed by pgxpool.
func NewUserRepository(pool *pgxpool.Pool) UserRepository {
	return &userRepo{pool: pool}
}

func (r *userRepo) FindByID(ctx context.Context, id int64) (*User, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var u User
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, name, created_at FROM users WHERE id = $1`, id,
	).Scan(&u.ID, &u.Email, &u.Name, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("find user %d: %w", id, ErrNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("find user %d: %w", id, err)
	}
	return &u, nil
}

func (r *userRepo) FindByEmail(ctx context.Context, email string) (*User, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var u User
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, name, created_at FROM users WHERE email = $1`, email,
	).Scan(&u.ID, &u.Email, &u.Name, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("find user by email: %w", ErrNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("find user by email: %w", err)
	}
	return &u, nil
}

func (r *userRepo) Create(ctx context.Context, params CreateUserParams) (*User, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var u User
	err := r.pool.QueryRow(ctx,
		`INSERT INTO users (email, name, created_at)
		 VALUES ($1, $2, NOW())
		 RETURNING id, email, name, created_at`,
		params.Email, params.Name,
	).Scan(&u.ID, &u.Email, &u.Name, &u.CreatedAt)
	if err != nil {
		// Check for unique constraint violation (PostgreSQL error code 23505)
		if isDuplicateKey(err) {
			return nil, fmt.Errorf("create user: %w", ErrConflict)
		}
		return nil, fmt.Errorf("create user: %w", err)
	}
	return &u, nil
}

func (r *userRepo) UpdateName(ctx context.Context, id int64, name string) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tag, err := r.pool.Exec(ctx,
		`UPDATE users SET name = $1 WHERE id = $2`, name, id,
	)
	if err != nil {
		return fmt.Errorf("update user %d: %w", id, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("update user %d: %w", id, ErrNotFound)
	}
	return nil
}

func (r *userRepo) Delete(ctx context.Context, id int64) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tag, err := r.pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete user %d: %w", id, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("delete user %d: %w", id, ErrNotFound)
	}
	return nil
}

// TransferCredits demonstrates a multi-statement transaction.
func (r *userRepo) TransferCredits(ctx context.Context, fromID, toID int64, amount int) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return withTx(ctx, r.pool, func(tx pgx.Tx) error {
		// Debit sender
		tag, err := tx.Exec(ctx,
			`UPDATE users SET credits = credits - $1 WHERE id = $2 AND credits >= $1`,
			amount, fromID,
		)
		if err != nil {
			return fmt.Errorf("debit user %d: %w", fromID, err)
		}
		if tag.RowsAffected() == 0 {
			return fmt.Errorf("insufficient credits for user %d", fromID)
		}

		// Credit receiver
		tag, err = tx.Exec(ctx,
			`UPDATE users SET credits = credits + $1 WHERE id = $2`,
			amount, toID,
		)
		if err != nil {
			return fmt.Errorf("credit user %d: %w", toID, err)
		}
		if tag.RowsAffected() == 0 {
			return fmt.Errorf("credit user %d: %w", toID, ErrNotFound)
		}
		return nil
	})
}

// --- Transaction helper ---

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

// isDuplicateKey checks for PostgreSQL unique violation (23505).
func isDuplicateKey(err error) bool {
	// In real code, check pgconn.PgError.Code == "23505"
	return false // placeholder -- implement with pgconn type assertion
}
