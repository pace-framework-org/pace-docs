---
title: Day 0 — Sprint Planning
description: Run Day 0 before your sprint begins to estimate per-story costs, pre-populate PROGRESS.md, and start every day with full cost visibility.
sidebar:
  order: 3
---

PACE supports a **Day 0 planning phase** that runs before Day 1 begins. Day 0 does not write any code — it estimates the cost of every story in your sprint plan, pre-populates `PROGRESS.md` with those estimates, and gives you a total sprint cost forecast you can use to set budget caps.

## What Day 0 does

```
PLANNER reads plan.yaml
        ↓
For each day (1 – N):
  Human gate day? → $0.00, skip
  Otherwise       → single Haiku call (≈ $0.005)
                    returns predicted_iterations + predicted_cost_usd
        ↓
Writes .pace/day-0/planner.md (per-day breakdown + total estimate)
        ↓
Writes PROGRESS.md with cost columns pre-filled
```

The entire planning run costs roughly **$0.005 × N sprint days** — about $0.15 for a 30-day sprint.

## PROGRESS.md after Day 0

Once Day 0 completes, `PROGRESS.md` gains two new columns in the Day Log:

| Day | Story | Decision | Est. Cost | Actual Cost | Notes |
| --- | --- | --- | --- | --- | --- |
| 0 | Sprint planning | 📋 PLAN | — | $0.0234 | Cost estimation |
| 1 | Repo scaffold | ⏳ PENDING | $0.45 | — | |
| 2 | nolapse run skeleton | ⏳ PENDING | $0.80 | — | |
| … | … | … | … | … | |

After each day ships, the **Actual Cost** column is filled in from the `forge_cost_usd` field in the day's `handoff.md`. After the final day, a **Cost Summary** section is added:

```
## Cost Summary

| Metric | Value |
| --- | --- |
| Total estimated (Days 1–30) | $18.50 |
| Total actual (FORGE runs)   | $16.42 |
| Variance                    | -$2.08 (-11%) |
| Day 0 planning cost         | $0.0234 |
```

## Running Day 0

### pace-framework-starter

Set `PACE_DAY=0` (or set the `PACE_DAY` repository variable to `0`) and trigger the workflow manually:

```bash
# Locally
PACE_DAY=0 ANTHROPIC_API_KEY=... python pace/orchestrator.py
```

Or in GitHub Actions via manual dispatch with `day: 0` as the input. After Day 0 completes, the workflow automatically advances the day counter to `1` so Day 1 runs next.

### nolapse-platform

Set `PACE_CURRENT_DAY` to `0` in **Settings → Secrets and variables → Actions → Variables**, then trigger the workflow manually (`workflow_dispatch`). After Day 0 completes, the counter is advanced to `1`.

## Artifact written

Day 0 writes a single artifact:

**`.pace/day-0/planner.md`** — YAML file containing:

```yaml
day: 0
agent: PLANNER
generated_at: "2026-03-09T10:00:00Z"
total_estimated_usd: 18.50
planning_cost_usd: 0.0234
estimates:
  - day: 1
    target: "Repo scaffold — nolapse-cli Go module initialized..."
    predicted_iterations: 8
    predicted_cost_usd: 0.45
    reasoning: "Simple scaffold with 2-3 files and a CI pass."
  - day: 2
    target: "nolapse run command skeleton..."
    predicted_iterations: 12
    predicted_cost_usd: 0.80
    reasoning: "Medium complexity CLI skeleton with cobra and flag wiring."
  …
```

This file is committed to the repository. The reporter reads it on every subsequent `update_progress_md()` call to render the cost columns.

## Example log output

```text
[PACE] === Day 0 — Sprint Planning & Cost Estimation ===
[PACE] Day 0: Estimating cost for 30 sprint days...
[PACE]   Day 1: ~$0.45 — Simple scaffold with CI pipeline setup.
[PACE]   Day 2: ~$0.80 — Medium complexity CLI skeleton with flag wiring.
[PACE]   Day 3: ~$0.60 — Coverage extraction with go test parsing.
[PACE]   Day 4: ~$0.55 — Baseline file read/write with two code paths.
[PACE]   Day 5: ~$0.50 — Simple delta calculation with test fixtures.
[PACE]   Day 6: ~$0.55 — Pass/warn/fail decision with exit codes.
[PACE]   Day 7: ~$1.10 — End-to-end integration, more files touched.
[PACE]   Day 8: ~$1.20 — init command with file write and git log.
[PACE]   Day 9: ~$0.70 — Idempotency logic with --force flag.
…
[PACE]   Day 14: $0.00 (human gate)
…
[PACE] Day 0: Total estimated sprint cost: $18.50
[PACE] Day 0 planning cost: $0.0234
[PACE] === Day 0 complete — Sprint plan ready, Day 1 begins next run ===
```

## Tuning expectations

Day 0 estimates are directional, not exact. Treat them as order-of-magnitude signals:

| Estimate range | What to expect |
|----------------|----------------|
| < $0.50 | Simple story — FORGE finishes in < 15 iterations |
| $0.50 – $1.20 | Medium story — well within the 35-iteration budget |
| $1.20 – $1.50 | Rich story — consider reducing AC count |
| > $1.50 | Complex story — PRIME refinement will trigger (if `max_story_cost_usd` is set) |

Because Day 0 only sees the plan target (not a full story card), the estimates are less precise than the in-cycle SCOPE check. The in-cycle SCOPE check (run after PRIME generates an actual story card) is the authoritative pre-FORGE estimate.

See [Proactive Story Scoping](/guides/story-scoping/) for how the in-cycle SCOPE check and PRIME refinement work.

## Running Day 0 mid-sprint

You can run Day 0 at any point during a sprint — it only writes `.pace/day-0/planner.md` and refreshes `PROGRESS.md`. It does not interfere with completed days or their artifacts. Running it mid-sprint will backfill the estimate column for remaining days and update the cost summary to show partial actual spend against the full-sprint estimate.
