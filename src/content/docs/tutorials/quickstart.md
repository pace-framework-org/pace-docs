---
title: Quickstart
description: Get PACE running against your repository in under 10 minutes.
sidebar:
  order: 1
---

This guide takes you from zero to a working PACE setup. By the end you will have PACE installed, configured, a sprint plan written, and Day 0 (planning) complete — with per-story cost estimates pre-populated in `PROGRESS.md` and Day 1 ready to run.

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

## 6 — Run Day 0 (sprint planning)

Day 0 is the planning phase. It estimates the cost of every story in your sprint plan and pre-populates `PROGRESS.md` — no code is written.

```bash
PACE_DAY=0 python pace/orchestrator.py
```

PACE will call the **PLANNER** agent once per sprint day (~$0.005 each) and produce:

- `.pace/day-0/planner.md` — per-day cost estimates + sprint total
- `PROGRESS.md` — pre-filled with **Est. Cost** column for every day

Example output:

```text
[PACE] Day 0: Estimating cost for 5 sprint days...
[PACE]   Day 1: ~$0.45 — Simple scaffold with 1-2 files.
[PACE]   Day 2: ~$0.80 — Medium complexity with flag wiring.
[PACE]   Day 3: ~$0.55 — Straightforward delta calculation.
[PACE]   Day 4: ~$0.50 — Two code paths, one test fixture.
[PACE]   Day 5: ~$1.10 — End-to-end integration, more files.
[PACE] Day 0: Total estimated sprint cost: $3.40
```

See [Day 0 — Sprint Planning](/guides/day-zero/) for details.

## 7 — Run Day 1

```bash
PACE_DAY=1 python pace/orchestrator.py
```

PACE will:
1. **PRIME** — generate today's Story Card from your plan
2. **FORGE** — implement the code using an AI tool loop
3. **GATE** — run your tests and evaluate acceptance criteria
4. **SENTINEL** — check for security and reliability issues
5. **CONDUIT** — review your CI/CD configuration
6. **SCRIBE** — update documentation and context files

All outputs are saved to `.pace/day-1/`. After Day 1 ships, `PROGRESS.md` is updated with the actual FORGE cost alongside the Day 0 estimate.

## What's next?

- [Your First Sprint](/tutorials/first-sprint/) — full walkthrough of a 5-day sprint
- [Day 0 — Sprint Planning](/guides/day-zero/) — cost estimation deep dive
- [The PACE Pipeline](/concepts/pipeline/) — understand how agents communicate
- [pace.config.yaml Reference](/reference/pace-config-yaml/) — every configuration field
