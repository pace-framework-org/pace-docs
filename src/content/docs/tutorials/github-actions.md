---
title: Run PACE on GitHub Actions
description: Automate your PACE sprint with a GitHub Actions workflow — manual day triggers, secrets setup, and artifact collection.
sidebar:
  order: 9
---

This tutorial shows how to run PACE inside GitHub Actions. Each sprint day is triggered manually, PACE writes code back to the branch, and the workflow collects `.pace/` outputs as artifacts.

## How it works

```
Engineer triggers workflow (day=3)
        ↓
GitHub Actions runner clones repo
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
- A GitHub repository with Actions enabled
- `ANTHROPIC_API_KEY` (or your LLM provider key) added as a repository secret

## 1 — Add repository secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret name | Value |
|-------------|-------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `GITHUB_TOKEN` | Automatically provided — no action needed |

For other LLM providers, see the [Environment Variables reference](/reference/env-vars/).

## 2 — Create the workflow file

Create `.github/workflows/pace.yml`:

```yaml
name: PACE Sprint

on:
  workflow_dispatch:
    inputs:
      day:
        description: "Sprint day number to run (e.g. 1)"
        required: true
        type: number
      retry:
        description: "Re-run the same day after fixing a HOLD"
        required: false
        type: boolean
        default: false

jobs:
  pace:
    runs-on: ubuntu-latest
    permissions:
      contents: write      # FORGE commits code
      pull-requests: write # PACE opens PR on human gate days

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0   # full history so FORGE can read git log

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install PACE dependencies
        run: |
          cd pace
          pip install -r requirements.txt

      - name: Run PACE Day ${{ inputs.day }}
        run: |
          cd pace
          python pace/orchestrator.py --day ${{ inputs.day }}${{ inputs.retry && ' --retry' || '' }}
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          # GITHUB_TOKEN and GITHUB_REPOSITORY are auto-provided by Actions

      - name: Upload PACE outputs
        if: always()   # upload even if the day ended in HOLD
        uses: actions/upload-artifact@v4
        with:
          name: pace-day-${{ inputs.day }}
          path: |
            .pace/day-${{ inputs.day }}/
            .pace/advisory_backlog.yaml
          retention-days: 30
```

## 3 — Configure `pace.config.yaml`

Set `platform.type: github` so PACE uses the GitHub adapter:

```yaml
platform:
  type: github
```

GitHub Actions automatically injects `GITHUB_TOKEN` and `GITHUB_REPOSITORY`. No extra environment variable setup is needed.

## 4 — Trigger a day

1. Go to **Actions → PACE Sprint**
2. Click **Run workflow**
3. Enter the day number and click **Run workflow**

The workflow runs the orchestrator and streams logs to the Actions console. When complete, `.pace/day-N/` is uploaded as an artifact.

## 5 — View outputs

After the workflow completes:

- **Artifacts** — download `.pace/day-N/` for the story card, handoff, gate report, and sentinel report
- **Job summary** — PACE writes a markdown summary to `$GITHUB_STEP_SUMMARY`, visible directly in the workflow run UI
- **Pull Request** — on SHIP days, PACE opens a PR from the sprint branch to `main`
- **Issues** — on HOLD (after all retries), PACE opens a GitHub Issue tagged `pace-hold`

## 6 — Language-specific setup

Add the language runtime and package installation before the PACE step.

### Java (Maven)

```yaml
      - name: Set up Java
        uses: actions/setup-java@v4
        with:
          java-version: "21"
          distribution: "temurin"
          cache: "maven"

      - name: Install PACE dependencies
        run: |
          cd pace
          pip install -r requirements.txt
```

### Java (Gradle)

```yaml
      - name: Set up Java
        uses: actions/setup-java@v4
        with:
          java-version: "21"
          distribution: "temurin"
          cache: "gradle"
```

### C# (.NET)

```yaml
      - name: Set up .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: "8.x"
```

### Node.js / TypeScript

```yaml
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install Node.js dependencies
        run: npm ci
```

### Go

```yaml
      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: "1.22"
          cache: true
```

## 7 — Full example for a Node.js project

```yaml
name: PACE Sprint

on:
  workflow_dispatch:
    inputs:
      day:
        description: "Sprint day number"
        required: true
        type: number
      retry:
        description: "Retry after HOLD fix"
        type: boolean
        default: false

jobs:
  pace:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install PACE
        run: cd pace && pip install -r requirements.txt

      - name: Run PACE Day ${{ inputs.day }}
        run: |
          cd pace
          python pace/orchestrator.py --day ${{ inputs.day }}${{ inputs.retry && ' --retry' || '' }}
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Upload outputs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: pace-day-${{ inputs.day }}
          path: .pace/day-${{ inputs.day }}/
```

## 8 — Retrying a HOLD day

When GATE issues a HOLD, the workflow exits with a non-zero code and the `pace-hold` issue is opened. After you fix the underlying problem:

1. Push the fix to the sprint branch
2. Trigger the workflow again with the same day number and **Retry: true**

```
Run workflow → day: 2 → retry: true
```

The orchestrator reads the previous HOLD reason and passes it to FORGE as context for the retry attempt.

## 9 — Branch strategy

FORGE commits directly to the branch checked out by `actions/checkout`. For a clean sprint workflow:

1. Create a feature branch before starting the sprint: `git checkout -b sprint/auth-feature`
2. Run PACE days on that branch
3. PACE opens a PR to `main` on human gate days or sprint end

To ensure the runner uses the correct branch, trigger the workflow from the sprint branch using the **Use workflow from** dropdown in the GitHub Actions UI.

## Common issues

**`git push` permission denied**
The workflow needs `contents: write` permission. Check your repo's Actions settings under **Settings → Actions → General → Workflow permissions** — select "Read and write permissions".

**`ANTHROPIC_API_KEY` not found**
Confirm the secret is named exactly `ANTHROPIC_API_KEY` (case-sensitive) in **Settings → Secrets and variables → Actions → Repository secrets**.

**Workflow triggers but PACE exits immediately**
Check that `pace/pace.config.yaml` exists and is committed to the branch being run. Uncommitted config changes won't be present in the Actions runner.

**Test suite fails in Actions but passes locally**
The runner environment may differ (missing service containers, different locale). Add service containers (PostgreSQL, Redis) to the workflow if your tests require them. See [GitHub Actions service containers](https://docs.github.com/en/actions/using-containerized-services) for setup.
