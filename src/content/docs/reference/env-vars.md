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

### Local

No environment variables required.

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
