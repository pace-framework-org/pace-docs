---
title: Run PACE on GitLab CI/CD
description: Automate your PACE sprint with a GitLab CI/CD pipeline — manual day triggers, CI variables, and artifact storage.
sidebar:
  order: 10
---

This tutorial shows how to run PACE inside GitLab CI/CD. Each sprint day is triggered via a manual pipeline, PACE writes code back to the branch, and `.pace/` outputs are stored as job artifacts.

## How it works

```
Engineer triggers manual pipeline (DAY=3)
        ↓
GitLab runner clones repository
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
Outputs: .pace/day-3/ artifacts, MR opened on SHIP
```

## Prerequisites

- PACE cloned into the `pace/` subdirectory of your repo
- A GitLab project with CI/CD enabled
- `ANTHROPIC_API_KEY` added as a CI/CD variable (masked, protected)

## 1 — Add CI/CD variables

Go to **Settings → CI/CD → Variables** and add:

| Variable | Value | Protected | Masked |
|----------|-------|-----------|--------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | Yes | Yes |
| `GITLAB_TOKEN` | Project access token with `api` scope | Yes | Yes |

`GITLAB_PROJECT` and `CI_JOB_TOKEN` are automatically injected by GitLab — no setup needed.

For other LLM providers, see the [Environment Variables reference](/reference/env-vars/).

## 2 — Configure `pace.config.yaml`

Set `platform.type: gitlab`:

```yaml
platform:
  type: gitlab
```

GitLab CI automatically injects `CI_PROJECT_ID` (mapped to `GITLAB_PROJECT`) and `CI_JOB_TOKEN` (used as `GITLAB_TOKEN`). See the pipeline file below for how to pass these.

## 3 — Create the pipeline file

Create `.gitlab-ci.yml` at your repo root:

```yaml
stages:
  - pace

variables:
  PIP_CACHE_DIR: "$CI_PROJECT_DIR/.cache/pip"

cache:
  paths:
    - .cache/pip
    - pace/.venv/

pace-day:
  stage: pace
  image: python:3.12-slim
  when: manual
  rules:
    - if: $CI_PIPELINE_SOURCE == "web"       # triggered via UI
    - if: $CI_PIPELINE_SOURCE == "api"       # triggered via API
  before_script:
    - cd pace
    - python -m venv .venv
    - source .venv/bin/activate
    - pip install -r requirements.txt
  script:
    - python pace/orchestrator.py --day $DAY $( [ "$RETRY" = "true" ] && echo "--retry" )
  variables:
    DAY: "1"           # override when triggering
    RETRY: "false"
    GITLAB_TOKEN: $CI_JOB_TOKEN
    GITLAB_PROJECT: $CI_PROJECT_ID
  artifacts:
    when: always       # collect even on HOLD
    paths:
      - .pace/
    reports:
      dotenv: pace-env.env   # optional: expose PACE outputs as variables
    expire_in: 30 days
```

:::note
`CI_JOB_TOKEN` has limited permissions. For PACE to open MRs and issues, use a **project access token** with `api` scope stored as `GITLAB_TOKEN` in CI/CD variables, rather than `CI_JOB_TOKEN`. See step 1.
:::

## 4 — Trigger a day

### Via the GitLab UI

1. Go to **CI/CD → Pipelines**
2. Click **Run pipeline**
3. Set the `DAY` variable to the sprint day number (e.g. `3`)
4. Click **Run pipeline**

The `pace-day` job appears as **manual** — click the play button to start it.

### Via the GitLab API

```bash
curl -X POST \
  --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  --form "ref=sprint/auth-feature" \
  --form "variables[DAY]=3" \
  "https://gitlab.com/api/v4/projects/$PROJECT_ID/pipeline"
```

## 5 — View outputs

After the job completes:

- **Artifacts** — download `.pace/day-N/` from **CI/CD → Pipelines → [job] → Download artifacts**
- **MR** — on SHIP days, PACE opens a Merge Request from the sprint branch to `main`
- **Issues** — on HOLD (after all retries), PACE opens a GitLab Issue tagged `pace-hold`

## 6 — Language-specific setup

Add the language runtime to the pipeline's `before_script` or use a matching Docker image.

### Java (Maven)

```yaml
pace-day:
  image: maven:3.9-eclipse-temurin-21
  before_script:
    - apt-get update -q && apt-get install -y python3 python3-pip python3-venv
    - cd pace && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

### Java (Gradle)

```yaml
pace-day:
  image: gradle:8-jdk21
  before_script:
    - apt-get update -q && apt-get install -y python3 python3-pip python3-venv
    - cd pace && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

### C# (.NET)

```yaml
pace-day:
  image: mcr.microsoft.com/dotnet/sdk:8.0
  before_script:
    - apt-get update -q && apt-get install -y python3 python3-pip python3-venv
    - cd pace && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

### Node.js / TypeScript

```yaml
pace-day:
  image: node:20-slim
  before_script:
    - npm ci
    - apt-get update -q && apt-get install -y python3 python3-pip python3-venv
    - cd pace && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

### Go

```yaml
pace-day:
  image: golang:1.22
  before_script:
    - apt-get update -q && apt-get install -y python3 python3-pip python3-venv
    - cd pace && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

## 7 — Retrying a HOLD day

When GATE issues a HOLD, the pipeline exits non-zero and a GitLab Issue is opened. After you push a fix:

1. Go to **CI/CD → Pipelines → Run pipeline**
2. Set `DAY` to the same day number
3. Set `RETRY` to `true`
4. Click **Run pipeline**

## 8 — Branch strategy

FORGE commits directly to the branch checked out by the runner. Protect your `main` branch in **Settings → Repository → Protected branches** and work on named sprint branches (e.g. `sprint/auth-feature`). PACE opens MRs from the sprint branch to `main`.

To ensure the runner uses the correct branch, select the branch in the **Run pipeline** dialog.

## Self-hosted GitLab

For a self-hosted GitLab instance, add the instance URL to your `pace.config.yaml` credentials or set `GITLAB_URL` in CI/CD variables:

```bash
# In CI/CD variables:
GITLAB_URL=https://gitlab.mycompany.com
```

Or export it in the pipeline:

```yaml
variables:
  GITLAB_URL: "https://gitlab.mycompany.com"
```

## Common issues

**`403 Forbidden` when opening MR**
`CI_JOB_TOKEN` may not have permission to create MRs. Use a project access token with `api` scope stored in a CI/CD variable, mapped as `GITLAB_TOKEN`.

**Pipeline completes but no artifacts uploaded**
Ensure the `artifacts.paths` section matches the `.pace/` directory. If the orchestrator changes the working directory, adjust the path accordingly.

**`python3-venv` not found**
If using a custom Docker image without `python3-venv`, install it with `apt-get install -y python3-venv`, or use the official `python:3.12-slim` image and install your language runtime separately.

**FORGE cannot commit — `git push` fails**
The GitLab runner may use a read-only clone token. Set `GIT_STRATEGY: clone` and ensure the runner has write access to the repository via the project access token.
