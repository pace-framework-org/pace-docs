---
title: Run PACE on Bitbucket Pipelines
description: Automate your PACE sprint with Bitbucket Pipelines — custom pipelines, repository variables, and artifact downloads.
sidebar:
  order: 12
---

This tutorial shows how to run PACE inside Bitbucket Pipelines. Each sprint day is triggered as a custom pipeline, PACE writes code back to the branch, and `.pace/` outputs are stored as pipeline artifacts.

## How it works

```
Engineer triggers custom pipeline (DAY=3)
        ↓
Bitbucket runner clones repository
        ↓
pip install pace dependencies
        ↓
python pace/orchestrator.py --day 3
  ├── PRIME generates story card
  ├── FORGE writes code + commits
  ├── GATE runs your test suite
  ├── SENTINEL checks for issues
  ├── CONDUIT reviews CI config
  └── SCRIBE updates docs
        ↓
Outputs: .pace/day-3/ artifacts, PR opened on SHIP
```

## Prerequisites

- PACE cloned into the `pace/` subdirectory of your repo
- Bitbucket Cloud with Pipelines enabled (**Repository settings → Pipelines → Settings**)
- Issues enabled on the repository (**Repository settings → Issue tracker → Enable**)
- `ANTHROPIC_API_KEY` added as a repository variable (secured)

## 1 — Add repository variables

Go to **Repository settings → Pipelines → Repository variables** and add:

| Variable | Value | Secured |
|----------|-------|---------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | Yes |
| `BITBUCKET_USER` | Your Bitbucket username | No |
| `BITBUCKET_APP_PASSWORD` | App password with `pullrequests:write` and `issues:write` | Yes |

`BITBUCKET_WORKSPACE` and `BITBUCKET_REPO_SLUG` are automatically injected by Pipelines — no setup needed.

For other LLM providers, see the [Environment Variables reference](/reference/env-vars/).

## 2 — Configure `pace.config.yaml`

Set `platform.type: bitbucket`:

```yaml
platform:
  type: bitbucket
```

Bitbucket Pipelines automatically injects `BITBUCKET_WORKSPACE` and `BITBUCKET_REPO_SLUG`. The app password variables you added in step 1 cover the remaining required credentials.

## 3 — Create the pipeline file

Create `bitbucket-pipelines.yml` at your repo root:

```yaml
image: python:3.12-slim

definitions:
  caches:
    pip: ~/.cache/pip

pipelines:
  custom:
    pace-day:
      - variables:
          - name: DAY
            default: "1"
            description: "Sprint day number to run"
          - name: RETRY
            default: "false"
            description: "Set to true to retry after fixing a HOLD"
      - step:
          name: Run PACE Day $DAY
          caches:
            - pip
          script:
            - cd pace
            - python -m venv .venv
            - source .venv/bin/activate
            - pip install -r requirements.txt
            - |
              RETRY_FLAG=""
              if [ "$RETRY" = "true" ]; then RETRY_FLAG="--retry"; fi
              python pace/orchestrator.py --day $DAY $RETRY_FLAG
          artifacts:
            - .pace/**
```

:::note
Bitbucket Pipelines requires Issues to be enabled on the repository (Settings → Issue tracker). Pipelines must also be enabled (Settings → Pipelines → Settings) for CI polling to work.
:::

## 4 — Trigger a day

### Via the Bitbucket UI

1. Go to **Pipelines** in your repository sidebar
2. Click **Run pipeline**
3. Select branch: your sprint branch (e.g. `sprint/auth-feature`)
4. Select pipeline: **Custom: pace-day**
5. Set `DAY` variable to the sprint day number
6. Click **Run**

### Via the Bitbucket API

```bash
curl -X POST \
  "https://api.bitbucket.org/2.0/repositories/$WORKSPACE/$REPO_SLUG/pipelines/" \
  --user "$BITBUCKET_USER:$BITBUCKET_APP_PASSWORD" \
  --header "Content-Type: application/json" \
  --data '{
    "target": {
      "type": "pipeline_ref_target",
      "ref_type": "branch",
      "ref_name": "sprint/auth-feature",
      "selector": {
        "type": "custom",
        "pattern": "pace-day"
      }
    },
    "variables": [
      {"key": "DAY", "value": "3"},
      {"key": "RETRY", "value": "false"}
    ]
  }'
```

## 5 — View outputs

After the pipeline completes:

- **Artifacts** — click the step in the pipeline run, then **Artifacts** tab, to download `.pace/day-N/`
- **Pull Request** — on SHIP days, PACE opens a Bitbucket PR from the sprint branch to `main`
- **Issues** — on HOLD (after all retries), PACE opens a Bitbucket Issue tagged with HOLD reason

## 6 — Language-specific setup

Replace the `image` or add installation steps for your language runtime.

### Java (Maven)

```yaml
image: maven:3.9-eclipse-temurin-21

definitions:
  caches:
    maven: ~/.m2

pipelines:
  custom:
    pace-day:
      - step:
          caches:
            - maven
          script:
            - apt-get update -q && apt-get install -y python3 python3-pip python3-venv
            - cd pace && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
            - python3 pace/orchestrator.py --day $DAY
```

### C# (.NET)

```yaml
image: mcr.microsoft.com/dotnet/sdk:8.0

pipelines:
  custom:
    pace-day:
      - step:
          script:
            - apt-get update -q && apt-get install -y python3 python3-pip python3-venv
            - cd pace && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
            - python3 pace/orchestrator.py --day $DAY
```

### Node.js / TypeScript

```yaml
image: node:20-slim

definitions:
  caches:
    node: node_modules

pipelines:
  custom:
    pace-day:
      - step:
          caches:
            - node
          script:
            - npm ci
            - apt-get update -q && apt-get install -y python3 python3-pip python3-venv
            - cd pace && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
            - python3 pace/orchestrator.py --day $DAY
```

### Go

```yaml
image: golang:1.22

pipelines:
  custom:
    pace-day:
      - step:
          script:
            - apt-get update -q && apt-get install -y python3 python3-pip python3-venv
            - cd pace && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
            - python3 pace/orchestrator.py --day $DAY
```

## 7 — Retrying a HOLD day

When GATE issues a HOLD, the pipeline fails and a Bitbucket Issue is opened. After you push a fix:

1. Go to **Pipelines → Run pipeline**
2. Select the same branch and **Custom: pace-day**
3. Set `DAY` to the same day number
4. Set `RETRY` to `true`
5. Click **Run**

## 8 — Branch strategy

FORGE commits directly to the checked-out branch. Protect `main` in **Repository settings → Branch permissions** and work on named sprint branches. PACE opens PRs from the sprint branch to `main`.

Select the sprint branch in the **Run pipeline** dialog to ensure FORGE commits to the correct branch.

## Common issues

**`python: command not found`**
The default `python:3.12-slim` image uses `python` (not `python3`). If using a different base image, replace `python` with `python3` in the script steps.

**Issues not created — `400 Bad Request`**
Bitbucket requires the Issue tracker to be enabled. Go to **Repository settings → Issue tracker** and enable it. If already enabled, verify `BITBUCKET_APP_PASSWORD` has the `issues:write` permission.

**PR not opened — `pullrequests:write` missing**
The app password must have `pullrequests:write` permission. Create a new app password at **Bitbucket personal settings → App passwords** with both `pullrequests:write` and `issues:write` checked.

**Artifacts not found after HOLD**
Bitbucket artifact paths must match exactly. If the pipeline exits early (e.g. credentials missing), `.pace/` may not exist. Add `allow_empty: true` to the artifacts section:

```yaml
artifacts:
  - .pace/**
```

Bitbucket does not support `allow_empty` natively — if the directory doesn't exist the step fails silently. Ensure your credentials are set before the first run.

**`BITBUCKET_WORKSPACE` is empty**
This variable is automatically injected but only when Pipelines is enabled. If it appears empty in logs, confirm Pipelines is enabled in **Repository settings → Pipelines → Settings**.
