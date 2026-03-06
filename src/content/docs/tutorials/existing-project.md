---
title: Add PACE to an Existing Project
description: How to introduce PACE into a repository that already has code, tests, and CI — without losing what you have.
sidebar:
  order: 3
---

This tutorial walks you through adding PACE to a repository that already has production code. Unlike the Quickstart, which assumes a mostly greenfield setup, this path is for teams that want to run PACE sprints on top of existing work.

## What makes an existing project different?

When you initialise PACE on an existing codebase, two things are different from a greenfield start:

1. **SCRIBE already has material to work with.** Your existing source files, README, CI workflows, and architecture docs give SCRIBE real facts to write into `engineering.md`, `security.md`, and `devops.md`. The context documents it produces will be specific and accurate from Day 1, rather than mostly stubs.

2. **Your sprint plan targets features, not foundations.** `plan.yaml` should describe work that builds on top of what already exists — new endpoints, extended functionality, refactored modules — not setting up project infrastructure that is already in place.

## Step 1: Install PACE

Copy the `pace/` directory and `.github/workflows/pace.yml` into your repository root. This is identical to the Quickstart:

```bash
cp -r pace-framework-starter/pace ./pace
cp -r pace-framework-starter/.github ./.github
cp -r pace-framework-starter/.pace ./.pace
```

Do not replace your existing `src/`, tests, CI workflows, or any application code.

## Step 2: Configure pace.config.yaml

Open `pace/pace.config.yaml` and fill in the fields that describe your existing project:

```yaml
product:
  name: "Payments API"
  description: >
    A REST API for processing card payments. Handles authorisation,
    capture, refunds, and webhook delivery. Python 3.12 / FastAPI.
  github_org: "my-org"

sprint:
  duration_days: 30

source:
  dirs:
    # List the directories FORGE is allowed to write into.
    # For an existing project, include only the directories you want PACE to modify.
    - name: "api"
      path: "src/api/"
      language: "Python"
      description: "FastAPI route handlers and middleware"
    - name: "services"
      path: "src/services/"
      language: "Python"
      description: "Business logic and external integrations"

  # Optional: point SCRIBE to an external documentation folder.
  # Useful if your team maintains architecture docs, ADRs, or product specs
  # outside the code repository (e.g. a separate docs repo or wiki export).
  # docs_dir: "../my-product-docs"
  docs_dir: null

tech:
  primary_language: "Python 3.12"
  ci_system: "GitHub Actions"
  test_command: "pytest -v --tb=short"
  build_command: null

platform:
  type: github

llm:
  provider: anthropic
  model: claude-sonnet-4-6
```

:::tip[Scope FORGE's access carefully]
The `source.dirs` list controls where FORGE writes code. For existing projects, be explicit. If you only want PACE to extend `src/api/`, do not list `src/core/` — FORGE will stay out of it.
:::

## Step 3: Point SCRIBE to your existing docs (optional)

If your team maintains product, architecture, or security documentation outside the code repo (a separate `docs/` repo, a Notion export, an ADR folder), set `docs_dir` in `pace.config.yaml`:

```yaml
source:
  docs_dir: "../my-product-docs"
```

SCRIBE will read from both the code repo and this folder when generating context documents. It specifically looks for files named:

| Document | What SCRIBE looks for in `docs_dir` |
|---|---|
| `product.md` | Files with `mvp`, `vision`, `persona`, `roadmap`, `strategy` in the name |
| `engineering.md` | Files with `architecture`, `tech_stack`, `api`, `contracts`, `adr` |
| `security.md` | Files with `security`, `threat`, `stride`, `compliance`, `audit` |
| `devops.md` | Files with `ci`, `deployment`, `devops`, `runbook`, `onboarding` |

The path can be relative (resolved from the repository root's parent) or absolute.

## Step 4: Run SCRIBE to generate context documents

SCRIBE runs automatically the first time the orchestrator runs (Day 1), but you can also trigger it manually before your first sprint to review what it produces:

```bash
cd pace
python -c "from agents.scribe import run_scribe; run_scribe()"
```

Review the four files SCRIBE writes to `.pace/context/`:

```
.pace/context/
  product.md      ← vision, personas, MVP scope, success metrics
  engineering.md  ← module map, tech stack, architecture, test patterns
  security.md     ← sensitive data inventory, threat model, security requirements
  devops.md       ← CI/CD topology, env vars, deployment, runbook
```

Read each file. If SCRIBE missed something important (a subtle security invariant, a non-obvious deployment step, a data-privacy constraint), edit the file directly. **These are living documents** — you own them and can edit them at any time. To regenerate a specific document from scratch, delete it and re-run the orchestrator.

:::caution[Review security.md closely]
SCRIBE generates `security.md` from what it can read in source files and docs. Sensitive invariants that live only in institutional knowledge — "we never log card numbers", "all PII must stay in the EU region" — must be added manually. SENTINEL reads `security.md` on every day of the sprint.
:::

## Step 5: Write plan.yaml for your existing codebase

`plan.yaml` targets work that extends your existing system. Write targets that assume the current code is already there:

```yaml
sprint:
  name: "Payments API — Sprint 4"
  goal: "Add webhook retry logic, refund partial-capture support, and rate-limit the authorisation endpoint"
  duration_days: 15

days:
  - day: 1
    target: "Add idempotency key support to POST /authorise — store keys in Redis with 24h TTL"
  - day: 2
    target: "Write integration tests for idempotency: duplicate request returns cached response"
  - day: 3
    target: "Add rate limiting to POST /authorise: 100 req/min per API key using slowapi"
  - day: 4
    target: "Implement webhook retry queue: exponential backoff, max 5 attempts, dead-letter after final failure"
  - day: 5
    theme: "Mid-sprint advisory clearance"
    human_gate: false
    target: "Clearance day — resolve all open SENTINEL and CONDUIT advisories"
  - day: 6
    target: "Add partial-capture refund: allow refunding less than the captured amount"
  ...
```

Note that Day 1 says "add idempotency key support to POST /authorise" — it assumes the route already exists. PRIME will read `engineering.md` to understand where the route lives before generating the story card. FORGE will read it to know which file to modify.

## Step 6: Handle your existing CI with CONDUIT

CONDUIT reviews your CI/CD configuration on every day. If your existing CI has patterns it flags (pinned to `@master`, missing dependency caching, test steps that aren't pinned), it will raise advisories. On Day 1 this may generate several findings about pre-existing issues.

This is intentional. You can handle them in one of two ways:

1. **Fix them on Day 1 before running PACE** — run through your CI config and address any obvious pinning or configuration issues first.
2. **Let them accumulate to the first clearance day** — CONDUIT advisories are non-blocking. They'll appear in the advisory backlog and must be cleared on the clearance day (every 7th day by default, or any day you mark in `plan.yaml`).

## Step 7: Run Day 1

Set the required environment variables and trigger the workflow:

```bash
# Locally
PACE_DAY=1 ANTHROPIC_API_KEY=your-key python pace/orchestrator.py

# Or push to main to trigger .github/workflows/pace.yml
# (set ANTHROPIC_API_KEY in repository secrets)
```

On Day 1, the orchestrator will:

1. **Preflight**: check for context documents. Since this is Day 1, SCRIBE runs (unless you already ran it manually in Step 4).
2. **PRIME**: read `product.md` and the sprint plan to generate a story card for Day 1's target.
3. **FORGE**: read `engineering.md` to understand the module map, then implement the story using a tool-calling loop.
4. **GATE**: run your existing test suite (`tech.test_command`) and evaluate each acceptance criterion.
5. **SENTINEL**: review the implementation against `security.md`.
6. **CONDUIT**: review CI configuration against `devops.md`.

## Regenerating context documents mid-sprint

You can force SCRIBE to regenerate any context document at any time:

```bash
# Regenerate engineering.md after a significant refactor
rm .pace/context/engineering.md
PACE_DAY=<next-day> python pace/orchestrator.py
# SCRIBE runs automatically during preflight
```

Or regenerate all four documents:

```bash
rm .pace/context/*.md
python -c "from agents.scribe import run_scribe; run_scribe()"
```

Regenerating context does not reset the sprint or advisory backlog — only the context documents are affected.

## Common issues on existing projects

**FORGE modifies the wrong files.** Tighten `source.dirs` in `pace.config.yaml` to restrict FORGE's working directory to only the areas you want it to touch.

**GATE fails because the test suite is slow or requires services.** Set a focused `test_command` that runs only the tests relevant to the sprint (e.g. `pytest tests/api/ -v --tb=short`). Full integration tests that require a running database should be in a separate CI step, not the one GATE evaluates.

**SCRIBE generates generic sections for `security.md` because there are no security docs.** Edit `.pace/context/security.md` manually and add your actual threat model. SENTINEL uses this file to calibrate what it checks.

**CONDUIT flags many pre-existing CI issues on Day 1.** Either fix them before starting (recommended) or accept that they'll accumulate as advisories and be force-cleared on your first clearance day.
