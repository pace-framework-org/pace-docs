---
title: Switch Platform
description: Configure PACE to work with GitHub, GitLab, Bitbucket, Jenkins, or fully locally.
sidebar:
  order: 3
---

PACE uses a platform adapter for CI polling, pull request creation, and issue tracking. Set `platform.type` in `pace.config.yaml` and export the required environment variables.

## GitHub (default)

```yaml
platform:
  type: github
```

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | Personal access token or GITHUB_TOKEN from Actions |
| `GITHUB_REPOSITORY` | `owner/repo-name` (e.g. `acme-corp/acme-api`) |

The token needs `repo` scope for private repositories, `public_repo` for public ones.

```bash
export GITHUB_TOKEN="ghp_..."
export GITHUB_REPOSITORY="acme-corp/acme-api"
pip install PyGithub
```

### GitHub Actions usage

When running inside a GitHub Actions workflow, `GITHUB_TOKEN` and `GITHUB_REPOSITORY` are automatically injected. No extra setup needed.

---

## GitLab

```yaml
platform:
  type: gitlab
```

| Variable | Description |
|----------|-------------|
| `GITLAB_TOKEN` | Project or Group access token with `api` scope |
| `GITLAB_PROJECT` | Project ID (integer) or namespace path (`group/project`) |
| `GITLAB_URL` | Optional — defaults to `https://gitlab.com` |

```bash
export GITLAB_TOKEN="glpat-..."
export GITLAB_PROJECT="my-group/my-project"
pip install python-gitlab
```

### GitLab CI/CD usage

```yaml
# .gitlab-ci.yml
pace:
  stage: dev
  script:
    - python pace/orchestrator.py --day $DAY
  variables:
    GITLAB_TOKEN: $CI_JOB_TOKEN
    GITLAB_PROJECT: $CI_PROJECT_ID
```

---

## Bitbucket

```yaml
platform:
  type: bitbucket
```

| Variable | Description |
|----------|-------------|
| `BITBUCKET_USER` | Your Bitbucket username |
| `BITBUCKET_APP_PASSWORD` | App password with `pullrequests:write` and `issues:write` permissions |
| `BITBUCKET_WORKSPACE` | Workspace slug (formerly "team") |
| `BITBUCKET_REPO_SLUG` | Repository slug |

```bash
export BITBUCKET_USER="jane"
export BITBUCKET_APP_PASSWORD="ATB..."
export BITBUCKET_WORKSPACE="acme-corp"
export BITBUCKET_REPO_SLUG="acme-api"
pip install requests
```

:::caution
Issues must be enabled on your Bitbucket repository (Settings → Issue tracker → Enable). Bitbucket Cloud Pipelines must also be enabled for CI polling to work.
:::

---

## Jenkins

```yaml
platform:
  type: jenkins
```

| Variable | Description |
|----------|-------------|
| `JENKINS_URL` | Base URL of your Jenkins instance (e.g. `https://ci.example.com`) |
| `JENKINS_USER` | Jenkins username |
| `JENKINS_TOKEN` | Jenkins API token |
| `JENKINS_JOB_NAME` | Job or pipeline name to poll |

```bash
export JENKINS_URL="https://ci.example.com"
export JENKINS_USER="admin"
export JENKINS_TOKEN="11abc..."
export JENKINS_JOB_NAME="acme-api/main"
pip install requests
```

:::note
Jenkins has no native SHA-indexed API. PACE inspects the 20 most recent builds and matches by `lastBuiltRevision.SHA1` (Git plugin) or `changeSet.items[].commitId`. Make sure the Git plugin is installed and your job records commit metadata.
:::

---

## Jira

```yaml
platform:
  type: jira
```

| Variable | Description |
|----------|-------------|
| `JIRA_URL` | Base URL of your Jira Cloud instance (e.g. `https://mycompany.atlassian.net`) |
| `JIRA_EMAIL` | Atlassian account email |
| `JIRA_TOKEN` | API token from [id.atlassian.com → Security → API tokens](https://id.atlassian.com/manage-profile/security/api-tokens) |
| `JIRA_PROJECT_KEY` | Jira project key (e.g. `ENG`, `PAY`) |

```bash
export JIRA_URL="https://mycompany.atlassian.net"
export JIRA_EMAIL="engineer@mycompany.com"
export JIRA_TOKEN="your-api-token"
export JIRA_PROJECT_KEY="ENG"
# requests is already in requirements.txt — no extra install needed
```

The Jira adapter handles HOLD escalation tickets and advisory issue push. It does **not** poll CI — use this adapter when Jira is your issue tracker but CI runs on a separate system (GitHub Actions, Jenkins, etc.). The `wait_for_commit_ci` step will return `no_runs` and be skipped.

Optional overrides:

```bash
export JIRA_HOLD_ISSUE_TYPE="Bug"         # default
export JIRA_HOLD_PRIORITY="High"          # default
export JIRA_ADVISORY_ISSUE_TYPE="Task"    # default
export JIRA_ADVISORY_PRIORITY="Medium"    # default
```

See [Connect PACE to Jira](/guides/jira-adapter/) for the full setup guide and troubleshooting.

---

## Local (no platform)

```yaml
platform:
  type: local
```

No credentials required. All platform artifacts are written to your local filesystem:

| Artifact | Location |
|----------|----------|
| PR description | `.pace/day-N/review-pr.md` |
| Escalation issue | `.pace/day-N/escalation-issue.md` |
| Job summary | `pace-summary.md` (repo root) |

CI result returns `{"conclusion": "no_runs"}` immediately. Use `local` for:
- Development and testing of PACE itself
- Air-gapped environments
- Demos without credentials

---

## Verifying your platform setup

Run the platform check:

```bash
python pace/pace/platforms/__init__.py --check
```

This attempts to connect to your configured platform and reports any credential or permission issues before you run a full day.
