---
title: Advisory Backlog
description: How non-blocking findings accumulate across sprint days and get force-cleared on review days.
sidebar:
  order: 2
---

The advisory backlog is PACE's mechanism for tracking non-blocking concerns without letting them silently pile up. Every ADVISORY finding from SENTINEL or CONDUIT is stored and eventually force-resolved on a designated clearance day.

## What is an advisory?

An advisory is a finding that:
- **Does not block today's deployment** — the code can ship with this concern unresolved
- **Increases operational risk** if left unaddressed indefinitely
- **Has a specific, evidenced location** — not a generic recommendation

SENTINEL examples:
- bcrypt rounds not documented in `security.md`
- No timeout on an HTTP call in `src/clients/external_api.py`
- No test for malformed input on a new endpoint

CONDUIT examples:
- `actions/checkout@master` used instead of a pinned version
- New environment variable `REDIS_URL` not documented in README
- `make test-integration` target referenced in CI but not in Makefile

## Advisory lifecycle

```
Day 1: SENTINEL finds "no timeout on HTTP call"
       → sentinel_decision: ADVISORY
       → added to advisory backlog

Day 2: advisory backlog passed to SENTINEL as context
       → SENTINEL notes the open item
       → Day 2 story doesn't address it → remains in backlog

Day 3: clearance day
       → SENTINEL receives full backlog
       → evaluates "no timeout on HTTP call":
         - If fixed: result: PASS, removed from backlog
         - If not fixed: result: FAIL (now a blocker)
```

## Advisory format in YAML reports

When an agent produces an ADVISORY finding, the report looks like:

```yaml
findings:
  - check: "HTTP call timeout"
    result: ADVISORY
    evidence: "src/clients/payment.py:42 — requests.get() with no timeout parameter"
advisories:
  - "No timeout on requests.get() in payment.py:42 — add timeout=30 to prevent hung threads"
sentinel_decision: ADVISORY
```

The `advisories` list contains human-readable descriptions. These are stored verbatim in the backlog.

## Backlog storage

The orchestrator maintains the backlog in `.pace/advisory-backlog.yaml`:

```yaml
- day: 1
  agent: SENTINEL
  finding: "No timeout on requests.get() in payment.py:42 — add timeout=30 to prevent hung threads"
- day: 1
  agent: CONDUIT
  finding: "actions/checkout@master in .github/workflows/ci.yml — pin to tagged version"
- day: 2
  agent: SENTINEL
  finding: "No test for malformed JWT in tests/test_auth.py — add edge case for expired token"
```

Each entry records the day and agent that raised the finding so clearance agents can trace the history.

## Clearance days

A clearance day is any day marked in your `plan.yaml` as a designated review point. On these days, the orchestrator passes the full advisory backlog to SENTINEL and CONDUIT, and each agent must explicitly evaluate every item.

```yaml
# In plan.yaml
- day: 5
  theme: "Mid-sprint advisory clearance"
  notes: "SENTINEL and CONDUIT will receive and must resolve the full advisory backlog."
```

The orchestrator then passes `advisory_backlog` to both agents:

```python
sentinel_report = run_sentinel(
    day=5,
    story_card=story_card,
    handoff=handoff,
    gate_report=gate_report,
    advisory_backlog=backlog,          # ← force-clear day
)
```

### How agents evaluate backlog items

Each backlog item becomes an explicit `check` in the agent's findings. The agent must respond with:

```yaml
findings:
  # ... normal findings ...
  - check: "Backlog Day 1: No timeout on requests.get() in payment.py:42"
    result: PASS
    evidence: "payment.py:42 now has timeout=30 — added in Day 3 handoff"
  - check: "Backlog Day 1: actions/checkout@master in ci.yml"
    result: FAIL
    evidence: "ci.yml still uses @master as of Day 5 commit abc123"
```

- **PASS** → item is removed from the backlog
- **FAIL** → item is escalated to a blocker; clearance day gets a HOLD
- **ADVISORY again** → rare and requires explicit justification; remains in backlog

A clearance day with any FAIL from an unresolved advisory is treated as a HOLD — FORGE must fix the issues before the day can advance.

## Escalation to issues

At the end of a sprint (or when a HOLD cannot be resolved within the day), unresolved advisories are escalated to a platform issue:

```
Platform issue title: "PACE Sprint Advisory Escalations — Day 5"
Body: lists each unresolved advisory with its source day, agent, and evidence
```

This ensures advisories don't silently disappear at sprint end.

## Designing your clearance schedule

A common pattern is to schedule clearance days at natural milestones:

```yaml
days:
  - day: 1-4: implementation days (advisories accumulate)
  - day: 5:   first clearance day
  - day: 6-9: more implementation
  - day: 10:  second clearance day + human gate
  ...
  - day: 30:  final clearance + sprint close
```

Clearance days don't need to be every 5 days. A sprint with many security-sensitive stories might clear every 3 days; a simpler sprint might clear once at the midpoint and once at the end.

:::tip
Don't treat advisories as optional. The advisory backlog is the mechanism that ensures quality issues from Day 1 don't get forgotten by Day 30. Plan at least one clearance day for every 5-7 implementation days.
:::
