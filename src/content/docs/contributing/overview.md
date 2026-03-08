---
title: Contributing to PACE
description: What to contribute, where things live, and how the project is organised.
sidebar:
  order: 1
---

PACE Framework is open source and welcomes contributions. This section covers everything you need to go from first clone to merged pull request.

## What you can contribute

| Type | Examples |
|------|---------|
| **Bug fixes** | Incorrect agent output parsing, broken CI adapter, config edge cases |
| **New platform adapters** | Azure DevOps, CircleCI, Gitea |
| **New LLM adapters** | Cohere, Mistral-native, local Ollama improvements |
| **Documentation** | Clearer explanations, new tutorials, fix typos |
| **Tests** | Unit tests for agents, adapter integration tests |
| **Config schema** | New fields in `pace.config.yaml` with sensible defaults |

## What belongs in pace-framework-starter

`pace-framework-starter` is the framework template itself. Contributions here must be **generic** — they should work for any project using PACE, not just one specific product.

If you have built something on top of PACE that is specific to your product, that belongs in your own repository.

## Repository layout

```
pace-framework-starter/
├── pace/
│   ├── agents/          ← PRIME, FORGE, GATE, SENTINEL, CONDUIT, SCRIBE
│   ├── platforms/       ← CI/Git hosting adapters (GitHub, GitLab, …)
│   ├── llm/             ← LLM adapters (Anthropic, LiteLLM)
│   ├── orchestrator.py  ← daily cycle runner
│   ├── reporter.py      ← PROGRESS.md + job summary writer
│   ├── config.py        ← PaceConfig dataclass + loader
│   ├── advisory.py      ← advisory backlog management
│   ├── preflight.py     ← SCRIBE context document checks
│   ├── schemas.py       ← JSON schemas for agent outputs
│   ├── pace.config.yaml ← default configuration template
│   └── plan.yaml        ← sprint plan template
├── CONTRIBUTING.md
└── LICENSE
```

## Before you start

- Check [open issues](https://github.com/pace-framework-org/pace-framework-starter/issues) before starting work — someone may already be on it
- For anything beyond a small bug fix, open an issue first and describe what you intend to change
- Look for issues tagged [`good first issue`](https://github.com/pace-framework-org/pace-framework-starter/issues?q=label%3A%22good+first+issue%22) if you want a guided starting point

## Next steps

- [Dev Environment Setup](/contributing/dev-setup/) — clone, install, run
- [Commit Signing](/contributing/commit-signing/) — required before you can push
- [Submit a PR](/contributing/submit-a-pr/) — branch, commit, review, merge
