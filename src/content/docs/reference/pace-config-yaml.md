---
title: pace.config.yaml
description: Complete reference for every field in pace.config.yaml, PACE's single configuration file.
sidebar:
  order: 1
---

`pace.config.yaml` lives at `pace/pace.config.yaml` and is read by every agent before each run. All fields in this document are required unless marked optional.

## Top-level fields

| Field | Type | Description |
|-------|------|-------------|
| `framework_version` | string | PACE framework version. Currently `"1.0"`. |

---

## `product`

```yaml
product:
  name: "Acme API"
  description: >
    A one-paragraph description.
  github_org: "acme-corp"
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Short product name. Injected into every agent system prompt. |
| `description` | string | Yes | One paragraph describing the product, its users, and the problem it solves. |
| `github_org` | string | Yes* | GitHub organisation name. Used for constructing PR/issue URLs. *Not used when `platform.type` is not `github`. |

---

## `sprint`

```yaml
sprint:
  duration_days: 30
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `duration_days` | integer | Yes | Total days in the sprint. Running `--day N` where N > duration_days raises an error. |

---

## `source`

```yaml
source:
  dirs:
    - name: "api"
      path: "src/"
      language: "Python"
      description: "FastAPI application"
  docs_dir: null
```

### `source.dirs`

A list of source directory entries. FORGE is restricted to reading and writing files only inside these directories.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Short label used in agent prompts. |
| `path` | string | Yes | Path relative to the repository root. Must end with `/`. |
| `language` | string | Yes | Primary programming language in this directory. |
| `description` | string | Yes | One-line description injected into FORGE's system prompt. |

### `source.docs_dir`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `docs_dir` | string \| null | No | Path to an external documentation directory. SCRIBE reads from and writes to this location. Can be absolute or relative to the repo root's parent directory. Default: `null`. |

---

## `tech`

```yaml
tech:
  primary_language: "Python 3.12"
  secondary_language: null
  ci_system: "GitHub Actions"
  test_command: "pytest -v --tb=short"
  build_command: null
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `primary_language` | string | Yes | Primary language FORGE writes. Injected into agent prompts. |
| `secondary_language` | string \| null | No | Optional secondary language (e.g. `"Go 1.22"` for a CLI binary). Default: `null`. |
| `ci_system` | string | Yes | CI/CD system name. Injected into CONDUIT's prompt. |
| `test_command` | string | Yes | Command GATE runs from the repo root to execute the test suite. Must exit 0 on success. |
| `build_command` | string \| null | No | Optional command run before tests (e.g. `"go build ./..."`). Default: `null`. |

---

## `platform`

```yaml
platform:
  type: github
```

| Field  | Type   | Required | Description                                    |
|--------|--------|----------|------------------------------------------------|
| `type` | string | Yes      | Platform adapter to use. See table below.      |

### Platform type details

| Type | PR/MR | Issues | CI polling | Job summary |
|------|-------|--------|-----------|-------------|
| `github` | GitHub PR | GitHub Issue | GitHub Actions via API | `$GITHUB_STEP_SUMMARY` |
| `gitlab` | GitLab MR | GitLab Issue | GitLab Pipelines API | `$CI_JOB_SUMMARY` or file |
| `bitbucket` | Bitbucket PR | Bitbucket Issue | Bitbucket Pipelines API | `pace-summary.md` |
| `jenkins` | Local file | Local file | Jenkins REST API | `jenkins-summary.md` |
| `jira` | Jira Task | Jira Bug/Task | Not supported (`no_runs`) | `pace-summary.md` |
| `local` | Local file | Local file | Returns `no_runs` | `pace-summary.md` |

See [Switch Platform](/guides/switch-platform/) and [Connect PACE to Jira](/guides/jira-adapter/) for credential setup per platform.

---

## `advisory`

```yaml
advisory:
  push_to_issues: false
```

Controls how non-blocking advisory findings from SENTINEL and CONDUIT are surfaced.

| Field              | Type    | Required | Description                                                    |
|--------------------|---------|----------|----------------------------------------------------------------|
| `push_to_issues`   | boolean | No       | Open an issue per backlisted advisory batch. Default: `false`. |

Advisory findings always accumulate in `.pace/advisory_backlog.yaml` regardless of this setting. The `push_to_issues` flag controls whether they are also mirrored to an external issue tracker.

See [Push Advisory Findings to Issue Trackers](/guides/push-advisory-to-issues/) for details.

---

## `llm`

```yaml
llm:
  provider: anthropic
  model: claude-sonnet-4-6
  analysis_model: claude-haiku-4-5-20251001
  base_url: null
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | string | Yes | LLM adapter to use. One of: `anthropic`, `litellm`. Default: `anthropic`. |
| `model` | string | Yes | Model identifier. For `litellm`, include the provider prefix (e.g. `openai/gpt-4o`). Used by FORGE and SCRIBE. |
| `analysis_model` | string \| null | No | Model for PRIME, GATE, SENTINEL, CONDUIT. Defaults to `model` if not set. Use a cheaper model (e.g. `claude-haiku-4-5-20251001`) to reduce cost without sacrificing quality on analytical tasks. |
| `base_url` | string \| null | No | Optional API endpoint override. Required for self-hosted Ollama. Default: `null`. |

### Model examples

| Provider | Model string | Notes |
|----------|-------------|-------|
| `anthropic` | `claude-sonnet-4-6` | Recommended default |
| `anthropic` | `claude-opus-4-6` | Best capability |
| `anthropic` | `claude-haiku-4-5-20251001` | Fastest / cheapest |
| `litellm` | `openai/gpt-4o` | OpenAI |
| `litellm` | `gemini/gemini-2.0-flash` | Google |
| `litellm` | `bedrock/anthropic.claude-sonnet-4-6` | AWS Bedrock |
| `litellm` | `azure/gpt-4o` | Azure OpenAI |
| `litellm` | `groq/llama-3.1-70b-versatile` | Groq |
| `litellm` | `mistral/mistral-large-latest` | Mistral |
| `litellm` | `ollama/llama3.1` | Local Ollama |

See [Switch LLM Provider](/guides/switch-llm-provider/) for provider credential setup.

---

## `cost_control`

```yaml
cost_control:
  max_story_ac: 5
  max_story_cost_usd: 1.50
```

Controls proactive story scoping. When a story exceeds either threshold, PRIME is automatically re-invoked to split it: today's story carries the highest-value criteria (up to `max_story_ac`), and the remainder is written to `.pace/day-N/deferred_scope.yaml` for the next day's PRIME to pick up automatically.

| Field                | Type    | Required | Description                                                                                                        |
|----------------------|---------|----------|--------------------------------------------------------------------------------------------------------------------|
| `max_story_ac`       | integer | No       | Trigger PRIME refinement if AC count exceeds this. `0` to disable. Default: `5`.                                  |
| `max_story_cost_usd` | float   | No       | Trigger PRIME refinement if SCOPE predicts FORGE cost exceeds this (USD). `0` to disable. Default: `0` (disabled). |

Up to 2 refinement rounds are attempted. If refinement fails, FORGE runs on the original story as a fallback.

See [Proactive Story Scoping](/guides/story-scoping/) for details and threshold tuning guidance.

---

## Full annotated example

```yaml
framework_version: "1.0"

product:
  name: "Acme API"
  description: >
    Acme API is a REST backend for the Acme e-commerce platform.
    It serves mobile and web clients and handles orders, inventory,
    and payments for small business owners.
  github_org: "acme-corp"

sprint:
  duration_days: 30

source:
  dirs:
    - name: "api"
      path: "src/"
      language: "Python"
      description: "FastAPI application, domain models, and business logic"
    - name: "cli"
      path: "cli/"
      language: "Go"
      description: "Operator CLI for database migrations and admin tasks"
  docs_dir: "../acme-docs/api"

tech:
  primary_language: "Python 3.12"
  secondary_language: "Go 1.22"
  ci_system: "GitHub Actions"
  test_command: "pytest -v --tb=short"
  build_command: "go build ./cli/..."

platform:
  type: github

llm:
  provider: anthropic
  model: claude-sonnet-4-6
  analysis_model: claude-haiku-4-5-20251001
  base_url: null

cost_control:
  max_story_ac: 5
  max_story_cost_usd: 1.50
```
