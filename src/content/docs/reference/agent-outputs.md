---
title: Agent Output Schemas
description: YAML schema reference for every artifact produced by PACE agents.
sidebar:
  order: 3
---

Every PACE agent produces a structured YAML artifact validated against a JSON Schema. These artifacts are stored in `.pace/day-N/` and passed as inputs to downstream agents.

---

## Story Card (PRIME)

File: `.pace/day-N/story-card.yaml`

```yaml
day: 1
agent: PRIME
theme: "User model and password hashing"
stories:
  - title: "Secure user creation"
    acceptance_criteria:
      - "User.create() stores bcrypt-hashed password"
      - "User.verify_password() returns True for correct password"
    out_of_scope:
      - "OAuth / social login"
```

| Field | Type | Description |
|-------|------|-------------|
| `day` | integer | Day number |
| `agent` | string | Always `"PRIME"` |
| `theme` | string | Day theme from plan.yaml |
| `stories` | list | One or more story objects |
| `stories[].title` | string | Story title |
| `stories[].acceptance_criteria` | list[string] | Testable conditions |
| `stories[].out_of_scope` | list[string] | Explicitly deferred items |

---

## Handoff Note (FORGE)

File: `.pace/day-N/handoff.yaml`

```yaml
day: 1
agent: FORGE
summary: "Implemented User model with bcrypt password hashing."
files_written:
  - src/models/user.py
  - tests/test_user_model.py
commit_sha: "abc123def456"
deferred: []
```

| Field | Type | Description |
|-------|------|-------------|
| `day` | integer | Day number |
| `agent` | string | Always `"FORGE"` |
| `summary` | string | Narrative description of what was built |
| `files_written` | list[string] | Files created or modified (relative to repo root) |
| `commit_sha` | string \| null | Git commit SHA of the changes |
| `deferred` | list[string] | Items explicitly deferred (not FAIL, just not done today) |

---

## Gate Report (GATE)

File: `.pace/day-N/gate-report.yaml`

```yaml
day: 1
agent: GATE
criteria_results:
  - criterion: "User.create() stores bcrypt-hashed password"
    result: PASS
    evidence: "tests/test_user_model.py::test_create_hashes_password PASSED"
  - criterion: "CI pipeline green"
    result: PARTIAL
    evidence: "CI not yet configured — mapped to out_of_scope"
blockers: []
deferred:
  - "CI pipeline — not yet configured in this sprint"
gate_decision: SHIP
hold_reason: ""
```

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `day` | integer | — | Day number |
| `agent` | string | `"GATE"` | — |
| `criteria_results` | list | — | One entry per acceptance criterion |
| `criteria_results[].criterion` | string | — | Exact criterion text |
| `criteria_results[].result` | string | `PASS`, `PARTIAL`, `FAIL` | Verdict for this criterion |
| `criteria_results[].evidence` | string | — | Test name, log line, CI URL, or code reference |
| `blockers` | list[string] | — | Human-readable description of each FAIL |
| `deferred` | list[string] | — | PARTIAL items mapped to out_of_scope |
| `gate_decision` | string | `SHIP`, `HOLD` | Day decision |
| `hold_reason` | string | — | Actionable instruction for FORGE when HOLD |

---

## Sentinel Report (SENTINEL)

File: `.pace/day-N/sentinel-report.yaml`

```yaml
day: 1
agent: SENTINEL
findings:
  - check: "Hardcoded secrets in source files"
    result: PASS
    evidence: "Secret pattern scan returned no results"
  - check: "HTTP timeout on external API calls"
    result: ADVISORY
    evidence: "src/clients/payment.py:42 — requests.get() with no timeout parameter"
advisories:
  - "No timeout on requests.get() in payment.py:42 — add timeout=30"
blockers: []
sentinel_decision: ADVISORY
hold_reason: ""
```

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `day` | integer | — | Day number |
| `agent` | string | `"SENTINEL"` | — |
| `findings` | list | — | One entry per security/SRE check |
| `findings[].check` | string | — | What was checked |
| `findings[].result` | string | `PASS`, `ADVISORY`, `FAIL` | Check verdict |
| `findings[].evidence` | string | — | File path, line number, or test name |
| `advisories` | list[string] | — | Non-blocking findings (one per ADVISORY result) |
| `blockers` | list[string] | — | Exploitable vulnerabilities (one per FAIL result) |
| `sentinel_decision` | string | `SHIP`, `HOLD`, `ADVISORY` | Day decision |
| `hold_reason` | string | — | Actionable instruction for FORGE when HOLD |

---

## Conduit Report (CONDUIT)

File: `.pace/day-N/conduit-report.yaml`

```yaml
day: 1
agent: CONDUIT
findings:
  - check: "Action version pinning"
    result: ADVISORY
    evidence: ".github/workflows/ci.yml uses actions/checkout@master"
  - check: "Test gate in CI"
    result: PASS
    evidence: "ci.yml job 'test' runs pytest before any deploy step"
advisories:
  - "actions/checkout@master in ci.yml — pin to @v4"
blockers: []
conduit_decision: ADVISORY
hold_reason: ""
```

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `day` | integer | — | Day number |
| `agent` | string | `"CONDUIT"` | — |
| `findings` | list | — | One entry per DevOps check |
| `findings[].check` | string | — | What was checked |
| `findings[].result` | string | `PASS`, `ADVISORY`, `FAIL` | Check verdict |
| `findings[].evidence` | string | — | Workflow file name, step name, Makefile target |
| `advisories` | list[string] | — | Non-blocking findings |
| `blockers` | list[string] | — | Broken CI or leaked secrets (FAIL) |
| `conduit_decision` | string | `SHIP`, `HOLD`, `ADVISORY` | Day decision |
| `hold_reason` | string | — | Actionable instruction for FORGE when HOLD |

---

## Decision semantics

| Decision | Meaning | Day advances? |
|----------|---------|--------------|
| `SHIP` | No failures or advisories | Yes |
| `ADVISORY` | No failures, but concerns worth tracking | Yes (advisory stored) |
| `HOLD` | At least one blocking failure | No (FORGE must fix) |

For GATE specifically, `PARTIAL` in `criteria_results` means a criterion was not fully met but maps to an `out_of_scope` item — GATE can still issue `SHIP` or `ADVISORY` if all non-deferred criteria pass.
