---
title: Set Human Gate Days
description: Pause PACE for human review at critical sprint milestones before continuing.
sidebar:
  order: 5
---

A human gate day is a checkpoint where PACE pauses after completing all six agents and waits for you to review the output before advancing. This is useful for:

- Mid-sprint architectural reviews
- Security-sensitive features requiring manual sign-off
- Demos or stakeholder check-ins
- Validating a complex FORGE implementation before the next story builds on it

## Marking a day as a human gate

In your `plan.yaml`, add `human_gate: true` to the day:

```yaml
days:
  - day: 5
    theme: "Authentication middleware — mid-sprint review"
    human_gate: true
    stories:
      - title: "JWT middleware"
        acceptance_criteria:
          - "All protected routes require valid JWT"
          - "Tests cover expired and malformed tokens"
```

## What happens on a human gate day

1. PACE runs all six agents normally (PRIME → FORGE → GATE → SENTINEL → CONDUIT → SCRIBE).
2. After SCRIBE completes, the orchestrator prints:

```
============================================================
HUMAN GATE — Day 5 complete. Review required before Day 6.
============================================================

Review the following before continuing:
  .pace/day-5/story-card.yaml
  .pace/day-5/handoff.yaml
  .pace/day-5/gate-report.yaml
  .pace/day-5/sentinel-report.yaml
  .pace/day-5/conduit-report.yaml

When ready, run:
  python pace/orchestrator.py --day 6

Press Ctrl+C to abort.
```

3. PACE **does not automatically run Day 6**. You must explicitly run the next day.

## Reviewing a human gate day

Open the day's artifacts in `.pace/day-5/` and check:

| File | What to look for |
|------|-----------------|
| `gate-report.yaml` | All criteria PASS? Any deferred items acceptable? |
| `sentinel-report.yaml` | Any ADVISORY findings you want to promote to blockers? |
| `conduit-report.yaml` | CI configuration correct before the next story adds more? |
| `handoff.yaml` | Files written match what you expected? Commit SHA correct? |

## Overriding a HOLD on a human gate day

If GATE issued a HOLD, fix the issue and retry the day before reviewing:

```bash
python pace/orchestrator.py --day 5 --retry
```

Once you are satisfied with the output, advance:

```bash
python pace/orchestrator.py --day 6
```

## Combining human gates with advisory clearance

A common pattern is to combine a human gate with an advisory clearance day:

```yaml
- day: 5
  theme: "Mid-sprint human review + advisory clearance"
  human_gate: true
  notes: >
    This is both a human checkpoint and the first advisory clearance day.
    SENTINEL and CONDUIT will be given the advisory backlog from Days 1-4
    and must explicitly resolve each item.
  stories:
    - title: "Resolve advisory backlog"
      acceptance_criteria:
        - "All advisories from Days 1-4 are resolved or escalated"
```

## Running PACE in CI with human gates

If PACE is running inside CI, human gate days should be configured to send a notification (Slack, email, etc.) and wait for a workflow approval step:

```yaml
# GitHub Actions example
- name: Run PACE Day 5
  run: python pace/orchestrator.py --day 5
  # After this step, add a GitHub Environments "required reviewers" gate
  environment: pace-gate-day-5
```

Set `environment: pace-gate-day-5` in your GitHub Actions workflow, then configure that environment to require reviewer approval in GitHub Settings → Environments. The workflow will pause until a reviewer approves.
