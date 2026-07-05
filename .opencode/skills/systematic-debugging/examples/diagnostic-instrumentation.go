package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

type BoundaryLogger struct {
	logger *slog.Logger
}

func NewBoundaryLogger(logger *slog.Logger) *BoundaryLogger {
	return &BoundaryLogger{logger: logger}
}

func (bl *BoundaryLogger) HTTPMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		requestID := r.Header.Get("X-Request-ID")

		bl.logger.Info("request.start",
			slog.String("request_id", requestID),
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.String("remote_addr", r.RemoteAddr),
		)

		recorder := &statusRecorder{ResponseWriter: w, status: 200}
		next.ServeHTTP(recorder, r)

		bl.logger.Info("request.end",
			slog.String("request_id", requestID),
			slog.Int("status", recorder.status),
			slog.Duration("duration", time.Since(start)),
		)
	})
}

func (bl *BoundaryLogger) WrapExternalCall(
	ctx context.Context,
	service string,
	operation string,
	fn func(ctx context.Context) error,
) error {
	start := time.Now()
	bl.logger.Info(fmt.Sprintf("external.%s.start", service),
		slog.String("operation", operation),
	)

	err := fn(ctx)

	attrs := []any{
		slog.String("operation", operation),
		slog.Duration("duration", time.Since(start)),
	}
	if err != nil {
		attrs = append(attrs, slog.String("error", err.Error()))
		bl.logger.Error(fmt.Sprintf("external.%s.error", service), attrs...)
	} else {
		bl.logger.Info(fmt.Sprintf("external.%s.end", service), attrs...)
	}
	return err
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}
