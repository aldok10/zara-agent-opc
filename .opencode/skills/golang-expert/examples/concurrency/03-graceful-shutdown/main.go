// graceful-shutdown — demonstrates proper signal handling and graceful shutdown.
//
// Key stdlib: os/signal, context, net/http.Server.Shutdown

package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	// --- Step 1: Create a context that cancels on SIGINT/SIGTERM ---
	// NotifyContext returns a context that's cancelled when a signal arrives.
	// Since Go 1.26, the context's cause shows which signal triggered it.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// --- Step 2: Create the HTTP server ---
	mux := http.NewServeMux()
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "Hello, Go!")
	})
	mux.HandleFunc("GET /slow", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Slow request started...")
		time.Sleep(5 * time.Second) // simulate long work
		fmt.Fprintln(w, "Done!")
		log.Println("Slow request finished.")
	})

	srv := &http.Server{
		Addr:         ":8080",
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// --- Step 3: Start server in a goroutine ---
	go func() {
		log.Println("Server starting on :8080")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// --- Step 4: Wait for signal ---
	<-ctx.Done()
	// Go 1.26+: context.Cause tells us which signal
	log.Printf("Signal received: %v", context.Cause(ctx))

	// --- Step 5: Graceful shutdown with timeout ---
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	log.Println("Shutting down gracefully...")
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Shutdown error: %v", err)
	}

	log.Println("Server stopped cleanly.")
}
