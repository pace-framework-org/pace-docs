---
title: Control Daily API Spend
description: Set a configurable daily budget cap so PACE skips cron runs automatically when the limit is reached.
sidebar:
  order: 3
---

PACE tracks token usage across every agent call and compares the accumulated daily spend against a configurable budget before each scheduled run. When the budget is reached, subsequent cron runs are skipped — without interrupting any currently executing run.

## How it works

```
Cron trigger fires
      ↓
Check daily budget step
  ├── Reads PACE_DAILY_BUDGET and PACE_DAILY_SPEND variables
  ├── Resets counter if it's a new calendar day
  └── Sets budget_exceeded step output
      ↓
budget_exceeded == true?
  ├── Yes → "Run PACE cycle" step is skipped. No API calls made.
  └── No  → Orchestrator runs normally
      ↓
On exit (success, hold, or abort):
  └── Writes updated total to PACE_DAILY_SPEND variable
```

The current run is **never interrupted mid-flight**. Only the next cron trigger is affected.

## Manual runs bypass the cap

`workflow_dispatch` triggers (runs you start manually from the GitHub Actions UI or the `gh` CLI) **always proceed** regardless of the daily budget. The budget check is intentionally bypassed:

```text
[PACE] Manual trigger — budget check bypassed.
```

This means:

- A human explicitly requesting a run will never be silently blocked.
- The cost of that manual run **is still tracked** and added to `PACE_DAILY_SPEND`, so the next scheduled cron will see the updated total.

## Setup

### 1 — Set the daily budget variable

Go to your GitHub repository → **Settings → Secrets and variables → Actions → Variables** and create:

| Variable name | Value | Notes |
| ------------- | ----- | ----- |
| `PACE_DAILY_BUDGET` | `15` | USD limit per calendar day |

Set to `0` or leave unset for unlimited spend (the default — no behaviour change for existing deployments).

### 2 — No workflow changes needed

The budget-check step is already part of the `pace.yml` workflow shipped with the framework. It runs automatically before every `Run PACE cycle` step.

### 3 — Monitor spend in run logs

Each run prints a per-model breakdown:

```text
[PACE] API usage this run:
  claude-haiku-4-5-20251001: 45,230 in + 8,912 out = $0.0718
  claude-sonnet-4-6: 124,500 in + 31,200 out = $0.8430
  Run total: $0.9148
[PACE] Daily spend updated: $2.14 (this run: $0.9148)
```

The variables `PACE_DAILY_SPEND` and `PACE_DAILY_SPEND_DATE` are maintained automatically — you never need to set them manually.

## Reduce per-run cost

Combine the budget cap with the `analysis_model` setting for maximum savings:

```yaml
# pace/pace.config.yaml
llm:
  provider: anthropic
  model: claude-sonnet-4-6           # FORGE + SCRIBE (code generation)
  analysis_model: claude-haiku-4-5-20251001  # PRIME, GATE, SENTINEL, CONDUIT
```

Analytical agents (PRIME, GATE, SENTINEL, CONDUIT) are single-call with 4k token responses. Switching them to Haiku reduces per-run cost by ~40–50% with no quality impact on analytical tasks.

## Estimated daily cost

Typical costs per successful sprint day (one SHIP attempt):

| Config | Estimated cost |
| ------ | -------------- |
| All Sonnet, 2 attempts | $2–4 |
| Sonnet (FORGE) + Haiku (analysis), 1 attempt | $0.50–1.50 |
| All Haiku | $0.10–0.30 (not recommended — FORGE quality degrades) |

A `PACE_DAILY_BUDGET` of `$10–15` comfortably covers 4× daily cron runs on normal days while blocking runaway spend if the pipeline enters a retry loop.

## Day rollover

`PACE_DAILY_SPEND` resets automatically at the start of the first cron run on a new UTC calendar day — no manual intervention needed. The budget-check step compares `PACE_DAILY_SPEND_DATE` to today's date and resets the counter if they differ.

## Troubleshooting

**"Budget check step fails with permission error"**
The `GH_TOKEN` in the budget-check step needs `repo` scope (or `variables:write` fine-grained permission) to call `gh variable set`. For the nolapse-platform template, `PACE_GH_TOKEN` is used. For the generic starter, `GITHUB_TOKEN` with the default Actions permission is sufficient.

**"Spend is not being tracked"**
Confirm `python pace/orchestrator.py` exits normally — `atexit` handlers are not called on `SIGKILL`. Forcibly terminated runs won't update the counter (conservative — it under-counts rather than over-counts).

**"I want to reset the counter manually"**
Set `PACE_DAILY_SPEND` to `0` in the repository variables. The counter will restart from zero on the next run.
