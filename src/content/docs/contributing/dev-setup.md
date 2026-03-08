---
title: Dev Environment Setup
description: Clone pace-framework-starter, install dependencies, and verify your setup before making changes.
sidebar:
  order: 2
---

This page walks you through getting a local copy of PACE that you can modify and test.

## Prerequisites

- Python 3.12
- Git
- An Anthropic API key (or another supported LLM provider key)

## 1 — Fork and clone

Fork the repository on GitHub, then clone your fork:

```bash
git clone https://github.com/<your-username>/pace-framework-starter.git
cd pace-framework-starter
```

Add the upstream remote so you can pull future changes:

```bash
git remote add upstream https://github.com/pace-framework-org/pace-framework-starter.git
```

## 2 — Create a virtual environment

```bash
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
```

## 3 — Install dependencies

```bash
pip install -r pace/requirements.txt
```

For development you may also want the full set of optional adapters:

```bash
# All LLM providers
pip install anthropic litellm

# All platform adapters
pip install PyGithub python-gitlab requests
```

## 4 — Configure PACE

Copy the config template:

```bash
cp pace/pace.config.yaml pace/pace.config.yaml.bak   # optional backup
```

At minimum, set:

```yaml
product:
  name: "Test Project"
  description: "Local dev test"
  github_org: "your-org"

platform:
  type: local    # no GitHub token needed for local testing

llm:
  provider: anthropic
  model: claude-sonnet-4-6
```

## 5 — Set your API key

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

## 6 — Smoke test

Verify the orchestrator imports cleanly:

```bash
python -c "from pace.orchestrator import main; print('OK')"
```

Run the test suite:

```bash
pytest -v --tb=short
```

All tests should pass before you make any changes. If something fails out of the box, open an issue.

## Keeping your fork up to date

Before starting any new branch, pull the latest from upstream:

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

## Next steps

- [Commit Signing](/contributing/commit-signing/) — configure signed commits before your first push
- [Submit a PR](/contributing/submit-a-pr/) — branch, commit, and open a pull request
