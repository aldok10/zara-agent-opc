// encoding-json — demonstrates encoding/json package (no external lib needed).
//
// Go's encoding/json is production-ready — no need for JSON libraries
// unless you need very specific performance characteristics.
//
// Key types: json.Marshal, json.Unmarshal, json.Encoder, json.Decoder,
//            json.RawMessage, json.RawMessage (for partial parsing)

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"
)

// --- Struct with JSON tags ---
// Note: json tags use camelCase by convention in Go.
// Omitempty excludes zero-value fields from output.

type Person struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	// Tags is a slice — omitempty skips if nil/empty
	Tags []string `json:"tags,omitempty"`
	// Secret won't be marshaled (unexported field)
	secret string
}

// CustomJSON demonstrates custom JSON marshaling
type CustomJSON struct {
	Value string
}

func (c CustomJSON) MarshalJSON() ([]byte, error) {
	return json.Marshal(fmt.Sprintf("custom_%s", c.Value))
}

func (c *CustomJSON) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}
	c.Value = strings.TrimPrefix(s, "custom_")
	return nil
}

// --- Demonstrating json.RawMessage for partial parsing ---

type FlexibleResponse struct {
	Status string          `json:"status"`
	Data   json.RawMessage `json:"data"` // defer parsing until we know the type
}

func main() {
	// 1. Marshal (struct -> JSON bytes)
	p := Person{
		ID:        1,
		Name:      "Alice",
		Email:     "alice@example.com",
		CreatedAt: time.Now().Round(time.Second),
		Tags:      []string{"go", "developer"},
		secret:    "this is hidden",
	}

	b, err := json.MarshalIndent(p, "", "  ")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("1. Marshaled Person:\n%s\n\n", b)

	// 2. Unmarshal (JSON bytes -> struct)
	var p2 Person
	if err := json.Unmarshal(b, &p2); err != nil {
		log.Fatal(err)
	}
	fmt.Printf("2. Unmarshaled back: ID=%d, Name=%s, secret=%q (empty — unexported)\n\n",
		p2.ID, p2.Name, p2.secret)

	// 3. Streaming Decoder — read from a reader
	jsonStream := `{"name": "Bob", "age": 30}
{"name": "Charlie", "age": 25}`
	decoder := json.NewDecoder(strings.NewReader(jsonStream))

	type SimplePerson struct {
		Name string `json:"name"`
		Age  int    `json:"age"`
	}

	for decoder.More() {
		var sp SimplePerson
		if err := decoder.Decode(&sp); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("3. Streaming decoded: %+v\n", sp)
	}
	fmt.Println()

	// 4. Streaming Encoder — write directly to writer
	fmt.Println("4. Streaming encode to stdout:")
	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	encoder.Encode(p)
	fmt.Println()

	// 5. json.RawMessage — parse partially
	raw := `{"status": "ok", "data": {"user": "admin", "role": "super"}}`
	var resp FlexibleResponse
	if err := json.Unmarshal([]byte(raw), &resp); err != nil {
		log.Fatal(err)
	}
	fmt.Printf("5. RawMessage: status=%s, data=%s\n", resp.Status, resp.Data)
	// Now parse data based on status:
	if resp.Status == "ok" {
		var userData struct {
			User string `json:"user"`
			Role string `json:"role"`
		}
		json.Unmarshal(resp.Data, &userData)
		fmt.Printf("   Parsed data: user=%s, role=%s\n", userData.User, userData.Role)
	}

	// 6. Custom marshal/unmarshal
	c := CustomJSON{Value: "hello"}
	customBytes, _ := json.Marshal(c)
	fmt.Printf("\n6. Custom JSON: %s\n", customBytes)

	var c2 CustomJSON
	json.Unmarshal([]byte(`"custom_world"`), &c2)
	fmt.Printf("   Custom unmarshal: %+v\n", c2)

	// 7. json.HTMLEscape — safe for embedding in HTML
	var buf bytes.Buffer
	json.HTMLEscape(&buf, []byte(`{"x":"<script>alert('xss')</script>"}`))
	fmt.Printf("\n7. HTMLEscaped: %s\n", buf.String())

	// 8. json.Valid — validate before parsing
	fmt.Printf("\n8. json.Valid checks:\n")
	fmt.Printf(`   "{}" -> %t (valid)`, json.Valid([]byte("{}")))
	fmt.Printf(`   "{invalid" -> %t (invalid)`, json.Valid([]byte("{invalid")))
	fmt.Println()
}
