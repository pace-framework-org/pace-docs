---
title: Connect PACE to Jira
description: Use the Jira Cloud adapter to open escalation tickets and advisory issues in your Jira project.
---

The Jira adapter routes PACE's issue operations — HOLD escalations and advisory findings — to Jira Cloud. It uses the Jira REST API v3 and does not require any additional Python packages beyond `requests`, which is already in `requirements.txt`.

## What the Jira adapter does (and does not) do

| Operation | Jira adapter |
|---|---|
| Open escalation ticket on HOLD | Yes — creates a Jira Bug |
| Open advisory issue when findings are backlisted | Yes — creates a Jira Task (requires `advisory.push_to_issues: true`) |
| Open review gate ticket on human gate days | Yes — creates a Jira Task |
| Wait for CI status | No — Jira has no CI; returns `no_runs` |
| Write job summary | Yes — writes to `pace-summary.md` in repo root |

**Jira does not replace your CI system.** If you use Jira for issue tracking but GitHub Actions or Jenkins for CI, set `platform.type: jira` only for the issue operations and configure your CI separately. The `wait_for_commit_ci` step will be a no-op.

## Prerequisites

1. A Jira Cloud account at `https://yourcompany.atlassian.net`
2. An API token — create one at [id.atlassian.com → Security → API tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
3. A Jira project where PACE can create issues (you need the "Create Issues" permission)
4. The project key (shown next to the project name in Jira, e.g. `ENG`, `PAY`, `OPS`)

## Configuration

### pace.config.yaml

```yaml
platform:
  type: jira

advisory:
  push_to_issues: true   # open a Jira task for each backlisted advisory batch
```

### Environment variables

Set these in your CI secrets (GitHub Actions: repository secrets; Jenkins: credentials; local: `.env`):

```bash
JIRA_URL=https://mycompany.atlassian.net   # no trailing slash
JIRA_EMAIL=engineer@mycompany.com           # Atlassian account email
JIRA_TOKEN=your-api-token                   # from id.atlassian.com
JIRA_PROJECT_KEY=ENG                        # Jira project key
```

Optional overrides for issue types and priorities:

```bash
JIRA_HOLD_ISSUE_TYPE=Bug        # default: Bug
JIRA_HOLD_PRIORITY=High         # default: High
JIRA_ADVISORY_ISSUE_TYPE=Task   # default: Task
JIRA_ADVISORY_PRIORITY=Medium   # default: Medium
JIRA_REVIEW_ISSUE_TYPE=Task     # default: Task
```

### GitHub Actions example

Add to your repository secrets and reference them in `.github/workflows/pace.yml`:

```yaml
env:
  JIRA_URL: ${{ secrets.JIRA_URL }}
  JIRA_EMAIL: ${{ secrets.JIRA_EMAIL }}
  JIRA_TOKEN: ${{ secrets.JIRA_TOKEN }}
  JIRA_PROJECT_KEY: ${{ secrets.JIRA_PROJECT_KEY }}
```

## How tickets are structured

### HOLD escalation (Bug)

When PACE exhausts all retries on a day, it opens a Jira Bug:

- **Summary**: `[PACE HOLD] Day 3 — test_payment_capture failed: assertion error on line 47`
- **Priority**: High
- **Labels**: `pace-hold`, `pace-day-3`
- **Description** (ADF): full story card YAML, FORGE handoff note, GATE report, and a "To Resume" checklist

The loop sets `PACE_PAUSED=true` after opening the ticket. To resume, resolve the blocker and re-trigger the workflow.

### Advisory finding (Task)

When an advisory finding persists after one retry (with `advisory.push_to_issues: true`):

- **Summary**: `[PACE Advisory] SENTINEL Day 5 — 2 finding(s)`
- **Priority**: Medium
- **Labels**: `pace-advisory`, `pace-sentinel`, `pace-day-5`
- **Description** (ADF): list of findings with their IDs, and a clearance-day resolution guide

### Review gate (Task)

On a human gate day (days marked `human_gate: true` in `plan.yaml`):

- **Summary**: `[PACE Review Gate] Days 1–14`
- **Labels**: `pace-review`, `pace-day-14`
- **Description** (ADF): SHIP rate, deferred criteria table, and a "To Resume" note

Unlike GitHub/GitLab where the review gate is a PR/MR, Jira creates a Task ticket. After the team reviews and approves, close the ticket and re-trigger the workflow.

## Description format

The Jira adapter uses the [Atlassian Document Format (ADF)](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/) for issue descriptions. YAML content appears in syntax-highlighted code blocks. Headings, bullet lists, and horizontal rules are rendered as native Jira formatting.

## Filtering PACE tickets in Jira

Use JQL to find all PACE-related issues in your project:

```
project = ENG AND labels = "pace-hold" AND status != Done ORDER BY created DESC
```

```
project = ENG AND labels = "pace-advisory" ORDER BY created DESC
```

To create a board column for PACE escalations, filter by `label = "pace-hold"`.

## Combining Jira with Jenkins CI

A common enterprise setup: Jenkins for CI polling, Jira for issue tracking. PACE supports this by setting up two things:

1. Set `platform.type: jira` — all issue operations go to Jira
2. PACE will skip CI polling (Jira adapter returns `no_runs` for `wait_for_commit_ci`)

If you need CI polling alongside Jira, implement a custom adapter that combines `JenkinsAdapter` for CI polling with `JiraAdapter` for issue creation. See the [Add a New Platform](/guides/add-a-new-platform/) guide for how to build a custom adapter.

## Troubleshooting

**`403 Forbidden` when creating issues**
The API token does not have permission to create issues in the project. Check the project's permission scheme in Jira → Project Settings → Permissions.

**`400 Bad Request` with `issuetype`**
The issue type name in `JIRA_HOLD_ISSUE_TYPE` or `JIRA_ADVISORY_ISSUE_TYPE` does not exist in your project. Common names are `Bug`, `Task`, `Story`, `Improvement`. Check your project's issue type scheme in Jira → Project Settings → Issue types.

**Labels not appearing on issues**
Jira Cloud allows labels by default. If labels are missing, check that the "Labels" field is included in your project's field configuration scheme.

**`JIRA_URL` format errors**
Use the full base URL without a trailing slash: `https://mycompany.atlassian.net`. Do not include `/jira` or any path suffix.
