// error-handling — demonstrates idiomatic Go error handling patterns.
//
// Run: go run . (from inside this directory)

package main

import (
	"errors"
	"fmt"
	"net/http"
)

// --- Sentinel Errors ---

var (
	ErrNotFound   = errors.New("resource not found")
	ErrConflict   = errors.New("resource already exists")
	ErrForbidden  = errors.New("access forbidden")
)

// --- Custom Error Types ---

// NotFoundError is a custom error with structured fields.
// Callers can use errors.As (or errors.AsType in Go 1.26+) to handle it specifically.
type NotFoundError struct {
	Resource string
	ID       string
}

func (e *NotFoundError) Error() string {
	return fmt.Sprintf("%s %q not found", e.Resource, e.ID)
}

// ValidationError holds multiple validation failures.
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("validation failed on %s: %s", e.Field, e.Message)
}

// --- Functions that return errors ---

func findUser(id string) (*User, error) {
	if id == "" {
		return nil, &ValidationError{Field: "id", Message: "cannot be empty"}
	}
	// Simulate DB lookup
	if id != "42" {
		return nil, fmt.Errorf("find user: %w", &NotFoundError{Resource: "user", ID: id})
	}
	return &User{ID: "42", Name: "Alice"}, nil
}

func deleteUser(id string) error {
	if id == "" {
		return fmt.Errorf("delete user: %w", &ValidationError{Field: "id", Message: "cannot be empty"})
	}
	return nil
}

// --- HTTP Handler with structured error handling ---

func getUserHandler(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	user, err := findUser(id)
	if err != nil {
		// --- Go 1.26+: errors.AsType ---
		// Type-safe, faster version of errors.As:
		if nf, ok := errors.AsType[*NotFoundError](err); ok {
			http.Error(w, nf.Error(), http.StatusNotFound)
			return
		}
		// Fallback to errors.As for older Go:
		var ve *ValidationError
		if errors.As(err, &ve) {
			http.Error(w, ve.Error(), http.StatusBadRequest)
			return
		}
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	fmt.Fprintf(w, "User: %s (%s)", user.Name, user.ID)
}

// --- Best practice: wrap errors with context ---

func businessLogic(id string) error {
	err := deleteUser(id)
	if err != nil {
		return fmt.Errorf("business logic: %w", err)
	}
	return nil
}

// --- Multiple errors with errors.Join (Go 1.20+) ---

func validateAll(checks ...error) error {
	var errs []error
	for _, err := range checks {
		if err != nil {
			errs = append(errs, err)
		}
	}
	return errors.Join(errs...)
}

func main() {
	// Example 1: Sentinel error with errors.Is
	_, err1 := findUser("")
	if errors.Is(err1, ErrNotFound) {
		fmt.Println("1. Sentinel error detected with errors.Is")
	}

	// Example 2: Custom error type with errors.AsType (Go 1.26+)
	_, err2 := findUser("999")
	if nf, ok := errors.AsType[*NotFoundError](err2); ok {
		fmt.Printf("2. errors.AsType: %s (resource=%s, id=%s)\n", nf.Error(), nf.Resource, nf.ID)
	}

	// Example 3: Wrapped error chain
	err3 := businessLogic("")
	fmt.Printf("3. Error chain: %v\n", err3)
	fmt.Printf("   Unwrap chain:\n")
	for e := err3; e != nil; e = errors.Unwrap(e) {
		fmt.Printf("   ↳ %v\n", e)
	}

	// Example 4: errors.Join — aggregate multiple errors
	joined := validateAll(
		nil,
		errors.New("name is required"),
		nil,
		errors.New("email is invalid"),
	)
	fmt.Printf("4. Joined errors: %v\n", joined)
	// To count errors, we unwrap: errors.Join returns a joinedError
	var count int
	for e := joined; e != nil; e = errors.Unwrap(e) {
		count++
	}
	fmt.Printf("   Number of errors in chain: %d\n", count)

	// Example 5: Check type vs check string — ALWAYS use type checks
	fmt.Println("\n5. Golden rule: NEVER check error strings — use errors.Is / errors.As")
}
