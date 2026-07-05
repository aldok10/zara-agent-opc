// Idempotent Kafka consumer with dedup table in Go.
// Uses segmentio/kafka-go for consumer and PostgreSQL for dedup tracking.
// Pattern: manual commit after processing + dedup check in same DB transaction.

package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/segmentio/kafka-go"
	_ "github.com/lib/pq"
)

type OrderEvent struct {
	OrderID  string  `json:"order_id"`
	UserID   string  `json:"user_id"`
	Amount   float64 `json:"amount"`
	Currency string  `json:"currency"`
}

type Consumer struct {
	reader *kafka.Reader
	db     *sql.DB
	logger *slog.Logger
}

func NewConsumer(brokers []string, topic, groupID string, db *sql.DB) *Consumer {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        brokers,
		Topic:          topic,
		GroupID:        groupID,
		MinBytes:       1e3,  // 1KB
		MaxBytes:       10e6, // 10MB
		MaxWait:        500 * time.Millisecond,
		CommitInterval: 0, // Manual commit only
		StartOffset:    kafka.FirstOffset,
	})

	return &Consumer{
		reader: reader,
		db:     db,
		logger: slog.Default(),
	}
}

func (c *Consumer) Run(ctx context.Context) error {
	c.logger.Info("consumer started", "topic", c.reader.Config().Topic, "group", c.reader.Config().GroupID)

	for {
		select {
		case <-ctx.Done():
			c.logger.Info("shutting down consumer")
			return c.reader.Close()
		default:
		}

		msg, err := c.reader.FetchMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return nil // Context cancelled, graceful shutdown
			}
			c.logger.Error("fetch failed", "error", err)
			continue
		}

		if err := c.processIdempotent(ctx, msg); err != nil {
			c.logger.Error("processing failed",
				"topic", msg.Topic,
				"partition", msg.Partition,
				"offset", msg.Offset,
				"error", err,
			)
			// Don't commit -- message will be redelivered
			// In production: add retry counter, route to DLQ after max retries
			continue
		}

		// Commit only after successful processing
		if err := c.reader.CommitMessages(ctx, msg); err != nil {
			c.logger.Error("commit failed", "error", err)
			// Safe: message will be redelivered and dedup will catch it
		}
	}
}

func (c *Consumer) processIdempotent(ctx context.Context, msg kafka.Message) error {
	// Extract message ID for dedup (from header or generate from content)
	messageID := extractMessageID(msg)
	if messageID == "" {
		return fmt.Errorf("message missing ID header at offset %d", msg.Offset)
	}

	// Begin transaction: dedup check + business logic atomically
	tx, err := c.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	// Attempt dedup insert -- if conflict, message already processed
	var alreadyProcessed bool
	err = tx.QueryRowContext(ctx, `
		INSERT INTO processed_messages (message_id, consumer_group, processed_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (message_id, consumer_group) DO NOTHING
		RETURNING true
	`, messageID, c.reader.Config().GroupID).Scan(&alreadyProcessed)

	if err == sql.ErrNoRows {
		// Conflict = duplicate, skip processing
		c.logger.Debug("duplicate message skipped", "message_id", messageID)
		return nil
	}
	if err != nil {
		return fmt.Errorf("dedup check: %w", err)
	}

	// Parse and process the event
	var event OrderEvent
	if err := json.Unmarshal(msg.Value, &event); err != nil {
		return fmt.Errorf("unmarshal: %w", err)
	}

	// Business logic within same transaction
	if err := c.handleOrderEvent(ctx, tx, event); err != nil {
		return fmt.Errorf("handle event: %w", err)
	}

	// Commit transaction (dedup record + business data atomically)
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}

	c.logger.Info("processed event",
		"message_id", messageID,
		"order_id", event.OrderID,
		"amount", event.Amount,
	)
	return nil
}

func (c *Consumer) handleOrderEvent(ctx context.Context, tx *sql.Tx, event OrderEvent) error {
	// Example: insert order into local read model
	_, err := tx.ExecContext(ctx, `
		INSERT INTO order_summaries (order_id, user_id, amount, currency, created_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (order_id) DO UPDATE SET
			amount = EXCLUDED.amount,
			currency = EXCLUDED.currency
	`, event.OrderID, event.UserID, event.Amount, event.Currency)
	return err
}

func extractMessageID(msg kafka.Message) string {
	for _, h := range msg.Headers {
		if h.Key == "message-id" || h.Key == "idempotency-key" {
			return string(h.Value)
		}
	}
	// Fallback: use topic+partition+offset as dedup key (less ideal but unique)
	return fmt.Sprintf("%s-%d-%d", msg.Topic, msg.Partition, msg.Offset)
}

func main() {
	db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
	if err != nil {
		slog.Error("db connection failed", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	consumer := NewConsumer(
		[]string{os.Getenv("KAFKA_BROKERS")},
		os.Getenv("KAFKA_TOPIC"),
		os.Getenv("KAFKA_GROUP_ID"),
		db,
	)

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	if err := consumer.Run(ctx); err != nil {
		slog.Error("consumer error", "error", err)
		os.Exit(1)
	}
}
