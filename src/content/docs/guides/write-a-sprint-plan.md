---
title: Write a Sprint Plan
description: How to write a plan.yaml that PRIME can turn into effective daily Story Cards.
sidebar:
  order: 4
---

The sprint plan (`plan.yaml`) is the only input you write for each sprint. PRIME reads it daily and generates a focused Story Card with acceptance criteria, scope boundaries, and context for FORGE. A well-written plan produces better code and fewer HOLD decisions.

## File location

```
your-repo/
└── .pace/
    └── plan.yaml       ← your sprint plan lives here
```

## Minimal structure

```yaml
sprint:
  goal: "Add JWT authentication to the API"
  duration_days: 5

days:
  - day: 1
    theme: "User model and password hashing"
    stories:
      - title: "Secure user creation"
        acceptance_criteria:
          - "User.create() stores bcrypt-hashed password"
          - "User.verify_password() returns True for correct password"
          - "Tests cover both happy path and incorrect password"
        out_of_scope:
          - "OAuth / social login"
          - "Email verification"
```

## Full field reference

```yaml
sprint:
  goal: string          # One sentence describing what ships by day N
  duration_days: int    # Must match sprint.duration_days in pace.config.yaml

days:
  - day: int            # 1-indexed
    theme: string       # One-line description of today's focus area
    notes: string       # Optional free-text context for PRIME (architecture decisions, constraints)
    human_gate: bool    # Optional — if true, PACE pauses after this day for human review
    stories:
      - title: string   # Short imperative title ("Add login endpoint")
        acceptance_criteria:
          - string      # Testable, concrete conditions. Start with a verb.
        out_of_scope:
          - string      # Explicitly deferred items — GATE can PARTIAL against these
        notes: string   # Optional per-story context for PRIME
```

## Writing good acceptance criteria

Each criterion should be:

- **Testable** — GATE must be able to verify it with test output or CI results.
- **Specific** — name the function, endpoint, or behaviour, not a vague quality.
- **Atomic** — one condition per criterion.

### Good examples

```yaml
acceptance_criteria:
  - "POST /auth/login returns 200 + JWT for valid credentials"
  - "POST /auth/login returns 401 for invalid password"
  - "JWT expires in 24 hours (exp claim verified in tests)"
  - "pytest exits 0 with all auth tests passing"
```

### Weak examples (avoid)

```yaml
acceptance_criteria:
  - "Authentication works"        # Not testable
  - "Good test coverage"          # Not specific
  - "Handles errors correctly"    # Vague
```

## Using `out_of_scope`

`out_of_scope` lets GATE issue a `PARTIAL` verdict rather than FAIL for known deferred items. Without it, GATE will FAIL any criterion it cannot verify.

```yaml
stories:
  - title: "User login"
    acceptance_criteria:
      - "POST /auth/login returns JWT"
      - "CI pipeline is green"
    out_of_scope:
      - "CI pipeline — not yet configured in this sprint"
```

Now if GATE cannot find a green CI run, it marks "CI pipeline" as PARTIAL (mapped to out_of_scope) instead of FAIL.

## Multi-story days

A day can have multiple stories. PRIME will include all of them in the Story Card, and FORGE will implement them sequentially:

```yaml
- day: 2
  theme: "Login + logout endpoints"
  stories:
    - title: "POST /auth/login"
      acceptance_criteria:
        - "Returns 200 + token for valid credentials"
        - "Returns 401 for invalid credentials"
    - title: "POST /auth/logout"
      acceptance_criteria:
        - "Invalidates token server-side"
        - "Returns 204 on success"
```

:::tip
Keep multi-story days focused. Two small related stories are better than four large ones. FORGE has a finite context window and works best with a well-defined daily scope.
:::

## Using `notes` for architectural context

Add `notes` when FORGE needs to know about constraints that aren't expressed in the acceptance criteria:

```yaml
- day: 3
  theme: "Refresh token rotation"
  notes: >
    We store refresh tokens in the database (not in-memory) because we need to
    support multi-device sessions. The RefreshToken model is already stubbed in
    src/models/refresh_token.py from Day 2.
  stories:
    - title: "POST /auth/refresh"
      acceptance_criteria:
        - "Issues new access token given valid refresh token"
        - "Rotates the refresh token (old token invalidated)"
```

## Clearance days

On days where `human_gate: true` or when the orchestrator is configured with advisory clearance days, GATE, SENTINEL, and CONDUIT receive the full advisory backlog and must resolve every open item:

```yaml
- day: 5
  theme: "Final review and advisory clearance"
  human_gate: true
  stories:
    - title: "Resolve all open advisories"
      acceptance_criteria:
        - "All SENTINEL advisories from Days 1-4 are explicitly resolved"
        - "All CONDUIT advisories from Days 1-4 are explicitly resolved"
```

See [Set Human Gate Days](/guides/set-human-gate-days/) for more on human gates.

## Example: 10-day sprint plan

```yaml
sprint:
  goal: "Ship user authentication with JWT and refresh tokens"
  duration_days: 10

days:
  - day: 1
    theme: "User model"
    stories:
      - title: "User creation with hashed passwords"
        acceptance_criteria:
          - "User.create() stores bcrypt-hashed password"
          - "User.verify_password() returns True/False correctly"
          - "Unit tests pass for both cases"

  - day: 2
    theme: "Login endpoint"
    stories:
      - title: "POST /auth/login"
        acceptance_criteria:
          - "Returns 200 + signed JWT for valid credentials"
          - "Returns 401 for invalid credentials"
          - "Token payload includes user_id and exp"

  - day: 3
    theme: "Advisory clearance"
    notes: "Review and close all advisories from Days 1-2"
    stories:
      - title: "Clear advisory backlog"
        acceptance_criteria:
          - "All SENTINEL and CONDUIT advisories from Days 1-2 resolved"

  - day: 4
    theme: "Protected routes"
    stories:
      - title: "JWT middleware"
        acceptance_criteria:
          - "Protected routes return 401 for missing/invalid token"
          - "Protected routes return 200 for valid token"

  - day: 5
    theme: "Refresh tokens"
    stories:
      - title: "POST /auth/refresh"
        acceptance_criteria:
          - "Issues new access token from valid refresh token"
          - "Rotates refresh token on each use"
          - "Returns 401 for expired or revoked refresh token"
```
