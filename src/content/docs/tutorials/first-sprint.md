---
title: Your First Sprint
description: End-to-end walkthrough of a 5-day PACE sprint, from plan to shipped feature.
sidebar:
  order: 2
---

This tutorial walks through a complete 5-day PACE sprint. We will add a user authentication feature to a Python FastAPI service, examining the output of each agent along the way.

## The scenario

- **Repository**: a FastAPI app with `pytest` tests
- **Platform**: `local` (no GitHub token needed)
- **LLM**: `anthropic / claude-sonnet-4-6`
- **Goal**: implement JWT-based authentication in 5 days

## Day 1 — Core auth models

Run the orchestrator:

```bash
python pace/orchestrator.py --day 1
```

### PRIME output

PRIME reads `plan.yaml` and generates a Story Card:

```yaml
day: 1
theme: Core auth models and JWT token generation
stories:
  - title: User model with hashed passwords
    acceptance_criteria:
      - User.create() stores bcrypt-hashed password
      - User.verify_password() returns True for correct password
      - All criteria covered by unit tests
    out_of_scope:
      - OAuth / social login
```

The Story Card is saved to `.pace/day-1/story-card.yaml`.

### FORGE output

FORGE receives the Story Card and enters its tool-calling loop. It reads existing source files, writes new ones, and calls `complete_handoff` when done:

```
[FORGE] Reading src/models/__init__.py ...
[FORGE] Writing src/models/user.py ...
[FORGE] Writing tests/test_user_model.py ...
[FORGE] Running tests: pytest tests/test_user_model.py -v ...
[FORGE] All tests pass. Calling complete_handoff.
```

The Handoff Note (`.pace/day-1/handoff.yaml`) records every file touched and the commit SHA.

### GATE output

GATE runs the full test suite and evaluates each criterion:

```yaml
day: 1
agent: GATE
criteria_results:
  - criterion: "User.create() stores bcrypt-hashed password"
    result: PASS
    evidence: "tests/test_user_model.py::test_create_hashes_password PASSED"
  - criterion: "User.verify_password() returns True for correct password"
    result: PASS
    evidence: "tests/test_user_model.py::test_verify_password_correct PASSED"
  - criterion: "All criteria covered by unit tests"
    result: PASS
    evidence: "pytest exit code 0, 4 tests collected, 4 passed"
gate_decision: SHIP
hold_reason: ""
```

### SENTINEL output

SENTINEL scans for security issues:

```yaml
day: 1
agent: SENTINEL
findings:
  - check: Hardcoded secrets in source files
    result: PASS
    evidence: "Secret pattern scan returned no results"
  - check: Password hashing algorithm strength
    result: ADVISORY
    evidence: "bcrypt rounds default (12) — consider documenting minimum in security.md"
sentinel_decision: ADVISORY
```

The advisory is stored in the backlog for a future clearance day.

### CONDUIT output

CONDUIT reviews CI configuration. On Day 1 with a local platform, this produces minimal findings since no CI workflows exist yet.

### SCRIBE output

SCRIBE updates `.pace/context/engineering.md` to record the new `src/models/user.py` module.

---

## Day 2 — Login endpoint

```bash
python pace/orchestrator.py --day 2
```

FORGE now has context about Day 1 via SCRIBE's engineering document. It implements the login endpoint, referencing the User model written yesterday.

### GATE HOLD scenario

Suppose FORGE's JWT implementation has a bug — the token expiry is hardcoded to 0:

```yaml
gate_decision: HOLD
hold_reason: >
  POST /auth/login returns tokens that expire immediately (exp=0).
  FORGE must fix jwt_utils.py:create_token() to use timedelta(hours=24).
```

When GATE issues HOLD, the orchestrator **does not advance**. You can re-run Day 2 after FORGE fixes the issue:

```bash
python pace/orchestrator.py --day 2 --retry
```

---

## Day 3 — Protected routes + advisory clearance

Day 3 is a **clearance day** in this sprint. The orchestrator passes the advisory backlog to SENTINEL and CONDUIT, which must explicitly evaluate and resolve each open item.

```bash
python pace/orchestrator.py --day 3
```

SENTINEL now receives:

```yaml
Open Advisory Backlog (Day 3 is a clearance day — all items below must be resolved):
- day: 1
  agent: SENTINEL
  finding: "bcrypt rounds default (12) — consider documenting minimum in security.md"
```

SENTINEL evaluates it and either:
- **Closes it** (PASS): "security.md now documents bcrypt rounds >= 12 as the minimum"
- **Escalates to FAIL**: if the issue wasn't addressed and now poses real risk

---

## Day 4 — Refresh tokens

```bash
python pace/orchestrator.py --day 4
```

A standard implementation day. FORGE builds refresh token logic, GATE validates, SENTINEL checks the new `/auth/refresh` endpoint for authorization boundary correctness.

---

## Day 5 — Final review

```bash
python pace/orchestrator.py --day 5
```

Day 5 is the final day. The orchestrator:
1. Runs all six agents
2. Generates a full sprint summary
3. Opens a Pull Request (if platform is `github`, `gitlab`, or `bitbucket`)
4. Creates an escalation issue for any unresolved advisories
5. Posts a job summary to CI

### Sprint summary

The Sprint Summary (`.pace/sprint-summary.md`) contains:
- All daily decisions (SHIP/HOLD/ADVISORY) per agent
- Unresolved advisories that were escalated
- Files changed across all days

---

## Key takeaways

| Day | Lesson |
|-----|--------|
| 1 | PRIME transforms your plan into a concrete Story Card each morning |
| 2 | GATE's HOLD decision is a hard block — the day doesn't ship broken code |
| 3 | Clearance days force resolution of accumulated advisories |
| 4 | SCRIBE's context documents let FORGE build on previous days accurately |
| 5 | Platform integration (PR, issue, summary) is automatic |

## Next steps

- [Configure Your Project](/guides/configure-your-project/) — fine-tune PACE for your stack
- [Set Human Gate Days](/guides/set-human-gate-days/) — add human review checkpoints
- [Advisory Backlog](/concepts/advisory-backlog/) — understand how findings accumulate and clear
