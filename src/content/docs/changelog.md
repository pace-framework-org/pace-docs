---
title: Changelog
description: Version history and release notes for the PACE framework.
sidebar:
  order: 99
---

All notable changes to the PACE framework are documented here.
Versions follow [Semantic Versioning](https://semver.org/). Git tags (`v1.3.0`, `v1.2.0`, …) are applied to both the `pace-framework-starter` and the `nolapse-platform` repositories.

---

## v1.4.0 — 2026-03-13

### Retry cost visibility — `attempts.yaml`

**PACE now records the cost and outcome of every pipeline run — including failed retries — in a per-day artifact.**

Previously, `cycle.md` was only written on SHIP, so the cost of HOLDs and retries was invisible. A day that retried three times at $3.50 each appeared in PROGRESS.md as "$3.50" (the successful run) with no indication of the $7.00 burned on failed attempts.

New per-day artifact: `.pace/day-N/attempts.yaml`

```yaml
- run: 1
  date: "2026-03-13T04:12:33Z"
  cost_usd: 3.4821
  outcome: HOLD
  hold_reason: "GATE HOLD: CI timed out waiting for check-runs"
- run: 2
  date: "2026-03-13T05:47:11Z"
  cost_usd: 3.1054
  outcome: SHIP
```

PROGRESS.md changes:
- Actual Cost column renamed from `Actual Cost (pipeline)` → `Actual Cost`
- Days with multiple attempts show a `(Nx)` suffix (e.g. `$6.59 (2×)`)
- Cost Summary gains two new rows: `Total actual (incl. retries)` and `Wasted on retries`

### FORGE: Directory guard

FORGE no longer crashes with `[Errno 21] Is a directory` when the LLM passes a directory path to `read_file` or `write_file`.

- `read_file` on a directory path now returns a listing of files inside the directory, helping FORGE pick the correct file on its next call
- `write_file` on a directory path returns an actionable error with a file path hint (e.g. `"Specify the full file path (e.g. 'src/foo/action.yml')"`)

### FORGE: Safe tool dispatch

`_dispatch_tool` now uses `.get()` for all argument access and returns descriptive `ERROR:` strings when required arguments are missing. Previously, a missing `path` or `content` field (which can happen when the LLM omits a required argument) raised a `KeyError` that crashed the pipeline mid-run.

### FORGE: String list coercion

`known_gaps` and `edge_cases_tested` in the FORGE handoff are automatically coerced from markdown bullet strings to Python lists before JSON Schema validation. The LLM occasionally returns these fields as multi-line strings (`"- item one\n- item two"`) rather than YAML arrays, causing spurious schema validation failures.

### GitHub platform: 422 early-return in CI polling

`wait_for_commit_ci` now returns `{"conclusion": "no_runs"}` immediately on HTTP 422, instead of retrying for the full `timeout_minutes` (default: 15 minutes). HTTP 422 from the GitHub check-runs API means the commit SHA is unknown to the CI system — this happens when FORGE pushes to a branch that has no CI workflow trigger. Retrying does not help and burns the full polling window.

If your project's CI workflow does not trigger on the FORGE commit branch, GATE will now receive `no_runs` promptly and can evaluate non-CI acceptance criteria immediately.

### `spend_tracker.install()` monkeypatch

`orchestrator.py` now calls `spend_tracker.install()` at module load time. This monkeypatches the Anthropic SDK so that FORGE's direct API calls (which bypass the LLM adapter layer) are correctly attributed to the run's cost total. Previously, projects using the generic `forge.py` (which calls `anthropic.Anthropic()` directly) under-reported FORGE cost in `PACE_DAILY_SPEND` and `cycle.md`.

### Other

- `PACE_VERSION` bumped to `"1.4.0"` in `config.py`

---

## v1.3.0 — 2026-03-11

### Configurable FORGE behaviour

Three new knobs under `forge:` in `pace.config.yaml` give you precise control over how the FORGE agent runs. All three default to the previous hardcoded behaviour so existing projects require no changes.

```yaml
forge:
  tdd_enforcement: true   # default
  coverage_rule: true     # default
  max_iterations: 35      # default
```

**`tdd_enforcement`** (bool, default `true`)

When `true`, FORGE follows mandatory 4-phase TDD: RED → GREEN → REFACTOR → COMMIT. The `confirm_red_phase` tool is injected into the tool list and acts as a hard gate — FORGE cannot call `complete_handoff` until it has confirmed at least one failing test. Set `false` for stories with nothing to test (docs, infrastructure config, database migrations).

**`coverage_rule`** (bool, default `true`)

When `true`, the COVERAGE RULE is injected into FORGE's system prompt. FORGE is instructed that every production file it creates or modifies must have corresponding tests, and existing test counts must not decrease. Only effective when `tdd_enforcement` is also `true`; ignored when `false`.

**`max_iterations`** (int, default `35`)

Safety limit on the agentic tool-use loop. If FORGE does not call `complete_handoff` within this many LLM calls the run raises a `RuntimeError` and the pipeline fails. See [Tuning max_iterations](/guides/enforce-test-coverage/#tuning-max_iterations) for guidance on setting this empirically.

### FORGE run telemetry — `iterations_used`

Every `handoff.yaml` now includes an `iterations_used` integer field, injected by the framework (not generated by the LLM) when `complete_handoff` fires:

```yaml
iterations_used: 18
```

After a few sprint days you can compute the p95 across all days and set `max_iterations` to `ceil(p95 × 1.3)` — enough headroom for outlier stories without an unbounded safety net. See [Tuning max_iterations](/guides/enforce-test-coverage/#tuning-max_iterations) for the exact formula and a ready-to-run script.

### Other

- `PACE_VERSION` bumped to `"1.3.0"` in `config.py`

---

## v1.2.0 — 2026-03-11

### Cost Estimation Accuracy (Option A)

**PLANNER now uses `claude-sonnet-4-6` for Day 0 cost estimates** instead of `claude-haiku-4-5-20251001`.

Previously, estimates were made using the cheap analysis model (Haiku at $0.80/$4.00 per M tokens) while FORGE ran on Sonnet ($3.00/$15.00 per M tokens) — a 3.75× pricing gap that caused estimates to be systematically 2–3× lower than actuals.

Changes:

- `planner.py` `_estimate_day_cost()` now accepts/uses the main LLM model parameter
- Calibrated cost ranges updated for Sonnet pricing (simple: $0.50–$1.20, medium: $1.20–$2.50, complex: $2.50–$5.00+)
- `planner.md` now includes `estimation_model` field so reports are self-documenting
- Default fallback raised from $0.80 → $2.00 to match Sonnet reality
- `orchestrator.py` passes `cfg.llm.model` (Sonnet) to `run_planner()` instead of `cfg.llm.analysis_model` (Haiku)

### Full Pipeline Cost Tracking (Option C)

**Actual cost now tracks the full PRIME → FORGE → GATE → SENTINEL → CONDUIT pipeline**, not just FORGE in isolation.

Previously, `forge_cost_usd` in `handoff.md` only captured the FORGE agent's API cost. The analytical agents (each ~$0.05–$0.15) were tracked in `PACE_DAILY_SPEND` but not surfaced per-story in PROGRESS.md.

Changes:

- New per-day artifact: `.pace/day-N/cycle.md` — written on SHIP, contains:
  - `cycle_cost_usd`: total cost of all agents for that day
  - `forge_cost_usd`: FORGE-only cost (for reference)
  - `generated_at`: ISO timestamp
- `reporter.py` `_load_cycle_cost()`: reads `cycle.md` first, falls back to `forge_cost_usd` for backward compatibility with pre-v1.2.0 artifacts
- PROGRESS.md column renamed from `Actual Cost` → `Actual Cost (pipeline)`
- Cost Summary now shows both `Total actual (full pipeline)` and `Total actual (FORGE only)` rows

### Re-planning / Re-budgeting (PACE_REPLAN)

**New `PACE_REPLAN=true` mode** lets you refresh estimates mid-sprint without overwriting completed day actuals.

Usage:

```bash
PACE_DAY=0 PACE_REPLAN=true ANTHROPIC_API_KEY=... python pace/orchestrator.py
```

Behaviour:

- Reads `cycle.md` (or `handoff.md`) for each completed day to load actual costs
- Preserves existing estimate + attaches actual for completed days (no new LLM call)
- Re-estimates remaining days fresh using Sonnet
- `planner.md` gains a `replan: true` field to distinguish from original Day 0 runs

See [Day 0 — Sprint Planning](/guides/day-zero/) for full usage details.

### Other

- `PACE_VERSION` bumped to `"1.2.0"` in `config.py`
- `orchestrator.py` imports `datetime`/`timezone` at module level (previously in `_update_daily_spend` closure)

---

## v1.1.0 — 2025-12

### Advisory Backlog & Clearance Days

- **Advisory backlog system**: SENTINEL and CONDUIT advisories that cannot be resolved in one retry are stored in `.pace/advisory_backlog.yaml` rather than causing a HOLD
- **Clearance days** (every 7th day): FORGE is given the full open backlog to resolve; day fails if any items remain open after all agents run
- **`push_to_issues`**: Optional flag to push backlogged advisory items to GitHub/GitLab issues automatically

### SCOPE pre-check

- Pre-FORGE cost prediction using the analysis model (Haiku); triggers PRIME refinement if `max_story_cost_usd` threshold is exceeded
- Configurable via `cost_control.max_story_cost_usd` in `pace.config.yaml`

### Platform adapters

- Added GitLab CI adapter (`platforms/gitlab.py`)
- Added Bitbucket Pipelines adapter (`platforms/bitbucket.py`)
- Added Jenkins adapter (`platforms/jenkins.py`)
- `get_ci_adapter()` / `get_tracker_adapter()` factory functions auto-detect from `pace.config.yaml`

### Multi-LLM support (LiteLLM)

- `llm/` adapter layer added: `AnthropicAdapter` and `LiteLLMAdapter`
- Set `provider: litellm` in `pace.config.yaml` to route FORGE/SCRIBE through any OpenAI-compatible endpoint (Ollama, Azure OpenAI, Bedrock, etc.)
- `get_llm_adapter(model=...)` factory used by all agents

---

## v1.0.0 — 2025-11

Initial release of the PACE (Plan → Act → Check → Evolve) framework.

### Core pipeline

- `orchestrator.py`: PRIME → FORGE → GATE → SENTINEL → CONDUIT daily cycle
- `agents/prime.py`: Story card generation from plan targets
- `agents/forge.py`: Agentic TDD code-writing with tool-use loop (read/write/bash/git)
- `agents/gate.py`: Acceptance criteria validation
- `agents/sentinel.py`: Security and SRE review
- `agents/conduit.py`: DevOps and CI/CD review

### Day 0 planning

- `planner.py`: Per-day cost estimation using analysis model
- `PROGRESS.md` populated with estimated costs before sprint begins

### Cost tracking

- `spend_tracker.py`: Per-model token accounting via adapter layer
- `PACE_DAILY_SPEND` / `PACE_DAILY_BUDGET` variable-based budget cap
- Daily spend flushed to CI variable on `atexit`

### Reporter

- `reporter.py`: `update_progress_md()` and `write_job_summary()` for CI job summaries
- Sprint stats: SHIP rate, deferred items, escalated holds, open advisories

### GitHub Actions integration

- `pace.yml` workflow: cron + manual dispatch, budget-check step, day counter advancement
- `pace.config.yaml`: single configuration file for product, sprint, LLM, platform, and cost-control settings
