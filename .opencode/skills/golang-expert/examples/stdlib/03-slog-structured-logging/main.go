// slog-structured-logging — demonstrates log/slog (Go 1.21+).
//
// slog is the standard structured logging package. No external dependency needed.
// Supports: leveled logging, structured attributes, JSON/text output, custom handlers.
//
// Key types: slog.Logger, slog.Handler, slog.Attr, slog.Level

package main

import (
	"log/slog"
	"os"
	"time"
)

func main() {
	// --- 1. Default logger (text output) ---
	slog.Info("Server starting", "port", 8080, "env", "production")

	// --- 2. JSON logger ---
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	logger.Info("JSON logging enabled",
		"service", "api",
		"version", "1.0.0",
		"uptime", time.Since(time.Now().Truncate(24*time.Hour)),
	)

	// --- 3. Leveled logging ---
	logger.Debug("This won't show by default") // hidden unless level is DEBUG
	logger.Warn("Rate limit approaching", "current_rps", 950, "limit", 1000)
	logger.Error("Database connection failed",
		"host", "db-primary",
		"error", "connection refused",
		"retry", 3,
	)

	// --- 4. With attributes (pre- attached context) ---
	requestLogger := logger.With(
		"request_id", "req-12345",
		"user_id", "user-42",
	)
	requestLogger.Info("Request started", "path", "/api/users")
	requestLogger.Info("Request completed", "status", 200, "duration_ms", 42)

	// --- 5. slog.Group — group related fields ---
	logger.Info("User updated",
		slog.Group("user",
			"id", 42,
			"name", "Alice",
			"email", "alice@example.com",
		),
		slog.Group("changes",
			"fields", []string{"name", "email"},
			"source", "admin-panel",
		),
	)

	// --- 6. slog.Attr helpers ---
	logger.Info("Order placed",
		slog.Int("order_id", 1001),
		slog.String("status", "confirmed"),
		slog.Float64("total", 299.99),
		slog.Bool("paid", true),
		slog.Duration("processing_time", 150*time.Millisecond),
		slog.Time("created_at", time.Now()),
		slog.Any("metadata", map[string]any{"source": "web", "device": "mobile"}),
	)

	// --- 7. Custom level ---
	// You can create custom levels
	const Critical = slog.Level(12)
	logger.LogAttrs(nil, Critical, "System critical!",
		slog.String("component", "payment"),
		slog.Int("error_code", 5001),
	)

	// --- 8. MultiHandler (Go 1.26+) — log to multiple outputs ---
	// file, _ := os.Create("app.log")
	// multiHandler := slog.NewMultiHandler(
	//     slog.NewTextHandler(os.Stdout, nil),
	//     slog.NewJSONHandler(file, nil),
	// )
	// multiLogger := slog.New(multiHandler)
	// multiLogger.Info("Logged to both stdout and file")

	// --- Why slog over third-party loggers? ---
	slog.Info("\n📌 slog advantages:")
	slog.Info("  - Zero dependencies — it's in stdlib since Go 1.21")
	slog.Info("  - Structured output (JSON/text) with leveled logging")
	slog.Info("  - Fast — comparable to zap/zerolog in many benchmarks")
	slog.Info("  - Custom handlers for any output format")
	slog.Info("  - slog.NewMultiHandler (Go 1.26+) for multi-output")
}
