---
title: Quickstart
description: Get PACE running against your repository in under 10 minutes.
sidebar:
  order: 1
---

This guide takes you from zero to a working PACE setup. By the end you will have PACE installed, configured, and ready to run Day 1 of a sprint.

## Prerequisites

- Python 3.11 or 3.12
- A git repository with at least one commit
- An API key for your chosen LLM provider (default: Anthropic)

## 1 — Clone PACE into your project

PACE lives in a `pace/` subdirectory at the root of your repository:

```bash
# From your repo root
git clone https://github.com/pace-framework-org/pace-framework-starter pace
```

Your directory structure will look like:

```
your-repo/
├── pace/               ← PACE lives here
│   ├── pace.config.yaml
│   ├── pace/           ← Python package
│   └── ...
├── src/                ← your source code
└── ...
```

## 2 — Install dependencies

```bash
cd pace
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install core + your LLM provider + your platform adapter:
pip install PyYAML jsonschema

# Anthropic (default):
pip install anthropic

# GitHub (default platform):
pip install PyGithub
```

See [Environment Variables](/reference/env-vars/) for the full credential reference.

## 3 — Set your API key

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

For other LLM providers, see [Switch LLM Provider](/guides/switch-llm-provider/).

## 4 — Configure PACE

Copy and edit the configuration file:

```bash
cp pace/pace.config.yaml.example pace/pace.config.yaml
```

At minimum, fill in:

```yaml
product:
  name: "My App"
  description: >
    A one-paragraph description of your product, who it serves, and what problem it solves.
  github_org: "my-org"

tech:
  primary_language: "Python 3.12"
  test_command: "pytest -v --tb=short"

platform:
  type: local   # no GitHub token needed to start

llm:
  provider: anthropic
  model: claude-sonnet-4-6
```

See [Configure Your Project](/guides/configure-your-project/) for all available fields.

## 5 — Write a sprint plan

Create `.pace/plan.yaml` at your repo root:

```yaml
sprint:
  goal: "Add user authentication to the API"
  duration_days: 5

days:
  - day: 1
    theme: "Core auth models and JWT token generation"
    stories:
      - title: "User model with hashed passwords"
        acceptance_criteria:
          - "User.create() stores bcrypt-hashed password"
          - "User.verify_password() returns True for correct password"
          - "All criteria covered by unit tests"
        out_of_scope:
          - "OAuth / social login"
  - day: 2
    theme: "Login and token endpoints"
    stories:
      - title: "POST /auth/login returns signed JWT"
        acceptance_criteria:
          - "Returns 200 + token for valid credentials"
          - "Returns 401 for invalid credentials"
          - "Token expires in 24 hours"
```

See [Write a Sprint Plan](/guides/write-a-sprint-plan/) for the full plan format.

## 6 — Run Day 1

```bash
cd pace
python pace/orchestrator.py --day 1
```

PACE will:
1. **PRIME** — generate today's Story Card from your plan
2. **FORGE** — implement the code using an AI tool loop
3. **GATE** — run your tests and evaluate acceptance criteria
4. **SENTINEL** — check for security and reliability issues
5. **CONDUIT** — review your CI/CD configuration
6. **SCRIBE** — update documentation and context files

All outputs are saved to `.pace/day-1/`.

## What's next?

- [Your First Sprint](/tutorials/first-sprint/) — full walkthrough of a 5-day sprint
- [The PACE Pipeline](/concepts/pipeline/) — understand how agents communicate
- [pace.config.yaml Reference](/reference/pace-config-yaml/) — every configuration field
