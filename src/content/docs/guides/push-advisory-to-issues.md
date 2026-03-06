---
title: Push Advisory Findings to Issue Trackers
description: Configure PACE to automatically open issues in GitHub, GitLab, Bitbucket, or Jira when advisory findings are backlisted.
---

By default, advisory findings from SENTINEL and CONDUIT accumulate in a local file (`.pace/advisory_backlog.yaml`) and are cleared on designated clearance days. This guide shows you how to enable automatic issue creation so advisory findings also appear in your team's issue tracker.

## How advisory issue push works

When SENTINEL or CONDUIT raises an advisory finding that is not resolved after one retry, the orchestrator:

1. Adds the finding to `.pace/advisory_backlog.yaml` (always — regardless of this setting)
2. If `advisory.push_to_issues: true` — opens an issue/ticket in the configured platform with the full finding details and resolution instructions

Advisory issues are distinct from HOLD escalation issues:

| | Advisory issue | HOLD escalation issue |
|---|---|---|
| **Trigger** | Finding persists after one retry | All retries exhausted, sprint blocked |
| **Blocking** | No — sprint continues | Yes — `PACE_PAUSED=true` |
| **Created by** | `push_advisory_items()` | `open_escalation_issue()` |
| **Default** | Off — opt in with config | Always on |

## Enable advisory push

In `pace/pace.config.yaml`, set:

```yaml
advisory:
  push_to_issues: true
```

That's all. No other code changes are needed. The correct push implementation is selected automatically based on your `platform.type`.

## What the issue looks like

### GitHub

An issue is opened with:
- **Title**: `PACE Advisory [SENTINEL] Day 3 — 2 finding(s)`
- **Labels**: `pace-advisory`, `pace-sentinel`, `day-3`
- **Body**: full list of findings with IDs, a link to the clearance day process, and resolution steps

Labels are created automatically by GitHub if they don't exist. To pre-create them with custom colours, see the [GitHub Labels API](https://docs.github.com/en/rest/issues/labels).

### GitLab

An issue is opened with:
- **Title**: `PACE Advisory [CONDUIT] Day 5 — 1 finding(s)`
- **Labels**: `pace-advisory`, `pace-conduit`

### Bitbucket

An issue of kind `enhancement` and priority `major` is opened. Issues must be enabled on the Bitbucket repository (Settings → Issue tracker).

### Jira

A Jira task is created with:
- **Summary**: `[PACE Advisory] SENTINEL Day 3 — 2 finding(s)`
- **Labels**: `pace-advisory`, `pace-sentinel`, `pace-day-3`
- **Priority**: Medium (configurable via `JIRA_ADVISORY_PRIORITY` env var)
- **Issue type**: Task (configurable via `JIRA_ADVISORY_ISSUE_TYPE` env var)

### Jenkins / Local

Advisory findings are written to `.pace/advisory-day{N}-{agent}.md`. Jenkins and local mode do not have issue trackers, so file output is the only option.

## Required credentials per platform

Each platform requires credentials already used by the main platform adapter. No additional credentials are needed.

| Platform | Required env vars |
|---|---|
| GitHub | `GITHUB_TOKEN`, `GITHUB_REPOSITORY` |
| GitLab | `GITLAB_TOKEN`, `GITLAB_PROJECT` |
| Bitbucket | `BITBUCKET_USER`, `BITBUCKET_APP_PASSWORD`, `BITBUCKET_WORKSPACE`, `BITBUCKET_REPO_SLUG` |
| Jira | `JIRA_URL`, `JIRA_EMAIL`, `JIRA_TOKEN`, `JIRA_PROJECT_KEY` |

## Avoiding issue noise

Advisory push creates one issue per batch per agent per day. On a day where both SENTINEL and CONDUIT raise advisories that get backlisted, you'll see at most two new issues.

To reduce noise further:
- Fix advisory findings within one day so they never get backlisted — SENTINEL/CONDUIT give FORGE one retry before backlisting
- Use clearance days aggressively — advisories cleared on a clearance day are removed from the backlog and closed in the issue tracker on the next push (issues already open are not auto-closed; close them manually after verifying the fix)

## Filtering advisory issues in your tracker

All advisory issues carry the `pace-advisory` label. In GitHub you can save a filtered view:

```
is:issue label:pace-advisory is:open
```

In Jira, create a saved filter:

```
project = MYPROJ AND labels = "pace-advisory" AND status != Done ORDER BY created DESC
```
