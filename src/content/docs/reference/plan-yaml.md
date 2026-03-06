---
title: plan.yaml Fields
description: Complete field reference for the sprint plan file that PRIME reads to generate daily Story Cards.
sidebar:
  order: 2
---

`plan.yaml` lives at `.pace/plan.yaml` in your repository root. PRIME reads it every day to generate the Story Card for that day's agents.

## Top-level structure

```yaml
sprint:
  goal: string
  duration_days: int

days:
  - day: int
    theme: string
    notes: string       # optional
    human_gate: bool    # optional
    stories:
      - title: string
        acceptance_criteria:
          - string
        out_of_scope:   # optional
          - string
        notes: string   # optional
```

---

## `sprint`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `goal` | string | Yes | One sentence describing the sprint outcome. Injected into PRIME's prompt for every day. |
| `duration_days` | integer | Yes | Total sprint days. Should match `sprint.duration_days` in `pace.config.yaml`. |

---

## `days[]`

Each entry in `days` defines one sprint day.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `day` | integer | Yes | Day number, 1-indexed. Must be unique. |
| `theme` | string | Yes | One-line description of today's focus. Injected into the Story Card title. |
| `notes` | string | No | Free-text context for PRIME — architectural decisions, constraints, or reminders. Not shown directly to FORGE; PRIME incorporates it into the Story Card. |
| `human_gate` | boolean | No | If `true`, PACE pauses after all agents complete and waits for human review before advancing. Default: `false`. |
| `stories` | list | Yes | One or more user stories for today. See below. |

---

## `days[].stories[]`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Short imperative title (e.g. "Add login endpoint"). Becomes the story title in the Story Card. |
| `acceptance_criteria` | list[string] | Yes | Testable, concrete conditions that must be true for the story to be SHIP. Each criterion is evaluated independently by GATE. |
| `out_of_scope` | list[string] | No | Items explicitly deferred. GATE can issue a PARTIAL verdict (instead of FAIL) for criteria that map to an out_of_scope item. |
| `notes` | string | No | Per-story context for PRIME. |

---

## Writing effective acceptance criteria

Each criterion should be:

- **Testable** — GATE verifies it from test output, CI results, or code inspection.
- **Specific** — name the function, endpoint, HTTP status, or assertion.
- **Atomic** — one condition per line.
- **Verb-first** — start with an action: "Returns", "Stores", "Validates", "Tests", "Exits".

### Examples

```yaml
acceptance_criteria:
  - "POST /auth/login returns 200 + signed JWT for valid credentials"
  - "POST /auth/login returns 401 for incorrect password"
  - "JWT payload includes user_id and exp (24h)"
  - "pytest exits 0 with at least 3 tests in test_auth.py"
  - "CI workflow passes on the commit from today's handoff"
```

---

## `out_of_scope` mapping

When GATE cannot verify a criterion, it checks whether the criterion maps to an `out_of_scope` item. If it does, GATE issues `PARTIAL` instead of `FAIL`.

```yaml
stories:
  - title: "Login endpoint"
    acceptance_criteria:
      - "POST /auth/login returns 200 + JWT"
      - "CI workflow passes"
    out_of_scope:
      - "CI workflow — pipeline not yet configured in this sprint"
```

If CI is not set up yet, GATE can PARTIAL the CI criterion and still issue a SHIP decision for the story. Without the `out_of_scope` entry, GATE would FAIL and HOLD the day.

---

## Full example

```yaml
sprint:
  goal: "Ship JWT-based authentication for the Acme API"
  duration_days: 10

days:
  - day: 1
    theme: "User model and password hashing"
    stories:
      - title: "Secure user creation"
        acceptance_criteria:
          - "User.create() stores bcrypt-hashed password, not plaintext"
          - "User.verify_password() returns True for correct, False for incorrect"
          - "Unit tests cover both cases, pytest exits 0"
        out_of_scope:
          - "OAuth / social login"
          - "Email verification"

  - day: 2
    theme: "Login endpoint"
    notes: >
      Use python-jose for JWT. RS256 signing with JWT_PRIVATE_KEY env var.
      Token payload: {user_id, exp: now + 24h}.
    stories:
      - title: "POST /auth/login"
        acceptance_criteria:
          - "Returns 200 + {access_token, token_type} for valid credentials"
          - "Returns 401 for invalid password"
          - "Token exp is ~24 hours from issue time (verified in test)"

  - day: 3
    theme: "Advisory clearance + protected routes"
    notes: "SENTINEL and CONDUIT will receive the advisory backlog from Days 1-2."
    stories:
      - title: "Clear advisory backlog"
        acceptance_criteria:
          - "All SENTINEL and CONDUIT advisories from Days 1-2 are resolved"
      - title: "JWT middleware"
        acceptance_criteria:
          - "Protected routes return 401 for missing token"
          - "Protected routes return 401 for malformed token"
          - "Protected routes return 401 for expired token"
          - "Protected routes return 200 for valid token"

  - day: 4
    theme: "Refresh token rotation"
    stories:
      - title: "POST /auth/refresh"
        acceptance_criteria:
          - "Issues new access token from valid refresh token"
          - "Rotates refresh token (old token is invalidated)"
          - "Returns 401 for expired or revoked refresh token"

  - day: 5
    theme: "Final review and sprint close"
    human_gate: true
    stories:
      - title: "Sprint acceptance"
        acceptance_criteria:
          - "All advisory backlog items resolved or escalated"
          - "CI pipeline green on final commit"
          - "README documents all new authentication endpoints"
        out_of_scope:
          - "Load testing"
          - "Multi-factor authentication"
```
