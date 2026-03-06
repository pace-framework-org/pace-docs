---
title: Configure Your Project
description: A step-by-step guide to filling in pace.config.yaml and initialising PACE for your specific repository.
sidebar:
  order: 1
---

`pace.config.yaml` is the single source of truth for PACE. Every agent reads from it. This guide walks through each section so you can configure PACE accurately for your project.

## Locate the config file

The config lives at `pace/pace.config.yaml` (inside the `pace/` subdirectory at your repo root). The starter repo ships a fully annotated template.

## Product section

```yaml
product:
  name: "Acme API"
  description: >
    Acme API is a REST backend for the Acme e-commerce platform.
    It serves mobile and web clients and handles orders, inventory, and payments.
  github_org: "acme-corp"
```

- **`name`** — injected into every agent system prompt. Keep it short (2–4 words).
- **`description`** — one paragraph. Agents use this to understand product context when making architecture decisions.
- **`github_org`** — used when constructing GitHub URLs for PRs and issues. Not needed for non-GitHub platforms.

## Sprint section

```yaml
sprint:
  duration_days: 30
```

Controls how many days the orchestrator considers valid. If you try to run `--day 31` on a 30-day sprint, the orchestrator raises an error.

## Source section

```yaml
source:
  dirs:
    - name: "api"
      path: "src/"
      language: "Python"
      description: "FastAPI application and domain models"
    - name: "cli"
      path: "cli/"
      language: "Go"
      description: "CLI binary for operators"
  docs_dir: null
```

- **`dirs`** — FORGE is restricted to writing files only inside these directories. Add one entry per distinct source root.
- **`docs_dir`** — optional path to an external documentation folder. SCRIBE reads from here when generating context documents. Can be absolute or relative to the repo root's parent directory.

:::tip
If your repository has a single source root (e.g. `src/`), one entry is enough. Add more entries only for genuinely separate modules with different languages or ownership.
:::

## Tech section

```yaml
tech:
  primary_language: "Python 3.12"
  secondary_language: "Go 1.22"
  ci_system: "GitHub Actions"
  test_command: "pytest -v --tb=short"
  build_command: null
```

- **`test_command`** — GATE runs this command from your repo root. It must exit 0 for all tests to pass.
- **`build_command`** — optional; run before tests. Use for compiled languages (e.g. `go build ./...`).
- **`ci_system`** — informational; injected into CONDUIT's prompt.

### Common test commands

| Stack | Command |
|-------|---------|
| Python / pytest | `pytest -v --tb=short` |
| Go | `go test ./... -v` |
| Node / Jest | `npx jest --ci` |
| Node / Vitest | `npx vitest run` |
| Ruby / RSpec | `bundle exec rspec` |
| Rust | `cargo test` |

## Platform section

```yaml
platform:
  type: github
```

Supported values: `github`, `gitlab`, `bitbucket`, `jenkins`, `local`.

See [Switch Platform](/guides/switch-platform/) for per-platform credential setup.

## LLM section

```yaml
llm:
  provider: anthropic
  model: claude-sonnet-4-6
  base_url: null
```

- **`provider`** — `anthropic` (default) or `litellm`.
- **`model`** — model name. For `litellm`, prefix with the provider (e.g. `openai/gpt-4o`).
- **`base_url`** — optional endpoint override (e.g. `http://localhost:11434` for Ollama).

See [Switch LLM Provider](/guides/switch-llm-provider/) for examples.

## Context documents

After SCRIBE runs, it creates/updates context files in `.pace/context/`:

| File | Purpose |
|------|---------|
| `engineering.md` | Module map, conventions, FORGE follows this |
| `security.md` | Security boundaries, SENTINEL checks these |
| `devops.md` | CI/CD conventions, CONDUIT checks these |
| `product.md` | Product decisions, PRIME uses this |

You can pre-populate these files before Day 1 to give agents better starting context.

## Validating your configuration

Run the config validator:

```bash
python pace/pace/config.py --validate
```

This checks required fields, type correctness, and that all `source.dirs` paths exist.
