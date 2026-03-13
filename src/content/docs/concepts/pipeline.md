---
title: The PACE Pipeline
description: How the six PACE agents connect day by day to plan, build, review, and ship your sprint.
sidebar:
  order: 1
---

PACE runs a six-agent pipeline every day. Each agent reads the outputs of previous agents, does focused work within its domain, and produces a structured YAML artifact that becomes evidence for the next agent. No agent acts on assumptions — every decision is traceable.

## The daily cycle

```
                    ┌─────────────────────────────────┐
                    │         plan.yaml               │
                    │   (your sprint plan — once)     │
                    └──────────────┬──────────────────┘
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │           PRIME               │
                   │   Reads plan.yaml for Day N   │
                   │   Produces: story-card.yaml   │
                   └───────────────┬───────────────┘
                                   │ story-card.yaml
                                   ▼
                   ┌───────────────────────────────┐
                   │           FORGE               │
                   │   Tool-loop: reads + writes   │
                   │   source files, runs tests    │
                   │   Produces: handoff.yaml      │
                   └─────────┬─────────────────────┘
                             │ story-card + handoff
                      ┌──────┼──────────┐
                      ▼      ▼          ▼
                   ┌──────┐ ┌────────┐ ┌─────────┐
                   │ GATE │ │SENTINEL│ │ CONDUIT │
                   └──┬───┘ └────┬───┘ └────┬────┘
                      │         │           │
                      └────┬────┘           │
                           │                │
                     gate-report      conduit-report
                    sentinel-report
                           │
                           ▼
                   ┌───────────────────────────────┐
                   │           SCRIBE              │
                   │   Updates context documents   │
                   │   README, engineering.md etc  │
                   └───────────────────────────────┘
```

## Agent responsibilities

### PRIME — Planning

PRIME is the first agent to run each day. It reads your `plan.yaml` and today's day number, then generates a **Story Card** — a structured YAML document containing:

- User stories with acceptance criteria
- `out_of_scope` items GATE can PARTIAL against
- Day theme and any contextual notes

PRIME never writes code. Its only output is the Story Card.

### FORGE — Implementation

FORGE receives the Story Card and enters a **tool-calling loop**. It can:

- Read and write files within the configured `source.dirs`
- Run shell commands (tests, linters)
- Create and modify test files
- Call `complete_handoff` to signal completion

FORGE follows test-driven development by default: it writes tests first (Red), then implements to pass (Green), then refactors. The loop continues until all acceptance criteria are met or FORGE explicitly defers.

FORGE enforces a **mandatory COVERAGE RULE**: every production file it creates or modifies must have corresponding tests in the same story. Deferred tests require an explicit `out_of_scope` entry in the story card, or GATE will HOLD. See [Enforce Test Coverage](/guides/enforce-test-coverage/) for the full rule.

The **Handoff Note** records:
- Every file written or modified (with commit SHA)
- A summary of what was built
- Anything explicitly deferred

### GATE — Quality

GATE runs your configured `test_command` and inspects the output. It evaluates each acceptance criterion:

- **PASS** — criterion met, evidence from test output or CI
- **PARTIAL** — not yet done, but maps to an `out_of_scope` item
- **FAIL** — criterion not met, no out_of_scope justification

**`gate_decision`**:
- `SHIP` — all criteria PASS or PARTIAL (with justification)
- `HOLD` — at least one FAIL; `hold_reason` is actionable for FORGE

A HOLD stops the day. FORGE must fix the issue before Day N can advance. The `hold_reason` from whichever agent issued the HOLD is surfaced directly in the platform escalation issue (GitHub Issue, GitLab Issue, Jira ticket, etc.) so the blocked reason is always visible without reading raw YAML artifacts.

### SENTINEL — Security & SRE

SENTINEL receives the Story Card, FORGE's Handoff, and the GATE report. It reviews:

- Hardcoded secrets, tokens, credentials
- Input validation gaps (injection, path traversal)
- Missing timeouts on I/O operations
- Unhandled error paths and resource leaks
- Authorization boundary correctness

**`sentinel_decision`**:
- `SHIP` — no FAIL findings
- `HOLD` — at least one exploitable vulnerability
- `ADVISORY` — no FAIL, but concerns worth tracking

SENTINEL ADVISORY findings are stored in the advisory backlog for future clearance.

### CONDUIT — DevOps

CONDUIT reads CI/CD workflow files, the Makefile, and infrastructure configuration. It checks:

- Action version pinning (no `@master` or `@latest`)
- Test blocking gates in CI (a failing test must block merge)
- Dependency lock file consistency
- Hardcoded environment-specific values
- Makefile targets referenced in CI actually exist

**`conduit_decision`**: same SHIP / HOLD / ADVISORY logic as SENTINEL.

### SCRIBE — Documentation

SCRIBE is the final agent. It updates context documents in `.pace/context/`:

| File | Updated with |
|------|-------------|
| `engineering.md` | New modules, functions, patterns introduced today |
| `security.md` | Security decisions, authentication boundaries, validated inputs |
| `devops.md` | CI/CD changes, new env vars, deployment config |
| `product.md` | Product decisions, deferred scope, changed requirements |

SCRIBE also updates the README and any external `docs_dir` content if configured. Its output feeds FORGE on Day N+1 — FORGE reads `engineering.md` to understand existing code before writing new code.

## Data flow: what each agent reads

| Agent | Reads |
|-------|-------|
| PRIME | `plan.yaml`, SCRIBE context docs |
| FORGE | Story Card, SCRIBE context docs, source files |
| GATE | Story Card, Handoff Note, test runner output, CI result |
| SENTINEL | Story Card, Handoff Note, GATE report, secret scan |
| CONDUIT | Story Card, Handoff Note, SENTINEL report, CI workflows, Makefile |
| SCRIBE | Story Card, Handoff Note, GATE + SENTINEL + CONDUIT reports |

## Decision escalation

```
Day N runs all agents
       │
       ▼
GATE HOLD? ──── yes ──→ FORGE fixes → retry Day N
       │ no
       ▼
SENTINEL HOLD? ── yes ──→ FORGE fixes → retry Day N
       │ no
       ▼
CONDUIT HOLD? ─── yes ──→ FORGE fixes → retry Day N
       │ no
       ▼
Any ADVISORY? ─── yes ──→ add to advisory backlog
       │ no
       ▼
Day N ships → advance to Day N+1
```

A day does not advance until all three review agents issue SHIP or ADVISORY. HOLD is a hard block.

When any agent HOLDs, the orchestrator captures the `hold_reason` and passes it to `open_escalation_issue`. The escalation issue on your platform will always display the hold reason, cascading through gate → sentinel → conduit reports if the primary source is empty.

## Advisory lifecycle

Advisories accumulate in the backlog. On designated **clearance days** (configured in `plan.yaml`), SENTINEL and CONDUIT each receive the full backlog and must explicitly evaluate every open item:

- **Resolved** — mark as PASS with evidence
- **Escalated** — promote to FAIL (now a blocker for the clearance day)
- **Persisted** — rare; only if genuinely still not applicable

See [Advisory Backlog](/concepts/advisory-backlog/) for the full lifecycle.

## Artifacts per day

All artifacts are saved to `.pace/day-N/`:

```
.pace/
└── day-1/
    ├── story-card.yaml
    ├── handoff.yaml
    ├── gate-report.yaml
    ├── sentinel-report.yaml
    ├── conduit-report.yaml
    ├── scribe-report.yaml
    ├── cycle.md            ← pipeline cost (written on SHIP)
    ├── attempts.yaml       ← cost + outcome of every run incl. retries
    ├── review-pr.md        ← PR body (or opened PR URL)
    └── escalation-issue.md ← issue body (if advisory escalated)
```
