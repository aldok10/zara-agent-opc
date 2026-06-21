// http-routing-122 — demonstrates Go 1.22+ enhanced HTTP routing in net/http.
//
// No framework needed. Go 1.22 added method+pattern routing directly in stdlib.
//
// Run: go run .  (then in another terminal: curl commands below)

package main

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"sync"
	"sync/atomic"
)

var (
	tasks   = make(map[int64]string) // in-memory "database"
	nextID  atomic.Int64
	mu      sync.RWMutex
)

func main() {
	mux := http.NewServeMux()

	// --- Go 1.22+ routing patterns ---
	// Syntax: METHOD /path/{variable}
	mux.HandleFunc("GET /tasks", listTasks)
	mux.HandleFunc("GET /tasks/{id}", getTask)
	mux.HandleFunc("POST /tasks", createTask)
	mux.HandleFunc("PUT /tasks/{id}", updateTask)
	mux.HandleFunc("DELETE /tasks/{id}", deleteTask)

	// Static files — works since Go 1.0
	mux.Handle("GET /static/", http.StripPrefix("/static/", http.FileServer(http.Dir("./static"))))

	log.Println("Server starting on :8080")
	log.Println("Try:")
	log.Println("  curl -i http://localhost:8080/tasks")
	log.Println("  curl -i -X POST -d 'title=Learn Go' http://localhost:8080/tasks")
	log.Println("  curl -i http://localhost:8080/tasks/1")
	log.Fatal(http.ListenAndServe(":8080", mux))
}

func getID(r *http.Request) (int64, error) {
	return strconv.ParseInt(r.PathValue("id"), 10, 64)
}

func listTasks(w http.ResponseWriter, r *http.Request) {
	mu.RLock()
	defer mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	fmt.Fprint(w, "[")
	first := true
	for id, title := range tasks {
		if !first {
			fmt.Fprint(w, ",")
		}
		fmt.Fprintf(w, `{"id":%d,"title":%q}`, id, title)
		first = false
	}
	fmt.Fprint(w, "]\n")
}

func getTask(w http.ResponseWriter, r *http.Request) {
	id, err := getID(r)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	mu.RLock()
	title, ok := tasks[id]
	mu.RUnlock()

	if !ok {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"id":%d,"title":%q}`, id, title)
}

func createTask(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	title := r.FormValue("title")
	if title == "" {
		http.Error(w, "title required", http.StatusBadRequest)
		return
	}

	id := nextID.Add(1)
	mu.Lock()
	tasks[id] = title
	mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	fmt.Fprintf(w, `{"id":%d,"title":%q}`, id, title)
}

func updateTask(w http.ResponseWriter, r *http.Request) {
	id, err := getID(r)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	title := r.FormValue("title")
	if title == "" {
		http.Error(w, "title required", http.StatusBadRequest)
		return
	}

	mu.Lock()
	_, ok := tasks[id]
	if ok {
		tasks[id] = title
	}
	mu.Unlock()

	if !ok {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"id":%d,"title":%q}`, id, title)
}

func deleteTask(w http.ResponseWriter, r *http.Request) {
	id, err := getID(r)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	mu.Lock()
	delete(tasks, id)
	mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}
