---
title: Enforce Test Coverage
description: How PACE's mandatory COVERAGE RULE prevents FORGE from shipping untested code, and how escalation issues surface the exact hold reason when coverage drops.
sidebar:
  order: 8
---

PACE enforces a **mandatory COVERAGE RULE** baked into FORGE's system prompt. It applies to every story, every sprint day — regardless of language, CI system, or test framework.

## The COVERAGE RULE

FORGE's prompt contains the following constraint, injected before every implementation attempt:

```
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
|----------|---------|
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

```
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

The COVERAGE RULE prevents FORGE from shipping files with *no* tests, but it does not prevent cumulative drift where coverage percentage gradually drops as production code grows faster than tests.

To guard against this, integrate a coverage ratchet into your CI pipeline:

1. **Set a `fail_threshold`** in your coverage tool configuration (e.g. `nolapse.yaml`, `.coveragerc`, `jest.config.js`) so the CI step exits non-zero if coverage falls below the baseline.
2. **Make the coverage step a required CI check** so GATE's `test_command` (or the CI pipeline itself) fails when the threshold is breached.
3. **Raise the baseline as coverage improves** — only move the threshold up, never down. This makes it a one-way ratchet.

If you run `nolapse` as your CI coverage tool, `nolapse baseline update` handles the ratchet automatically. See the [nolapse documentation](https://github.com/nolapse-dev/nolapse) for setup details.
