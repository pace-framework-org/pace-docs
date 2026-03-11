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
  Otherwise       → single Sonnet call (≈ $0.01–0.03)
                    returns predicted_iterations + predicted_cost_usd
        ↓
Writes .pace/day-0/planner.md (per-day breakdown + total estimate)
        ↓
Writes PROGRESS.md with cost columns pre-filled
```

**Since v1.2.0**, estimation uses `claude-sonnet-4-6` (the same model as FORGE) so price predictions are calibrated to the actual execution model. The entire planning run costs roughly **$0.01–0.03 × N sprint days** — about $0.30–$0.90 for a 30-day sprint.

## PROGRESS.md after Day 0

Once Day 0 completes, `PROGRESS.md` gains two new columns in the Day Log:

| Day | Story | Decision | Est. Cost | Actual Cost (pipeline) | Notes |
| --- | --- | --- | --- | --- | --- |
| 0 | Sprint planning | 📋 PLAN | — | $0.0523 | Cost estimation |
| 1 | Repo scaffold | ⏳ PENDING | $1.10 | — | |
| 2 | nolapse run skeleton | ⏳ PENDING | $2.00 | — | |
| … | … | … | … | … | |

After each day ships, the **Actual Cost (pipeline)** column is filled in from `cycle.md` — the total cost of all agents: PRIME + FORGE + GATE + SENTINEL + CONDUIT. After the final day, a **Cost Summary** section is added:

```
## Cost Summary

| Metric | Value |
| --- | --- |
| Total estimated (Days 1–30) | $45.00 |
| Total actual (full pipeline) | $52.14 |
| Total actual (FORGE only)    | $38.20 |
| Variance                     | +$7.14 (+16%) |
| Day 0 planning cost          | $0.0523 |
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
generated_at: "2026-03-11T10:00:00Z"
estimation_model: claude-sonnet-4-6
total_estimated_usd: 45.00
planning_cost_usd: 0.0523
replan: false
estimates:
  - day: 1
    target: "Repo scaffold — nolapse-cli Go module initialized..."
    predicted_iterations: 8
    predicted_cost_usd: 1.10
    reasoning: "Simple scaffold with 2-3 files and a CI pass."
  - day: 2
    target: "nolapse run command skeleton..."
    predicted_iterations: 12
    predicted_cost_usd: 2.00
    reasoning: "Medium complexity CLI skeleton with cobra and flag wiring."
  …
```

This file is committed to the repository. The reporter reads it on every subsequent `update_progress_md()` call to render the cost columns.

## Example log output

```text
[PACE] === Day 0 — Sprint Planning & Cost Estimation ===
[PACE] Day 0: Estimating cost for 30 sprint days using claude-sonnet-4-6...
[PACE]   Day 1: ~$1.10 — Simple scaffold with CI pipeline setup.
[PACE]   Day 2: ~$2.00 — Medium complexity CLI skeleton with flag wiring.
[PACE]   Day 3: ~$1.50 — Coverage extraction with go test parsing.
[PACE]   Day 4: ~$1.30 — Baseline file read/write with two code paths.
[PACE]   Day 5: ~$1.20 — Simple delta calculation with test fixtures.
[PACE]   Day 6: ~$1.40 — Pass/warn/fail decision with exit codes.
[PACE]   Day 7: ~$2.50 — End-to-end integration, more files touched.
[PACE]   Day 8: ~$2.80 — init command with file write and git log.
[PACE]   Day 9: ~$1.70 — Idempotency logic with --force flag.
…
[PACE]   Day 14: $0.00 (human gate)
…
[PACE] Day 0: Total estimated sprint cost: $45.00
[PACE] Day 0 planning cost: $0.0523
[PACE] === Day 0 complete — Sprint plan ready, Day 1 begins next run ===
```

## Tuning expectations

Day 0 estimates are directional, not exact. Treat them as order-of-magnitude signals:

| Estimate range | What to expect |
|----------------|----------------|
| < $1.20 | Simple story — FORGE finishes in < 15 iterations |
| $1.20 – $2.50 | Medium story — well within the 35-iteration budget |
| $2.50 – $3.50 | Rich story — consider reducing AC count |
| > $3.50 | Complex story — PRIME refinement will trigger (if `max_story_cost_usd` is set) |

Because Day 0 only sees the plan target (not a full story card), the estimates are less precise than the in-cycle SCOPE check. The in-cycle SCOPE check (run after PRIME generates an actual story card) is the authoritative pre-FORGE estimate.

See [Proactive Story Scoping](/guides/story-scoping/) for how the in-cycle SCOPE check and PRIME refinement work.

## Re-planning mid-sprint (v1.2.0+)

You can re-run Day 0 at any point during a sprint with `PACE_REPLAN=true` to refresh estimates for remaining days while preserving actuals for completed days:

```bash
# Locally
PACE_DAY=0 PACE_REPLAN=true ANTHROPIC_API_KEY=... python pace/orchestrator.py
```

In GitHub Actions, set both `PACE_DAY=0` and `PACE_REPLAN=true` as variables (or pass as inputs), then trigger manually.

**What re-planning does:**

- Reads `cycle.md` (or `handoff.md`) for completed days to extract actual costs
- Preserves existing estimates for those days (no new API call)
- Re-estimates only remaining days using Sonnet with a fresh call
- Updates `planner.md` and `PROGRESS.md` with the new estimates + actuals side-by-side

**When to re-plan:**

- Scope changed significantly mid-sprint (new requirements, deferred stories)
- Several days came in well above or below estimate and you want recalibration
- After a pause/resume to refresh the remaining budget forecast

The `replan: true` field in `planner.md` marks the report as a re-plan so tools can distinguish it from the original Day 0 run.
