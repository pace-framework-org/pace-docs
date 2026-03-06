---
title: CLI Commands
description: All command-line invocations for running PACE, from the orchestrator to individual agents.
sidebar:
  order: 5
---

All PACE commands are run from the `pace/` subdirectory inside your repository.

```bash
cd pace
source .venv/bin/activate
```

---

## Orchestrator

The orchestrator is the main entry point. It runs all six agents in sequence for a given day.

```bash
python pace/orchestrator.py --day <N> [options]
```

### Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `--day N` | integer | Yes | Day to run (1-indexed, must not exceed `sprint.duration_days`). |
| `--retry` | flag | No | Re-run a day that previously ended in HOLD. Clears the previous day's artifacts before re-running. |
| `--dry-run` | flag | No | Run PRIME only and print the Story Card. Does not call FORGE or downstream agents. |
| `--skip-ci` | flag | No | Skip CI polling in GATE. CI result will be `no_runs`. Useful for local development. |
| `--config PATH` | string | No | Path to an alternative `pace.config.yaml`. Defaults to `pace/pace.config.yaml`. |

### Examples

```bash
# Run Day 1
python pace/orchestrator.py --day 1

# Re-run Day 3 after fixing a HOLD
python pace/orchestrator.py --day 3 --retry

# Preview the Day 5 Story Card without running FORGE
python pace/orchestrator.py --day 5 --dry-run

# Run Day 2 without waiting for CI
python pace/orchestrator.py --day 2 --skip-ci
```

---

## Running individual agents

Each agent can be run standalone for debugging. All agents read from `pace.config.yaml` and the relevant `.pace/day-N/` artifacts.

### PRIME

```bash
python pace/agents/prime.py --day <N>
```

Outputs: `.pace/day-N/story-card.yaml`

### FORGE

```bash
python pace/agents/forge.py --day <N>
```

Reads: `.pace/day-N/story-card.yaml`
Outputs: `.pace/day-N/handoff.yaml`

### GATE

```bash
python pace/agents/gate.py --day <N>
```

Reads: `.pace/day-N/story-card.yaml`, `.pace/day-N/handoff.yaml`
Outputs: `.pace/day-N/gate-report.yaml`

### SENTINEL

```bash
python pace/agents/sentinel.py --day <N>
```

Reads: story-card, handoff, gate-report
Outputs: `.pace/day-N/sentinel-report.yaml`

### CONDUIT

```bash
python pace/agents/conduit.py --day <N>
```

Reads: story-card, handoff, sentinel-report
Outputs: `.pace/day-N/conduit-report.yaml`

### SCRIBE

```bash
python pace/agents/scribe.py --day <N>
```

Reads: all reports from the day
Outputs: updated `.pace/context/*.md` files

---

## Utility commands

### Validate configuration

```bash
python pace/pace/config.py --validate
```

Checks `pace.config.yaml` for required fields, type errors, and missing source directories.

### Check environment variables

```bash
python pace/pace/config.py --check-env
```

Verifies that all environment variables required for your configured `platform.type` and `llm.provider` are set.

### View advisory backlog

```bash
cat .pace/advisory-backlog.yaml
```

Lists all open advisory findings across all sprint days.

### View sprint summary

```bash
cat .pace/sprint-summary.md
```

Markdown summary of all daily decisions and open advisories (generated at sprint end or on the final day).

---

## GitHub Actions workflow

To run PACE as a scheduled or manually triggered GitHub Actions workflow:

```yaml
# .github/workflows/pace.yml
name: PACE Sprint

on:
  workflow_dispatch:
    inputs:
      day:
        description: 'Sprint day to run'
        required: true
        type: number

jobs:
  pace:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install PACE dependencies
        run: pip install -r pace/requirements.txt

      - name: Run PACE Day ${{ inputs.day }}
        working-directory: pace
        run: python pace/orchestrator.py --day ${{ inputs.day }}
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Commit PACE artifacts
        run: |
          git config user.name "PACE Bot"
          git config user.email "pace@noreply"
          git add .pace/
          git diff --staged --quiet || git commit -m "PACE: Day ${{ inputs.day }} artifacts"
          git push
```

---

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Day completed successfully (SHIP or ADVISORY decisions) |
| `1` | Day ended with HOLD — at least one agent issued a blocking failure |
| `2` | Configuration error — invalid `pace.config.yaml` or missing environment variable |
| `3` | Plan error — day not found in `plan.yaml` or day exceeds `duration_days` |
