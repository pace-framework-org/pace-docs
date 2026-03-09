---
title: Environment Variables
description: All environment variables used by PACE agents, adapters, and the orchestrator.
sidebar:
  order: 4
---

PACE never stores credentials in `pace.config.yaml`. All secrets are read from environment variables at runtime.

## LLM providers

| Variable | Required for | Description |
|----------|-------------|-------------|
| `ANTHROPIC_API_KEY` | `llm.provider: anthropic` | Anthropic API key. Get one at console.anthropic.com. |
| `LLM_API_KEY` | `llm.provider: litellm` | API key for the configured LiteLLM provider. |
| `AWS_ACCESS_KEY_ID` | LiteLLM + Bedrock | AWS access key for Bedrock. |
| `AWS_SECRET_ACCESS_KEY` | LiteLLM + Bedrock | AWS secret key for Bedrock. |
| `AWS_REGION_NAME` | LiteLLM + Bedrock | AWS region (e.g. `us-east-1`). |
| `AZURE_API_BASE` | LiteLLM + Azure | Azure OpenAI endpoint URL. |
| `AZURE_API_VERSION` | LiteLLM + Azure | Azure API version (e.g. `2024-02-01`). |

:::note
For LiteLLM, the variable name expected by each provider may vary. `LLM_API_KEY` is PACE's convention; LiteLLM also accepts provider-specific names like `OPENAI_API_KEY`, `GEMINI_API_KEY`, etc. Check the [LiteLLM provider docs](https://docs.litellm.ai/docs/providers) for details.
:::

---

## Platforms

### GitHub

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | Personal access token or Actions `GITHUB_TOKEN`. Needs `repo` scope (or `public_repo` for public repos). |
| `GITHUB_REPOSITORY` | Yes | Repository in `owner/repo` format (e.g. `acme-corp/acme-api`). Auto-set in GitHub Actions. |

### GitLab

| Variable | Required | Description |
|----------|----------|-------------|
| `GITLAB_TOKEN` | Yes | Project or Group access token with `api` scope. |
| `GITLAB_PROJECT` | Yes | Project ID (integer) or namespace path (`group/project`). Auto-set as `$CI_PROJECT_ID` in GitLab CI. |
| `GITLAB_URL` | No | GitLab instance URL. Defaults to `https://gitlab.com`. Set for self-hosted instances. |

### Bitbucket

| Variable | Required | Description |
|----------|----------|-------------|
| `BITBUCKET_USER` | Yes | Bitbucket username. |
| `BITBUCKET_APP_PASSWORD` | Yes | App password with `pullrequests:write` and `issues:write` permissions. |
| `BITBUCKET_WORKSPACE` | Yes | Bitbucket workspace slug (formerly "team"). |
| `BITBUCKET_REPO_SLUG` | Yes | Repository slug. |

### Jenkins

| Variable | Required | Description |
|----------|----------|-------------|
| `JENKINS_URL` | Yes | Base URL of your Jenkins instance (e.g. `https://ci.example.com`). |
| `JENKINS_USER` | Yes | Jenkins username. |
| `JENKINS_TOKEN` | Yes | Jenkins API token (not password). Generate in Jenkins → User → Configure → API Token. |
| `JENKINS_JOB_NAME` | Yes | Job or pipeline name to poll (e.g. `my-app/main`). |

### Jira

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_URL` | Yes | Base URL of your Jira Cloud instance — e.g. `https://mycompany.atlassian.net`. No trailing slash. |
| `JIRA_EMAIL` | Yes | Atlassian account email used for Basic auth. |
| `JIRA_TOKEN` | Yes | API token. Create at [id.atlassian.com → Security → API tokens](https://id.atlassian.com/manage-profile/security/api-tokens). |
| `JIRA_PROJECT_KEY` | Yes | Jira project key (e.g. `ENG`, `PAY`). Shown next to the project name in Jira. |
| `JIRA_HOLD_ISSUE_TYPE` | No | Issue type for HOLD escalation tickets. Default: `Bug`. |
| `JIRA_HOLD_PRIORITY` | No | Priority for HOLD tickets. Default: `High`. |
| `JIRA_ADVISORY_ISSUE_TYPE` | No | Issue type for advisory finding tickets. Default: `Task`. |
| `JIRA_ADVISORY_PRIORITY` | No | Priority for advisory tickets. Default: `Medium`. |
| `JIRA_REVIEW_ISSUE_TYPE` | No | Issue type for review gate tickets. Default: `Task`. |

### Local

No environment variables required.

---

## Budget control

PACE tracks API token costs and can skip cron runs when a configurable daily limit is reached. Set these as **GitHub Actions repository variables** (Settings → Variables → Actions), not secrets.

| Variable | Who sets it | Description |
| -------- | ----------- | ----------- |
| `PACE_DAILY_BUDGET` | You | Maximum USD spend per calendar day. Set to `0` or leave unset for unlimited. Example: `15` |
| `PACE_REPORTER_TIMEZONE` | You | IANA timezone for the budget day rollover (e.g. `Asia/Kolkata`, `America/New_York`). Defaults to `UTC`. Should match `reporter.timezone` in `pace.config.yaml`. |
| `PACE_DAILY_SPEND` | PACE (auto) | Running total of estimated API spend today. Reset automatically at midnight in the configured timezone. **Do not set manually.** |
| `PACE_DAILY_SPEND_DATE` | PACE (auto) | ISO date when `PACE_DAILY_SPEND` was last updated. Used to detect day rollovers. **Do not set manually.** |
| `PACE_SPEND_TODAY` | pace.yml (auto) | Prior accumulated spend before the current run starts. Injected into the orchestrator by the budget-check step. Not a persistent variable — do not set manually. |

:::note
When `PACE_DAILY_BUDGET` is exceeded, the `Run PACE cycle` step is **skipped**, not failed. The current workflow run continues normally. Only subsequent cron triggers are blocked until the counter resets the next day.
:::

---

## Story scoping

PACE can automatically refine stories that are predicted to exceed a cost or complexity threshold before FORGE runs. Set these as **GitHub Actions repository variables**.

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `PACE_MAX_STORY_COST_USD` | `1.50` | If the SCOPE agent predicts a story will cost more than this (USD), PRIME is asked to refine or split it before FORGE runs. Raise to `2.00`+ for sprints with known high-complexity integration days. |
| `PACE_MAX_STORY_AC` | `5` | If a story has more acceptance criteria than this, PRIME is asked to reduce scope before FORGE runs. |

See [Proactive Story Scoping](/guides/story-scoping/) for how SCOPE and PRIME refinement interact.

Each completed run logs a per-model cost breakdown:

```text
[PACE] API usage this run:
  claude-haiku-4-5-20251001: 45,230 in + 8,912 out = $0.0718
  claude-sonnet-4-6: 124,500 in + 31,200 out = $0.8430
  Run total: $0.9148
[PACE] Daily spend updated: $2.14 (this run: $0.9148)
```

See [Control Daily API Spend](/guides/budget-cap/) for setup instructions.

---

## GitHub Actions integration

When running PACE inside a GitHub Actions workflow, most variables are provided automatically:

```yaml
# .github/workflows/pace.yml
jobs:
  pace:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r pace/requirements.txt
      - name: Run PACE Day ${{ inputs.day }}
        run: python pace/orchestrator.py --day ${{ inputs.day }}
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}   # auto-provided
          # GITHUB_REPOSITORY is auto-provided by Actions
```

---

## Setting variables locally

```bash
# Minimum for local development with Anthropic + local platform:
export ANTHROPIC_API_KEY="sk-ant-..."

# GitHub platform:
export GITHUB_TOKEN="ghp_..."
export GITHUB_REPOSITORY="my-org/my-repo"

# Verify all required vars are set:
python pace/pace/config.py --check-env
```

---

## Variable precedence

PACE reads variables in this order:
1. Process environment (`export VAR=...` or CI-injected)
2. `.env` file in the `pace/` directory (if python-dotenv is installed)

Never commit `.env` files or put credentials in `pace.config.yaml`.
