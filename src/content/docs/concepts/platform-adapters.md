---
title: Platform Adapters
description: How PACE integrates with CI/CD platforms and issue trackers using two separate adapter interfaces.
---

# Platform Adapters

PACE uses two separate adapter interfaces to decouple CI/CD operations from issue tracking. This lets you mix platforms — for example, running CI on Bitbucket Pipelines while tracking sprints in Jira.

## Two Adapter Types

### CIAdapter — CI/CD and Git Hosting

Handles everything related to code review and pipeline feedback:

| Method | Purpose |
| --- | --- |
| `open_review_pr(day, pace_dir)` | Open a PR/MR for a human gate day |
| `wait_for_commit_ci(sha, ...)` | Poll CI until the commit reaches a terminal state |
| `post_daily_summary(day, gate_report)` | Post a one-line status update |
| `write_job_summary(markdown)` | Write the full report to the job/run UI |
| `set_variable(name, value)` | Update a CI/CD pipeline variable (e.g. `PACE_PAUSED`) |

### TrackerAdapter — Sprint Tracker / Issue Platform

Handles escalations and advisory findings:

| Method | Purpose |
| --- | --- |
| `open_escalation_issue(day, day_dir, hold_reason)` | Open a ticket when FORGE exhausts all retries |
| `push_advisory_items(day, items, agent)` | Open a ticket for backlisted advisory findings |

## Configuration

Set both adapters in `pace.config.yaml`:

```yaml
platform:
  # CI/CD platform — handles PRs/MRs, CI polling, and job summaries.
  # Supported values: github | gitlab | bitbucket | jenkins | local
  ci: github

  # Sprint tracker — handles HOLD escalations and advisory findings.
  # Supported values: jira | github | gitlab | bitbucket | local
  tracker: github
```

You can mix platforms:

```yaml
platform:
  ci: bitbucket   # CI/CD via Bitbucket Pipelines
  tracker: jira   # Sprint tracking via Jira Cloud
```

### Legacy Config

The old `platform.type` key is still supported and sets both adapters to the same platform:

```yaml
platform:
  type: github   # sets both ci and tracker to github
```

## Supported Platforms

### CI Adapters

| Platform | `ci:` value | Environment Variables |
| --- | --- | --- |
| GitHub Actions | `github` | `GITHUB_TOKEN`, `GITHUB_REPOSITORY` |
| GitLab CI | `gitlab` | `GITLAB_TOKEN`, `GITLAB_PROJECT`, `GITLAB_URL` (optional) |
| Bitbucket Pipelines | `bitbucket` | `BITBUCKET_API_TOKEN`, `BITBUCKET_WORKSPACE`, `BITBUCKET_REPO_SLUG` |
| Jenkins | `jenkins` | `JENKINS_URL`, `JENKINS_USER`, `JENKINS_TOKEN`, `JENKINS_JOB_NAME` |
| Local (no CI) | `local` | none |

### Tracker Adapters

| Platform | `tracker:` value | Environment Variables |
| --- | --- | --- |
| Jira Cloud | `jira` | `JIRA_URL`, `JIRA_EMAIL`, `JIRA_TOKEN`, `JIRA_PROJECT_KEY` |
| GitHub Issues | `github` | `GITHUB_TOKEN`, `GITHUB_REPOSITORY` |
| GitLab Issues | `gitlab` | `GITLAB_TOKEN`, `GITLAB_PROJECT`, `GITLAB_URL` (optional) |
| Bitbucket Issues | `bitbucket` | `BITBUCKET_API_TOKEN`, `BITBUCKET_WORKSPACE`, `BITBUCKET_REPO_SLUG` |
| Local (files only) | `local` | none |

> **Bitbucket Issues note:** Bitbucket's built-in issue tracker is basic (no sprints or epics). For sprint-level tracking, use `tracker: jira` alongside `ci: bitbucket`.

### Valid Combinations

| Use case | `ci:` | `tracker:` |
| --- | --- | --- |
| Pure GitHub | `github` | `github` |
| Pure GitLab | `gitlab` | `gitlab` |
| Bitbucket + Jira | `bitbucket` | `jira` |
| Jenkins + Jira | `jenkins` | `jira` |
| Jenkins + GitHub Issues | `jenkins` | `github` |
| Local development | `local` | `local` |

## Jenkins Notes

Jenkins has no native PR or issue tracking. The `JenkinsCIAdapter`:
- Writes review gates to local `.md` files instead of opening PRs
- Polls build status via the Jenkins REST API (requires Jenkins Git plugin)

For issue tracking alongside Jenkins, configure a separate tracker platform (e.g. `tracker: jira`).

## Jira Notes

Jira is a tracker-only platform. It cannot run CI pipelines or host PRs. Always pair `tracker: jira` with a CI platform:

```yaml
platform:
  ci: github     # or gitlab, bitbucket, jenkins
  tracker: jira
```