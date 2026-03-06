---
title: PACE with Go
description: Configure PACE for a Go service using go test, the standard library, and optional testify assertions.
sidebar:
  order: 8
---

This tutorial shows how to configure PACE for a Go project. FORGE will write idiomatic Go code, GATE will run `go test`, and SENTINEL will audit for Go-specific security risks.

## Prerequisites

- Go 1.22 or later
- An existing Go module (`go.mod`) with at least a minimal test file
- An API key for your LLM provider

## Project layout assumed by this tutorial

```
my-service/
├── pace/                ← PACE subdirectory
│   └── pace.config.yaml
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── catalog/
│   └── auth/
├── go.mod
├── go.sum
└── .pace/
```

## 1 — Install PACE

```bash
# From your repo root
git clone https://github.com/pace-framework-org/pace-framework-starter pace
cd pace
python -m venv .venv && source .venv/bin/activate
pip install PyYAML jsonschema anthropic
```

## 2 — Configure for Go

Edit `pace/pace.config.yaml`:

```yaml
framework_version: "1.0"

product:
  name: "My Service"
  description: >
    A Go HTTP service using net/http and chi router. Handles product catalog,
    inventory, and order management for an e-commerce backend.
    Uses PostgreSQL via pgx driver. No ORM — raw SQL with sqlx.
  github_org: "my-org"

sprint:
  duration_days: 14

source:
  dirs:
    - name: "internal"
      path: "internal/"
      language: "Go"
      description: "Domain packages: catalog, auth, orders. Each package has its own *_test.go files."
    - name: "cmd"
      path: "cmd/"
      language: "Go"
      description: "Application entry points (HTTP server, CLI tools)"

tech:
  primary_language: "Go 1.22"
  ci_system: "GitHub Actions"
  test_command: "go test ./... -v -count=1"
  build_command: "go build ./..."

platform:
  type: local

llm:
  provider: anthropic
  model: claude-sonnet-4-6
```

:::note
`-count=1` disables Go's test result caching so GATE always sees a fresh run. `-v` gives per-test output that GATE uses as evidence when evaluating acceptance criteria.
:::

### Test command variants

| Scenario | `test_command` |
|----------|---------------|
| All packages | `go test ./... -v -count=1` |
| Single package | `go test ./internal/catalog/... -v -count=1` |
| With race detector | `go test -race ./... -v -count=1` |
| With timeout | `go test ./... -v -count=1 -timeout 60s` |
| With testify | `go test ./... -v -count=1` (no change — testify is a library) |
| Short mode (skip slow tests) | `go test ./... -v -count=1 -short` |

## 3 — Set credentials

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

## 4 — Write a Go sprint plan

Create `.pace/plan.yaml` at your repo root:

```yaml
sprint:
  goal: "Add a CatalogService with product CRUD and in-memory storage"
  duration_days: 5

days:
  - day: 1
    theme: "Product domain model and repository interface"
    stories:
      - title: "Product struct, ProductRepository interface, and InMemoryRepository"
        acceptance_criteria:
          - "Product struct has ID, Name, Price float64, and StockQuantity int fields"
          - "ProductRepository interface has Create, GetByID, Update, Delete, and List methods"
          - "InMemoryRepository implements ProductRepository with a sync.RWMutex-protected map"
          - "Tests cover concurrent read/write safety (t.Parallel)"
          - "go test ./internal/catalog/... exits 0"
        out_of_scope:
          - "HTTP handlers"
          - "Database persistence"

  - day: 2
    theme: "CatalogService business logic"
    stories:
      - title: "CatalogService with validation and error types"
        acceptance_criteria:
          - "CatalogService.Create() returns ErrInvalidPrice for price <= 0"
          - "CatalogService.Restock() returns ErrProductNotFound for unknown ID"
          - "Custom error types implement the error interface"
          - "Table-driven tests cover all error and success paths"
          - "go test ./internal/catalog/... exits 0"

  - day: 3
    theme: "HTTP handler and chi routing"
    clearance_day: true
    stories:
      - title: "CatalogHandler with GET, POST, PUT endpoints"
        acceptance_criteria:
          - "GET /products returns 200 with JSON array"
          - "POST /products returns 201 with Location header and product JSON"
          - "POST /products returns 422 for invalid price"
          - "Tests use httptest.NewRecorder() — no real HTTP server"
          - "go test ./... exits 0"
```

## 5 — Run Day 1

```bash
cd pace
python pace/orchestrator.py --day 1
```

### What FORGE does with Go

FORGE's tool-calling loop will:
1. Read `go.mod` and `go.sum` to understand module paths and dependencies
2. Read existing source files to learn package structure, naming conventions, and interfaces
3. Write new `.go` files using idiomatic patterns: table-driven tests, error wrapping, context propagation
4. Run `go build ./...` to catch compile errors
5. Run `go test ./...` and read `--- FAIL` output to self-correct

A typical FORGE run for Day 1:

```
[FORGE] Reading go.mod ...
[FORGE] Reading internal/catalog/ (directory listing) ...
[FORGE] Writing internal/catalog/product.go ...
[FORGE] Writing internal/catalog/repository.go ...
[FORGE] Writing internal/catalog/memory_repository.go ...
[FORGE] Writing internal/catalog/memory_repository_test.go ...
[FORGE] Running build: go build ./... ...
[FORGE] Running tests: go test ./... -v -count=1 ...
[FORGE] All tests pass. Calling complete_handoff.
```

### What SENTINEL checks for Go

SENTINEL applies Go-specific checks:

- **SQL injection**: raw string interpolation in database queries instead of parameterized queries
- **Path traversal**: `os.Open` or `http.ServeFile` with unvalidated user input
- **Cryptography**: use of `math/rand` instead of `crypto/rand` for security tokens
- **Race conditions**: shared state without mutex protection (flagged as advisory when tests pass without `-race`)
- **Error handling**: silently ignored errors (`_ = someFunc()`) in security-sensitive code paths
- **HTTP security**: missing TLS configuration, overly permissive CORS headers
- **Secrets**: hardcoded tokens or private keys in source files

## 6 — Projects with CGO or external dependencies

If your project requires CGO or build tags, add them to the test command:

```yaml
tech:
  test_command: "go test -tags integration ./... -v -count=1"
  build_command: "CGO_ENABLED=1 go build ./..."
```

For projects with integration tests that require a running database, use build tags to separate unit from integration tests:

```yaml
tech:
  test_command: "go test -tags unit ./... -v -count=1"
```

Then annotate integration tests with `//go:build integration` so GATE only runs the fast unit suite.

## 7 — Monorepo with multiple Go modules

If your repo has separate `go.mod` files per service:

```yaml
source:
  dirs:
    - name: "catalog"
      path: "services/catalog/"
      language: "Go"
      description: "Catalog microservice — chi router, pgx, domain model"

tech:
  test_command: "cd services/catalog && go test ./... -v -count=1"
  build_command: "cd services/catalog && go build ./..."
```

PACE runs commands from the repo root, so `cd` within the command is the simplest approach.

## Common issues

**`go: command not found`**
Ensure Go is on `PATH` in the shell that runs the orchestrator. If using `asdf` or `mise` for version management, activate the correct version before running PACE.

**Tests pass individually but fail under `./...`**
This usually means package-level `init()` or `TestMain` functions conflict when run together. Add a note to `product.description` describing any global test setup so FORGE avoids conflicting initialization.

**FORGE generates code with wrong module path**
The module path is in `go.mod` (e.g. `module github.com/my-org/my-service`). FORGE reads this file, but if it generates imports with the wrong path, verify that `go.mod` is inside one of the directories listed in `source.dirs` or at the repo root where FORGE can read it.

**Race detector failures**
If you want GATE to run with `-race`, add it to `test_command`. Note that race conditions found this way will cause GATE to issue HOLD, which is the intended behavior — FORGE must fix them before the day ships.
