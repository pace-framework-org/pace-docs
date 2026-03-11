---
title: Enforce Test Coverage
description: How PACE's TDD enforcement and COVERAGE RULE prevent FORGE from shipping untested code, and how to tune FORGE's iteration limit empirically.
sidebar:
  order: 8
---

PACE ships with two complementary FORGE behaviour flags that together prevent untested code from reaching CI. Both are enabled by default and configurable per project in `pace.config.yaml`.

```yaml
forge:
  tdd_enforcement: true  # mandatory 4-phase TDD with confirm_red_phase gate
  coverage_rule: true    # COVERAGE RULE injected into every FORGE prompt
```

## The COVERAGE RULE

FORGE's prompt contains the following constraint, injected before every implementation attempt:

```text
COVERAGE RULE — mandatory for every story:
- Every production code file you create or modify must have corresponding tests.
- Do not add a function, type, or module without a test case that exercises it.
- Do not reduce the number of existing test cases — only add or extend them.
- After Phase 2 (GREEN), run the full test suite and confirm it exits 0. If the
  story card includes a CI-verified acceptance criterion, your implementation is
  incomplete until that criterion passes locally.
- When in doubt, write the test first (TDD Red phase), then implement to make it pass.
  This is not optional — untested production code will cause CI to fail and GATE to HOLD.
```

This rule is non-negotiable — FORGE will not mark a story complete without exercising it.

## What this means in practice

| Scenario | Outcome |
| -------- | ------- |
| FORGE adds a new function | A test for that function must be in the same story |
| FORGE modifies an existing module | Existing tests for that module must still pass |
| FORGE defers tests without an `out_of_scope` justification | GATE issues a **HOLD** |
| Test suite exits non-zero after implementation | GATE issues a **HOLD** |

### Red → Green → Refactor

FORGE follows TDD by default:

1. **Red** — write a failing test that captures the acceptance criterion
2. **Green** — implement the minimum code to make the test pass
3. **Refactor** — clean up without breaking the test

This is the same flow described in FORGE's Handoff Note. If the Handoff records deferred tests, GATE inspects whether each deferral maps to a story `out_of_scope` item. A deferral without justification is a HOLD.

## How GATE enforces it

GATE runs the `test_command` configured in `pace.config.yaml`:

```yaml
tech:
  test_command: "pytest -v --tb=short"
```

If the command exits non-zero, GATE issues a **HOLD** with a `hold_reason` explaining which acceptance criterion failed. Since PACE v1.1.0, this `hold_reason` is now propagated directly into:

- The PACE orchestrator log
- The **escalation issue** opened on your platform (GitHub Issue, GitLab Issue, Jira ticket, Bitbucket Issue, or local file)

This means a blocked pipeline always tells you _why_ it's blocked, not just _that_ it is.

### Example escalation issue

When GATE HOLDs because tests fail, the platform issue will include something like:

```text
🔴 HOLD — Day 12

Hold reason: GATE: AC #6 failed — test suite exited 1 (coverage dropped from 42% to 35%)

## GATE report
...
```

Previously, escalation issues could be created with an empty blocker. This is now fixed — the hold reason cascades from `gate.md` → `sentinel.md` → `conduit.md` → a fallback message if all three are empty.

## Deferred tests

If a story's complexity genuinely makes it impractical to write all tests within a single sprint day, FORGE can defer. To avoid a HOLD, the Handoff Note must record the deferral, and the story card must include a matching `out_of_scope` entry:

```yaml
# plan.yaml
- day: 5
  theme: "Add rate limiter"
  out_of_scope:
    - "Integration tests for rate limiter — deferred to Day 6"
```

GATE will accept this as a PARTIAL rather than a FAIL. Day 6 must then include the deferred tests as an explicit acceptance criterion.

## Strengthening coverage with a ratchet (optional)

The COVERAGE RULE prevents FORGE from shipping files with _no_ tests, but it does not prevent cumulative drift where coverage percentage gradually drops as production code grows faster than tests.

To guard against this, integrate a coverage ratchet into your CI pipeline:

1. **Set a `fail_threshold`** in your coverage tool configuration (e.g. `nolapse.yaml`, `.coveragerc`, `jest.config.js`) so the CI step exits non-zero if coverage falls below the baseline.
2. **Make the coverage step a required CI check** so GATE's `test_command` (or the CI pipeline itself) fails when the threshold is breached.
3. **Raise the baseline as coverage improves** — only move the threshold up, never down. This makes it a one-way ratchet.

If you run `nolapse` as your CI coverage tool, `nolapse baseline update` handles the ratchet automatically. See the [nolapse documentation](https://github.com/nolapse-dev/nolapse) for setup details.

## Disabling TDD enforcement for specific story types

Some sprint days produce no testable code — infrastructure config, database migrations, documentation rewrites. Running TDD enforcement on those stories wastes iterations and creates artificial failures.

Set `tdd_enforcement: false` in `pace.config.yaml` before those days, then restore it afterwards:

```yaml
forge:
  tdd_enforcement: false  # off for this infra day
  coverage_rule: false    # no prompt either — nothing to cover
  max_iterations: 20      # fewer iterations needed without TDD phases
```

When `tdd_enforcement` is `false`:

- The `confirm_red_phase` tool is removed from FORGE's tool list entirely
- FORGE uses a streamlined workflow (read → implement → commit → handoff)
- `complete_handoff` is never blocked by a missing red-phase gate
- `coverage_rule` is automatically ignored even if left as `true`

:::caution
Do not disable `tdd_enforcement` for stories that touch production code. The COVERAGE RULE exists precisely to catch the "I'll add tests later" pattern that silently degrades code quality over a sprint.
:::

## Tuning max_iterations

`max_iterations` (default `35`) is a hard ceiling on FORGE's agentic tool-use loop. If FORGE does not call `complete_handoff` within the limit the run raises a `RuntimeError` and the pipeline fails.

### Why it fails

Every call to `adapter.chat()` costs one iteration. With TDD enforcement on, the minimum budget for a simple story is:

| Phase | Iterations |
| ----- | ---------- |
| Read existing files | 1–3 |
| Write test files | 1–2 |
| Run suite (RED confirm) | 1 |
| `confirm_red_phase` call | 1 |
| Write implementation | 1–3 |
| Run suite (GREEN confirm) | 1 |
| Refactor + final run | 1–2 |
| `git_commit` + `git rev-parse` | 2 |
| `complete_handoff` | 1 |

Baseline: **12–18 iterations**. Each failed test cycle that requires a fix adds 2–4 more. A story that hits 35 and fails is almost always too large, not too iteration-starved — reduce `cost_control.max_story_ac` first.

### Reading the data

Since v1.3.0, every `handoff.yaml` includes an `iterations_used` field written by the framework:

```yaml
# .pace/day-7/handoff.yaml
day: 7
agent: FORGE
commit: "a3f9c12"
iterations_used: 22
...
```

After a few sprint days, run this script from your repo root to compute the p95 and a recommended ceiling:

```python
import math, yaml
from pathlib import Path

counts = []
for f in sorted(Path(".pace").glob("day-*/handoff.yaml")):
    data = yaml.safe_load(f.read_text())
    if n := data.get("iterations_used"):
        counts.append(n)

if not counts:
    print("No handoff data yet.")
else:
    counts.sort()
    p95_idx = math.ceil(0.95 * len(counts)) - 1
    p95 = counts[p95_idx]
    recommended = math.ceil(p95 * 1.3)
    print(f"Days sampled : {len(counts)}")
    print(f"Min / Median : {counts[0]} / {counts[len(counts)//2]}")
    print(f"p95          : {p95}")
    print(f"Recommended  : ceil({p95} × 1.3) = {recommended}")
```

### The formula

```text
max_iterations = ceil(p95_observed × 1.3)
```

The **1.3× multiplier** gives ~30% headroom above your 95th-percentile story. This covers:

- Stories slightly more complex than usual
- A single unexpected test failure + fix cycle (≈ 3 extra iterations)
- `git_commit` retries on push failures

**Starting points before you have data:**

| Scenario | Recommended value |
| -------- | ----------------- |
| TDD on, `max_story_ac ≤ 5` | `35` (default) |
| TDD on, `max_story_ac ≤ 3` | `25` |
| TDD off (docs / infra) | `20` |
| Complex multi-file stories | `50` |

Revisit after every 10 sprint days. If your observed p95 is consistently below 20 at the default `35`, lower the ceiling to reduce worst-case cost exposure.
