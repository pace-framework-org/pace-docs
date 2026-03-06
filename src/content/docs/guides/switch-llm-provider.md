---
title: Switch LLM Provider
description: Change the AI model powering PACE agents — from Claude to GPT-4o, Gemini, Bedrock, Ollama, and more.
sidebar:
  order: 2
---

PACE ships with two LLM adapters:

- **`anthropic`** — direct Anthropic SDK integration (default)
- **`litellm`** — routes to 100+ providers via [LiteLLM](https://docs.litellm.ai/)

## Switching to a different Anthropic model

```yaml
# pace/pace.config.yaml
llm:
  provider: anthropic
  model: claude-opus-4-6      # or claude-haiku-4-5-20251001
```

Set your key:
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

## Switching to OpenAI (GPT-4o)

```yaml
llm:
  provider: litellm
  model: openai/gpt-4o
```

```bash
export LLM_API_KEY="sk-..."
pip install litellm
```

## Switching to Google Gemini

```yaml
llm:
  provider: litellm
  model: gemini/gemini-2.0-flash
```

```bash
export LLM_API_KEY="AIza..."
pip install litellm
```

## Switching to AWS Bedrock

```yaml
llm:
  provider: litellm
  model: bedrock/anthropic.claude-sonnet-4-6
```

```bash
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_REGION_NAME="us-east-1"
pip install litellm boto3
```

No `LLM_API_KEY` needed — LiteLLM uses your AWS credentials directly.

## Switching to Azure OpenAI

```yaml
llm:
  provider: litellm
  model: azure/gpt-4o
```

```bash
export LLM_API_KEY="..."          # Azure API key
export AZURE_API_BASE="https://my-deployment.openai.azure.com"
export AZURE_API_VERSION="2024-02-01"
pip install litellm
```

## Switching to local Ollama

```yaml
llm:
  provider: litellm
  model: ollama/llama3.1
  base_url: "http://localhost:11434"
```

No API key needed. Start Ollama before running PACE:
```bash
ollama serve
ollama pull llama3.1
pip install litellm
```

## Switching to Groq

```yaml
llm:
  provider: litellm
  model: groq/llama-3.1-70b-versatile
```

```bash
export LLM_API_KEY="gsk_..."
pip install litellm
```

## Switching to Mistral

```yaml
llm:
  provider: litellm
  model: mistral/mistral-large-latest
```

```bash
export LLM_API_KEY="..."
pip install litellm
```

## Provider comparison

| Provider | Best for | Tool calling | Speed |
|----------|----------|-------------|-------|
| `anthropic/claude-sonnet-4-6` | Best quality + code | Native | Medium |
| `anthropic/claude-opus-4-6` | Complex reasoning | Native | Slow |
| `anthropic/claude-haiku-4-5-20251001` | Speed + cost | Native | Fast |
| `openai/gpt-4o` | GPT ecosystem | Native | Fast |
| `gemini/gemini-2.0-flash` | Cost-efficient | Native | Fast |
| `ollama/llama3.1` | Fully local / private | Yes | Varies |
| `groq/llama-3.1-70b-versatile` | Fastest inference | Yes | Very fast |

:::note
Tool calling is required for FORGE and SCRIBE, which run an agentic loop. All listed providers support it. If you add a provider via LiteLLM that doesn't support tool calls, those agents will fail.
:::

## Model quality guidance

PACE agents spend most tokens on FORGE (implementation) and SCRIBE (documentation). These agents run a multi-turn tool loop and benefit most from a capable model. GATE, SENTINEL, and CONDUIT make single-pass structured YAML calls and are less sensitive to model quality.

For cost-sensitive setups, you can use a powerful model for FORGE/SCRIBE and a cheaper model for the review agents by running them with different configs — though this requires code changes to the orchestrator.
