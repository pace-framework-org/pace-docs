---
title: Submit a Pull Request
description: Full walkthrough of branching, committing, and opening a pull request against pace-framework-starter.
sidebar:
  order: 4
---

This page walks through the complete workflow from picking up an issue to getting your changes merged.

## Before you begin

- Your [dev environment is set up](/contributing/dev-setup/)
- [Commit signing is configured](/contributing/commit-signing/)
- You have forked the repo and added the `upstream` remote

## 1 — Pick an issue

Browse [open issues](https://github.com/pace-framework-org/pace-framework-starter/issues). Issues labelled [`good first issue`](https://github.com/pace-framework-org/pace-framework-starter/issues?q=label%3A%22good+first+issue%22) are well-scoped with clear acceptance criteria.

Leave a comment on the issue to let others know you are working on it.

## 2 — Create a branch

Branch from the latest `main`:

```bash
git fetch upstream
git checkout main
git merge upstream/main
git checkout -b fix/short-description     # or feat/short-description
```

Branch naming conventions:

| Prefix | Use for |
|--------|---------|
| `fix/` | Bug fixes |
| `feat/` | New features or adapters |
| `docs/` | Documentation-only changes |
| `refactor/` | Code changes with no behaviour change |

## 3 — Make your changes

Keep changes focused. A PR should do one thing. If you find a separate bug while working, open a separate issue (or separate PR).

Run the test suite after each meaningful change:

```bash
pytest -v --tb=short
```

If you are adding a new feature, add tests alongside it.

## 4 — Commit your changes

All commits must be signed (see [Commit Signing](/contributing/commit-signing/)). With signing configured globally, commits are signed automatically:

```bash
git add pace/your-changed-file.py
git commit -m "fix: describe what the fix does and why"
```

Commit message conventions:

| Prefix | When to use |
|--------|-------------|
| `fix:` | Bug fix |
| `feat:` | New feature or adapter |
| `docs:` | Documentation only |
| `refactor:` | Internal restructure, no behaviour change |
| `test:` | Adding or fixing tests only |

Keep the subject line under 72 characters. If more context is needed, add a blank line then a body paragraph.

## 5 — Push to your fork

```bash
git push -u origin fix/short-description
```

## 6 — Open the pull request

Go to your fork on GitHub. You will see a banner offering to open a pull request — click it.

**Title:** Match your commit message prefix and keep it under 70 characters.

**Description:** Use this format:

```
## What this changes
- One-line summary of each change

## Why
Brief explanation of the problem being solved.

## How to test
Steps a reviewer can follow to verify the fix.
```

The PR will run CI automatically. All checks must pass before review.

## 7 — Respond to review

Reviewers may request changes. Push additional commits to the same branch — do not force-push after a review has started, as it discards review comments.

```bash
# Make the requested change
git add pace/your-changed-file.py
git commit -m "fix: address review feedback"
git push
```

## 8 — After merge

Once merged, delete your branch:

```bash
git checkout main
git branch -d fix/short-description
git push origin --delete fix/short-description
```

Sync your fork:

```bash
git fetch upstream
git merge upstream/main
git push origin main
```

---

## Useful links

- [Add a New Platform](/guides/add-a-new-platform/) — guide for implementing a platform adapter
- [Add a New LLM Provider](/guides/add-a-new-llm/) — guide for implementing an LLM adapter
- [Open issues](https://github.com/pace-framework-org/pace-framework-starter/issues)
