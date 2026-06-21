// mistakes — BAD code examples that AI must NEVER produce.
//
// This file exists to teach understanding, not just rules.
// Each example shows WHY the code is wrong, what breaks, and the correct fix.
//
// INSTRUCTION TO AI: Read this file BEFORE writing any Go code.
// If you catch yourself producing any pattern shown in the BAD sections,
// STOP and use the GOOD pattern instead.

package mistakes

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

// ===========================================================================
// MISTAKE #7: Returning interfaces
// ===========================================================================
//
// WHY IT'S WRONG:
// Returning an interface forces ALL callers to depend on the same abstraction.
// It prevents callers from accessing concrete methods they may need.
// It makes the package harder to use and creates unnecessary coupling.
//
// THE MENTAL MODEL:
// "Accept interfaces, return structs" — the caller decides what abstraction
// they need. You don't decide for them.

// BAD — returns interface, callers can't access UserRepo-specific methods
type UserRepository interface {
	Get(ctx context.Context, id string) (*User, error)
}

func NewUserRepositoryBad() UserRepository { // BAD: returns interface
	return &userRepo{}
}

// GOOD — returns concrete type, callers can use it directly
// If a caller needs an interface, they define it themselves
func NewUserRepository() *userRepo { // GOOD: returns concrete
	return &userRepo{}
}

type userRepo struct{}
type User struct{ ID, Name string }

func (r *userRepo) Get(ctx context.Context, id string) (*User, error) {
	return &User{ID: id, Name: "Alice"}, nil
}

// ===========================================================================
// MISTAKE #21: Inefficient slice initialization
// ===========================================================================
//
// WHY IT'S WRONG:
// append() without pre-allocation causes repeated memory copying.
// Each time the backing array fills up, Go allocates a new one (2x size)
// and copies ALL existing elements. For 1000 items, this means ~10
// allocations and copies instead of 1.
//
// THE COST:
// Without pre-alloc (1M items): ~20 allocations, ~10ms
// With pre-alloc (1M items): 1 allocation, ~2ms
//
// THE MENTAL MODEL:
// If you know the size (or even approximate), tell Go upfront.

func CollectResultsBad(items []int) []int {
	// BAD: starts with nil slice, grows repeatedly
	var results []int
	for _, item := range items {
		results = append(results, item*2)
	}
	return results
}

func CollectResultsGood(items []int) []int {
	// GOOD: one allocation, no copying
	results := make([]int, 0, len(items))
	for _, item := range items {
		results = append(results, item*2)
	}
	return results
}

// ===========================================================================
// MISTAKE #25: Unexpected side effects using slice append
// ===========================================================================
//
// WHY IT'S WRONG:
// When you sub-slice (s[1:3]), the new slice SHARES the backing array.
// If you append to the sub-slice and it doesn't exceed capacity,
// it overwrites data in the ORIGINAL slice silently.
//
// This is one of Go's most insidious bugs — it compiles, runs,
// and produces wrong results only sometimes (depends on capacity).
//
// THE MENTAL MODEL:
// "Sub-slice = shared memory. Append to shared memory = data corruption."
// Use 3-index slice s[low:high:max] to limit capacity.

func SliceAppendBug() {
	s := []int{1, 2, 3, 4, 5}
	sub := s[1:3] // sub = [2, 3], but cap = 4 (shares backing array!)

	// BAD: this overwrites s[3] because sub has room in shared array
	sub = append(sub, 99)
	// Now s = [1, 2, 3, 99, 5] — SILENT DATA CORRUPTION

	_ = sub
	_ = s
}

func SliceAppendSafe() {
	s := []int{1, 2, 3, 4, 5}
	sub := s[1:3:3] // 3-index slice: cap = high-low = 2, no extra room

	// GOOD: this allocates new backing array because cap is full
	sub = append(sub, 99)
	// s is unchanged: [1, 2, 3, 4, 5]

	_ = sub
	_ = s
}

// ===========================================================================
// MISTAKE #35: Using defer inside a loop
// ===========================================================================
//
// WHY IT'S WRONG:
// defer doesn't execute at end of loop iteration — it executes at end of
// FUNCTION. In a loop processing 10000 files, you hold 10000 open file
// descriptors until the function returns. This causes resource exhaustion.
//
// THE MENTAL MODEL:
// "defer = function-scoped cleanup, NOT loop-scoped cleanup."
// For loop cleanup, extract to a sub-function or call directly.

func ProcessFilesBad(paths []string) error {
	for _, path := range paths {
		f, err := openFile(path)
		if err != nil {
			return err
		}
		defer f.Close() // BAD: ALL files stay open until function returns

		processFile(f)
	}
	return nil
}

func ProcessFilesGood(paths []string) error {
	for _, path := range paths {
		// GOOD: extract to function so defer runs per iteration
		if err := processOnePath(path); err != nil {
			return err
		}
	}
	return nil
}

func processOnePath(path string) error {
	f, err := openFile(path)
	if err != nil {
		return err
	}
	defer f.Close() // GOOD: closes when this function returns (each iteration)

	processFile(f)
	return nil
}

// ===========================================================================
// MISTAKE #49: Ignoring when to wrap an error
// ===========================================================================
//
// WHY IT'S WRONG (both directions):
// - NOT wrapping: callers lose context about where the error happened.
//   Debugging becomes "not found" with no idea which layer or operation.
// - ALWAYS wrapping: exposes internal implementation. If you wrap a
//   database error with %w, callers can errors.Is(err, sql.ErrNoRows)
//   — now they depend on your DB choice.
//
// THE MENTAL MODEL:
// Wrap (%w) when callers NEED to inspect the cause.
// Format (%v) when the cause is an implementation detail.

func GetUserBad(id string) error {
	err := queryDB(id)
	if err != nil {
		return err // BAD: no context. Caller sees "connection refused" with no idea what was attempted
	}
	return nil
}

func GetUserGood(id string) error {
	err := queryDB(id)
	if err != nil {
		return fmt.Errorf("get user %s: %w", id, err) // GOOD: context + wrapped for inspection
	}
	return nil
}

// ===========================================================================
// MISTAKE #52: Handling an error twice
// ===========================================================================
//
// WHY IT'S WRONG:
// If you log AND return, the error appears in logs TWICE (once here, once
// at the caller who also logs). This creates noise, confusing debugging.
// The error should be handled at ONE layer — typically the outermost
// (HTTP handler, main function, etc.)
//
// THE MENTAL MODEL:
// "Handle or return. Never both."

func SaveOrderBad(order Order) error {
	err := persistOrder(order)
	if err != nil {
		logError(err)  // BAD: logging here...
		return err     // ...AND returning = duplicate log entries up the chain
	}
	return nil
}

func SaveOrderGood(order Order) error {
	err := persistOrder(order)
	if err != nil {
		return fmt.Errorf("save order %s: %w", order.ID, err) // GOOD: wrap + return only
	}
	return nil
}

// ===========================================================================
// MISTAKE #62: Starting a goroutine without knowing when to stop it
// ===========================================================================
//
// WHY IT'S WRONG:
// A goroutine that has no exit path is a resource leak. It holds memory,
// potentially holds locks, and if it's stuck on a channel send/receive,
// it lives FOREVER. In a long-running server, this eventually causes OOM.
//
// THE MENTAL MODEL:
// "Every goroutine is a contract: I start, I WILL stop."
// Context, done channel, or channel close = the stop signal.

func LeakyGoroutine() {
	ch := make(chan string)

	// BAD: if nobody reads from ch, this goroutine blocks forever
	go func() {
		result := doExpensiveWork()
		ch <- result // blocks forever if caller moved on
	}()

	// Caller might return early on timeout, leaving goroutine stuck
}

func SafeGoroutine(ctx context.Context) {
	ch := make(chan string, 1) // buffered: won't block even if nobody reads

	go func() {
		result := doExpensiveWork()
		select {
		case ch <- result:
		case <-ctx.Done(): // GOOD: always has exit path
		}
	}()
}

// ===========================================================================
// MISTAKE #74: Copying a sync type
// ===========================================================================
//
// WHY IT'S WRONG:
// sync.Mutex, sync.WaitGroup, sync.Cond contain internal state.
// Copying them creates a SECOND mutex/waitgroup with independent state.
// The original and copy no longer synchronize — you get data races
// that the race detector catches but look insane to debug.
//
// THE MENTAL MODEL:
// "sync types are identity, not value. They can't be duplicated."
// Always pointer receivers. Always pass by pointer.

func WorkerBad(wg sync.WaitGroup, id int) { // BAD: WaitGroup copied by value
	defer wg.Done() // This Done() doesn't affect the original!
	fmt.Printf("worker %d\n", id)
}

func WorkerGood(wg *sync.WaitGroup, id int) { // GOOD: pointer — shares state
	defer wg.Done()
	fmt.Printf("worker %d\n", id)
}

// ===========================================================================
// MISTAKE #76: time.After and memory leaks
// ===========================================================================
//
// WHY IT'S WRONG:
// time.After creates a Timer that won't be garbage collected until it fires.
// In a loop handling 10000 requests/sec with 30s timeout, you accumulate
// 300,000 timers in memory — each holding ~200 bytes = 60MB leaked.
//
// Go 1.23+ improved timer GC, but the pattern remains wasteful.
//
// THE MENTAL MODEL:
// "time.After = fire-and-forget allocation. In a loop = memory bomb."
// Use time.NewTimer + Reset for reusable timers.

func TimeoutLoopBad(ch <-chan string) {
	for {
		select {
		case msg := <-ch:
			process(msg)
		case <-time.After(30 * time.Second): // BAD: allocates new timer every iteration
			return
		}
	}
}

func TimeoutLoopGood(ch <-chan string) {
	timer := time.NewTimer(30 * time.Second)
	defer timer.Stop()

	for {
		select {
		case msg := <-ch:
			process(msg)
			// Reset timer after each message
			if !timer.Stop() {
				select {
				case <-timer.C:
				default:
				}
			}
			timer.Reset(30 * time.Second)
		case <-timer.C:
			return
		}
	}
}

// ===========================================================================
// MISTAKE #79: Not closing transient resources
// ===========================================================================
//
// WHY IT'S WRONG:
// HTTP response bodies are io.ReadCloser backed by a network connection.
// If you don't read AND close them, the connection can't be reused
// (HTTP keep-alive broken) and the file descriptor leaks.
// At scale: "too many open files" crash.
//
// THE SUBTLETY:
// You must defer Close AFTER the error check, because on error,
// resp may be nil → nil pointer dereference panic.

func FetchBad(url string) ([]byte, error) {
	resp, err := http.Get(url)
	defer resp.Body.Close() // BAD: if err != nil, resp is nil → PANIC
	if err != nil {
		return nil, err
	}
	return io.ReadAll(resp.Body)
}

func FetchGood(url string) ([]byte, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, err // GOOD: check error first
	}
	defer resp.Body.Close() // GOOD: defer AFTER nil check

	return io.ReadAll(resp.Body)
}

// ===========================================================================
// MISTAKE #80: Forgetting return after http.Error
// ===========================================================================
//
// WHY IT'S WRONG:
// http.Error() writes an error response but DOES NOT stop the handler.
// Without return, the handler continues executing, potentially writing
// a second response (which corrupts the HTTP stream) or performing
// operations that should have been skipped.
//
// THE MENTAL MODEL:
// "http.Error is printf, not throw. YOU must stop execution."

func HandleRequestBad(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		http.Error(w, "id required", http.StatusBadRequest)
		// BAD: missing return! Handler continues below...
	}

	// This runs even when id is empty — bug!
	user := lookupUser(id)
	json.NewEncoder(w).Encode(user)
}

func HandleRequestGood(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		http.Error(w, "id required", http.StatusBadRequest)
		return // GOOD: stop execution
	}

	user := lookupUser(id)
	json.NewEncoder(w).Encode(user)
}

// ===========================================================================
// MISTAKE #81: Using the default HTTP client
// ===========================================================================
//
// WHY IT'S WRONG:
// http.DefaultClient has NO timeout. If a server hangs, your goroutine
// blocks forever. In a server handling 1000 req/sec, one slow upstream
// causes goroutine accumulation → memory exhaustion → crash.
//
// Same applies to http.Server: no ReadTimeout/WriteTimeout means a
// slow client can hold your connection open indefinitely (slowloris).
//
// THE MENTAL MODEL:
// "No timeout = no bound on resource usage = production incident."

var badClient = http.DefaultClient // BAD: no timeout

var goodClient = &http.Client{ // GOOD: bounded resource usage
	Timeout: 10 * time.Second,
	Transport: &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 10,
		IdleConnTimeout:     90 * time.Second,
	},
}

func GoodServer() *http.Server {
	return &http.Server{
		Addr:         ":8080",
		ReadTimeout:  5 * time.Second,  // GOOD: bound read
		WriteTimeout: 10 * time.Second, // GOOD: bound write
		IdleTimeout:  120 * time.Second,
	}
}

// ===========================================================================
// MISTAKE #39: Under-optimized string concatenation
// ===========================================================================
//
// WHY IT'S WRONG:
// Strings are immutable in Go. Every += allocates a NEW string and copies
// ALL previous bytes. Building a string from 1000 parts with += means
// ~500,000 bytes copied total (quadratic). strings.Builder with Grow
// does it in one allocation.
//
// THE NUMBERS:
// 1000 parts × 10 bytes each:
//   += loop: ~500 allocations, ~5ms
//   Builder with Grow: 1 allocation, ~50μs (100x faster)

func BuildStringBad(parts []string) string {
	result := ""
	for _, p := range parts {
		result += p // BAD: O(n²) — copies entire string each iteration
	}
	return result
}

func BuildStringGood(parts []string) string {
	// Calculate total size
	n := 0
	for _, p := range parts {
		n += len(p)
	}
	var b strings.Builder
	b.Grow(n) // GOOD: single allocation
	for _, p := range parts {
		b.WriteString(p)
	}
	return b.String()
}

// ===========================================================================
// MISTAKE #5 + #6: Interface pollution
// ===========================================================================
//
// WHY IT'S WRONG:
// Creating interfaces "just in case" or "for testing" when there's only
// one implementation adds complexity without value. It forces readers to
// jump between interface and implementation. It's premature abstraction.
//
// THE MENTAL MODEL:
// "Do I have 2+ implementations TODAY?" No → no interface.
// "Is a consumer in a DIFFERENT package that needs to mock?" → maybe.
// "Am I creating this because some other language does it?" → definitely not.

// BAD: interface for a single implementation, defined at producer side
type OrderServiceInterface interface { // BAD: premature, one impl
	CreateOrder(ctx context.Context, o Order) error
	GetOrder(ctx context.Context, id string) (*Order, error)
	ListOrders(ctx context.Context) ([]*Order, error)
}

// GOOD: concrete struct. If a consumer needs to mock, they define
// their own minimal interface at THEIR site.
type OrderService struct {
	repo *OrderRepo
}

func (s *OrderService) CreateOrder(ctx context.Context, o Order) error { return nil }
func (s *OrderService) GetOrder(ctx context.Context, id string) (*Order, error) {
	return nil, nil
}

// Consumer defines what THEY need (at their site, not here):
// type orderCreator interface {
//     CreateOrder(ctx context.Context, o Order) error
// }

// ===========================================================================
// MISTAKE #100: Go in Docker/Kubernetes without resource awareness
// ===========================================================================
//
// WHY IT'S WRONG:
// By default, GOMAXPROCS = host CPU count (e.g., 64 cores on a shared node).
// But your container is limited to 2 CPUs. Go spawns 64 OS threads, they
// compete for 2 CPUs, causing excessive context switching and worse
// throughput than if GOMAXPROCS = 2.
//
// Similarly, without GOMEMLIMIT, the GC doesn't know your container's
// memory limit. It may use 4GB when your limit is 512MB → OOM kill.
//
// THE FIX:
// import _ "go.uber.org/automaxprocs"  // auto-detects cgroup
// import _ "github.com/KimMachineGun/automemlimit"  // auto-detects cgroup
//
// Or set manually:
// GOMAXPROCS=2 GOMEMLIMIT=400MiB ./myapp

// ===========================================================================
// Helper types/functions (make examples compile)
// ===========================================================================

type Order struct{ ID string }
type OrderRepo struct{}
type strings struct{} // shadow to show Builder usage in context

func openFile(string) (io.ReadCloser, error)                  { return nil, nil }
func processFile(io.ReadCloser)                               {}
func queryDB(string) error                                    { return nil }
func persistOrder(Order) error                                { return nil }
func logError(error)                                          {}
func doExpensiveWork() string                                 { return "" }
func process(string)                                          {}
func lookupUser(string) *User                                 { return nil }

// Ensure imports are used
var _ = context.Background
var _ = errors.New
var _ = fmt.Sprintf
var _ = io.ReadAll
var _ = json.Marshal
var _ = http.Get
var _ = sync.Mutex{}
var _ = time.Second
