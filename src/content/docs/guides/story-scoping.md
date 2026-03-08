---
title: Proactive Story Scoping
description: Automatically split oversized stories before FORGE runs to keep per-day costs predictable and HOLD rates low.
sidebar:
  order: 4
---

PACE includes a **proactive story scoping** mechanism that evaluates each story card immediately after PRIME writes it — before FORGE runs. If the story is too wide (too many acceptance criteria or predicted cost too high), PRIME is automatically re-invoked to split it into a manageable today slice and a deferred remainder.

## Why this matters

FORGE is the most expensive agent: it runs a multi-iteration agentic loop using a capable model (Sonnet by default). Stories with 6+ acceptance criteria across multiple files can consume 30–40 iterations, pushing per-run cost above $2–3. Worse, if FORGE runs out of iterations before calling `complete_handoff`, the pipeline HOLDs and the cost is wasted entirely.

Scoping the story before FORGE runs means:

- FORGE reliably finishes in the iteration budget
- Deferred criteria automatically feed into the next day's story
- Cost per day stays predictable

## How it works

```
PRIME writes story card
        ↓
AC count > max_story_ac?
  Yes → PRIME refine (split today / defer remainder)
        ↓
max_story_cost_usd configured?
  Yes → SCOPE check (single Haiku call, ~$0.005)
        predicted_cost > threshold?
          Yes → PRIME refine again
        ↓
FORGE runs on scoped story (≤ max_story_ac AC)
```

Up to **2 refinement rounds** are attempted. If refinement fails, FORGE runs on the original story as a fallback.

## Configuration

### pace-framework-starter

Add a `cost_control` block to `pace/pace.config.yaml`:

```yaml
cost_control:
  # Trigger PRIME refinement if AC count exceeds this. Set to 0 to disable.
  max_story_ac: 5

  # Trigger PRIME refinement if SCOPE predicts FORGE will cost more than this (USD).
  # Set to 0 to disable the cost pre-check.
  max_story_cost_usd: 1.50
```

Both fields are optional and default to `5` and `0` (cost check disabled) respectively.

### nolapse-platform (GitHub Variables)

Configure via repository variables in **Settings → Secrets and variables → Actions → Variables**:

| Variable | Default | Description |
|----------|---------|-------------|
| `PACE_MAX_STORY_AC` | `5` | AC count threshold for PRIME refinement |
| `PACE_MAX_STORY_COST_USD` | `1.50` | Predicted cost threshold (USD) for PRIME refinement |

Leave unset to use the defaults.

## What refinement produces

When PRIME refines a story it produces two outputs:

**Refined `story.md`** — committed to `.pace/day-N/story.md`. Contains the highest-value acceptance criteria that fit within `max_story_ac`, with the story/given/when/then rewritten to match the reduced scope.

**`deferred_scope.yaml`** — committed to `.pace/day-N/deferred_scope.yaml`. Lists the criteria that were cut. The next day's PRIME automatically reads this file and incorporates the deferred criteria into the following story, so nothing is lost.

### Example log output

```text
[PACE] Day 8: Invoking PRIME...
[PACE] Story card written.
[PACE] SCOPE: ~32 iterations, ~$2.10 predicted.
[PACE] Day 8: Refining story — SCOPE predicts $2.10 (max $1.50). Story covers 8 acceptance criteria across 4 files.
[PACE] Day 8: 3 criteria deferred to next day.
[PACE] Day 8: Story refined to 5 AC.
[PACE] Day 8: Invoking FORGE (attempt 1/2)...
```

And on Day 9, PRIME's user message will include:

```text
Deferred scope from Day 8 (incorporate these into today's story):
deferred:
  - "Running nolapse init --repo . a second time exits with code 1."
  - "go test ./... exits 0 and all unit and integration tests pass."
  - "go vet ./... exits 0 with no errors or warnings."
```

## Tuning the thresholds

| Threshold | Effect |
|-----------|--------|
| `max_story_ac: 3` | Aggressive — very short stories, many deferred days |
| `max_story_ac: 5` | Recommended — good balance, fits FORGE's 35-iteration budget |
| `max_story_ac: 7` | Permissive — may cause iteration overruns on complex stories |
| `max_story_cost_usd: 0` | Disables cost pre-check entirely (AC check still applies) |
| `max_story_cost_usd: 1.00` | Conservative — triggers refinement for medium stories |
| `max_story_cost_usd: 1.50` | Recommended |
| `max_story_cost_usd: 3.00` | Permissive — only catches very expensive stories |

## FORGE cost in the handoff

After each successful FORGE run, the handoff file (`.pace/day-N/handoff.md`) includes a `forge_cost_usd` field with the actual Sonnet spend for that attempt:

```yaml
forge_cost_usd: 0.8432
```

This gives you per-story cost history over time to inform threshold tuning.
