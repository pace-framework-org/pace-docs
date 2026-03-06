---
title: Platform Adapters
description: How PACE abstracts CI/CD and Git hosting platforms behind a common interface.
sidebar:
  order: 4
---

PACE needs to interact with your Git hosting platform for five operations: opening pull requests, filing escalation issues, pushing advisory findings, polling CI results, and writing job summaries. The **PlatformAdapter** interface abstracts all of these behind a common API so that PACE works the same way on GitHub, GitLab, Bitbucket, Jenkins, Jira, or fully locally.

## Why a platform adapter?

Without an adapter layer, every agent that needed CI data or wanted to open a PR would contain GitHub-specific code. Switching platforms would require changes across multiple files. The adapter pattern isolates all platform-specific logic into a single module, keeping agents clean and testable.

## The interface

```python
class PlatformAdapter(ABC):

    def open_review_pr(self, day: int, pace_dir: Path) -> str:
        """Create a PR/MR for a human gate day. Returns the PR/MR URL."""

    def open_escalation_issue(self, day: int, day_dir: Path) -> str:
        """Open a blocking ticket when all retries are exhausted. Returns URL."""

    def push_advisory_items(self, day: int, items: list[dict], agent: str) -> str:
        """Open a non-blocking ticket for backlisted advisory findings. Returns URL.
        Only called when advisory.push_to_issues: true in pace.config.yaml."""

    def wait_for_commit_ci(
        self,
        sha: str,
        timeout_minutes: int = 15,
        poll_interval: int = 20,
    ) -> dict:
        """Poll CI until the build for `sha` completes. Returns a result dict."""

    def post_daily_summary(self, day: int, gate_report: dict) -> None:
        """Post a status update to the platform (comment, badge, etc.)."""

    def write_job_summary(self, markdown: str) -> None:
        """Write the markdown job summary to a platform-appropriate location."""
```

## CI result dictionary

`wait_for_commit_ci` returns a dictionary that GATE uses to evaluate CI-related acceptance criteria:

```python
{
    "conclusion": "success",      # "success" | "failure" | "timeout" | "no_runs"
    "name": "CI / test",          # workflow/pipeline name
    "sha": "abc123def456",        # commit SHA polled
    "url": "https://..."          # link to the CI run
}
```

GATE treats:
- `"success"` → PASS for CI criteria
- `"failure"` → FAIL
- `"timeout"` or `"no_runs"` → PARTIAL (if out_of_scope) or FAIL

## Available adapters

### JiraAdapter

Uses the Jira Cloud REST API v3 with Basic Auth (email + API token).

- **Review gate**: `POST /rest/api/3/issue` — creates a Task with sprint summary
- **HOLD escalation**: `POST /rest/api/3/issue` — creates a Bug with full YAML artifacts
- **Advisory findings**: `POST /rest/api/3/issue` — creates a Task per backlisted batch (requires `advisory.push_to_issues: true`)
- **CI**: not supported — returns `{"conclusion": "no_runs"}` immediately
- **Job summary**: writes to `pace-summary.md`

Descriptions use [Atlassian Document Format (ADF)](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/) with syntax-highlighted YAML code blocks.

See [Connect PACE to Jira](/guides/jira-adapter/) for setup.

### GitHubAdapter

Uses [PyGithub](https://pygithub.readthedocs.io/) to interact with the GitHub API.

- **PRs**: `repo.create_pull()` — creates a pull request from the current branch to main
- **Issues**: `repo.create_issue()` — files an issue with the escalation content
- **CI**: polls `repo.get_workflow_runs(head_sha=sha)` until a terminal status
- **Job summary**: writes to `$GITHUB_STEP_SUMMARY` (visible in Actions UI)

### GitLabAdapter

Uses [python-gitlab](https://python-gitlab.readthedocs.io/) to interact with the GitLab API.

- **MRs**: `project.mergerequests.create()` — creates a merge request
- **Issues**: `project.issues.create()` — files an issue
- **CI**: polls `project.pipelines.list(sha=sha)` until terminal status
- **Job summary**: writes to `$CI_JOB_SUMMARY` or a fallback file

### BitbucketAdapter

Uses the Bitbucket Cloud REST API v2 with Basic Auth (username + app password).

- **PRs**: `POST /2.0/repositories/{workspace}/{slug}/pullrequests`
- **Issues**: `POST /2.0/repositories/{workspace}/{slug}/issues`
- **CI**: polls `GET /2.0/repositories/{workspace}/{slug}/pipelines/?target.commit.hash={sha}`
- **Job summary**: writes to `pace-summary.md`

:::note
Bitbucket requires Issues to be enabled on the repository (Settings → Issue tracker). Bitbucket Cloud Pipelines must also be enabled for CI polling.
:::

### JenkinsAdapter

Uses the Jenkins REST API.

- **PRs / Issues**: writes to local files (Jenkins has no native PR/issue concept)
- **CI**: Jenkins has no SHA-indexed API — inspects the 20 most recent builds, matching by `lastBuiltRevision.SHA1` (Git plugin) or `changeSet.items[].commitId`
- **Job summary**: writes to `jenkins-summary.md`

:::note
CI polling requires the Jenkins Git plugin to be installed and your job to record commit metadata.
:::

### LocalAdapter

No external calls. Useful for development, demos, and air-gapped environments.

- **PRs**: writes PR description to `.pace/day-N/review-pr.md`
- **Issues**: writes issue content to `.pace/day-N/escalation-issue.md`
- **CI**: returns `{"conclusion": "no_runs"}` immediately
- **Job summary**: writes to `pace-summary.md`

## How the adapter is selected

The orchestrator calls the factory function:

```python
from platforms import get_platform_adapter

platform = get_platform_adapter()  # reads cfg.platform_type
```

The factory reads `platform.type` from `pace.config.yaml` and instantiates the correct adapter. Credentials always come from environment variables — never from the config file.

## Implementing a custom adapter

See [Add a New Platform](/guides/add-a-new-platform/) for a step-by-step guide to implementing and registering a custom `PlatformAdapter`.
