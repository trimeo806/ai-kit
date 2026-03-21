# net/http — HTTP Servers, Clients, and Middleware

## HTTP Server with Timeouts (production baseline)

```go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    mux := http.NewServeMux()
    registerRoutes(mux)

    srv := &http.Server{
        Addr:         ":8080",
        Handler:      mux,
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 10 * time.Second,
        IdleTimeout:  120 * time.Second,
    }

    // Graceful shutdown
    go func() {
        quit := make(chan os.Signal, 1)
        signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
        <-quit

        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()

        if err := srv.Shutdown(ctx); err != nil {
            log.Fatalf("graceful shutdown failed: %v", err)
        }
    }()

    log.Println("listening on :8080")
    if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
        log.Fatalf("server error: %v", err)
    }
}
```

## Go 1.22+ ServeMux — Method+Path Patterns

Go 1.22 added first-class method and wildcard routing to `http.ServeMux`. No third-party router needed for standard use cases.

```go
func registerRoutes(mux *http.ServeMux) {
    // Method-specific routing: "METHOD /path"
    mux.HandleFunc("GET /users", listUsers)
    mux.HandleFunc("POST /users", createUser)

    // Path parameters via {name} wildcards (Go 1.22+)
    mux.HandleFunc("GET /users/{id}", getUser)
    mux.HandleFunc("PUT /users/{id}", updateUser)
    mux.HandleFunc("DELETE /users/{id}", deleteUser)

    // Subtree match (trailing slash)
    mux.HandleFunc("GET /static/", serveStatic)

    // Extract path parameter in handler
    mux.HandleFunc("GET /posts/{slug}/comments/{id}", func(w http.ResponseWriter, r *http.Request) {
        slug := r.PathValue("slug")  // Go 1.22: r.PathValue()
        id   := r.PathValue("id")
        _ = slug
        _ = id
    })
}
```

> **Key**: `r.PathValue("name")` (Go 1.22) replaces manual URL parsing. The `httpmuxgo121` GODEBUG setting reverts to old behaviour if needed.

## Handler Interface vs HandlerFunc

```go
// http.Handler interface — preferred for stateful handlers
type UserHandler struct {
    db *sql.DB
}

func (h *UserHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
    // use h.db …
    _ = id
}

// Register a Handler (not HandlerFunc)
mux.Handle("GET /users/{id}", &UserHandler{db: db})

// http.HandlerFunc — adapter for plain functions
mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"status":"ok"}`))
})
```

## Middleware Pattern

```go
// Middleware signature: wraps http.Handler, returns http.Handler
type Middleware func(http.Handler) http.Handler

func Chain(h http.Handler, middlewares ...Middleware) http.Handler {
    for i := len(middlewares) - 1; i >= 0; i-- {
        h = middlewares[i](h)
    }
    return h
}

// Logging middleware
func Logging(logger *log.Logger) Middleware {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            start := time.Now()
            next.ServeHTTP(w, r)
            logger.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
        })
    }
}

// Recovery (panic → 500) middleware
func Recovery(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if rec := recover(); rec != nil {
                http.Error(w, "internal server error", http.StatusInternalServerError)
            }
        }()
        next.ServeHTTP(w, r)
    })
}

// Auth middleware using context to pass values downstream
type contextKey string

const userKey contextKey = "user"

func Auth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")
        if token == "" {
            http.Error(w, "unauthorized", http.StatusUnauthorized)
            return
        }
        // Attach authenticated user to context
        ctx := context.WithValue(r.Context(), userKey, token)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// Usage
mux.Handle("GET /api/", Chain(
    apiRouter,
    Logging(log.Default()),
    Recovery,
    Auth,
))
```

## JSON Request/Response Helpers

```go
func writeJSON(w http.ResponseWriter, status int, v any) error {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    return json.NewEncoder(w).Encode(v)
}

func readJSON(r *http.Request, v any) error {
    // Limit body to 1 MB to prevent DoS
    r.Body = http.MaxBytesReader(nil, r.Body, 1<<20)
    dec := json.NewDecoder(r.Body)
    dec.DisallowUnknownFields()
    return dec.Decode(v)
}

// Handler example
func createUser(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Name  string `json:"name"`
        Email string `json:"email"`
    }
    if err := readJSON(r, &req); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    // … create user …
    writeJSON(w, http.StatusCreated, map[string]string{"status": "created"})
}
```

## HTTP Client — Best Practices

Always use a custom `http.Client` with timeouts. Never use `http.DefaultClient` in production.

```go
// Shared client (safe for concurrent use)
var httpClient = &http.Client{
    Timeout: 30 * time.Second,
    Transport: &http.Transport{
        MaxIdleConns:        100,
        MaxIdleConnsPerHost: 10,
        IdleConnTimeout:     90 * time.Second,
    },
}

// GET with context (preferred over http.Get)
func fetchUser(ctx context.Context, url string) ([]byte, error) {
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return nil, fmt.Errorf("build request: %w", err)
    }
    req.Header.Set("Accept", "application/json")

    resp, err := httpClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("do request: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("unexpected status: %s", resp.Status)
    }

    body, err := io.ReadAll(io.LimitReader(resp.Body, 10<<20)) // 10 MB limit
    if err != nil {
        return nil, fmt.Errorf("read body: %w", err)
    }
    return body, nil
}

// POST JSON with context
func postJSON(ctx context.Context, url string, payload any) (*http.Response, error) {
    data, err := json.Marshal(payload)
    if err != nil {
        return nil, fmt.Errorf("marshal payload: %w", err)
    }

    req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(data))
    if err != nil {
        return nil, fmt.Errorf("build request: %w", err)
    }
    req.Header.Set("Content-Type", "application/json")

    return httpClient.Do(req)
}
```

## Testing with net/http/httptest

```go
import (
    "net/http"
    "net/http/httptest"
    "testing"
)

func TestGetUser(t *testing.T) {
    mux := http.NewServeMux()
    mux.HandleFunc("GET /users/{id}", getUser)

    tests := []struct {
        name   string
        path   string
        status int
    }{
        {"existing user", "/users/1", http.StatusOK},
        {"not found",     "/users/999", http.StatusNotFound},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            req := httptest.NewRequest(http.MethodGet, tt.path, nil)
            rec := httptest.NewRecorder()

            mux.ServeHTTP(rec, req)

            if rec.Code != tt.status {
                t.Errorf("got %d, want %d", rec.Code, tt.status)
            }
        })
    }
}

// Test against a real test server
func TestIntegration(t *testing.T) {
    srv := httptest.NewServer(http.HandlerFunc(getUser))
    defer srv.Close()

    resp, err := http.Get(srv.URL + "/users/1")
    if err != nil {
        t.Fatal(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        t.Errorf("got %d, want %d", resp.StatusCode, http.StatusOK)
    }
}
```

## Quick Reference

| Topic | API | Notes |
|-------|-----|-------|
| Server | `http.Server{ReadTimeout, WriteTimeout, IdleTimeout}` | Always set all three |
| Routing (1.22+) | `mux.HandleFunc("GET /path/{id}", fn)` | Method + path + wildcards |
| Path param | `r.PathValue("id")` | Go 1.22+, replaces manual parsing |
| Handler type | `http.Handler` / `http.HandlerFunc` | Prefer `Handler` for stateful types |
| Middleware | `func(http.Handler) http.Handler` | Chain with closure, innermost last |
| Client | `http.NewRequestWithContext(ctx, method, url, body)` | Never use `http.DefaultClient` |
| Body limit | `http.MaxBytesReader(w, r.Body, n)` | Prevent DoS on uploads |
| Testing | `httptest.NewRecorder()`, `httptest.NewServer()` | Unit vs integration |
| Shutdown | `srv.Shutdown(ctx)` | Graceful; waits for active requests |
