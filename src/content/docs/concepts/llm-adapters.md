---
title: LLM Adapters
description: How PACE abstracts AI model providers behind a common interface, enabling any LLM from Claude to GPT-4o to Ollama.
sidebar:
  order: 5
---

All six PACE agents make LLM calls. Rather than coupling them to a specific SDK, PACE routes every call through an **LLMAdapter** — a two-method interface that handles both single-turn completions (PRIME, GATE, SENTINEL, CONDUIT) and multi-turn agentic loops (FORGE, SCRIBE).

## The interface

```python
class LLMAdapter(ABC):

    def complete(self, system: str, user: str, max_tokens: int = 4096) -> str:
        """Single-turn completion. Returns the response text.

        Used by PRIME, GATE, SENTINEL, CONDUIT.
        """

    def chat(
        self,
        system: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        max_tokens: int = 8192,
    ) -> ChatResponse:
        """Multi-turn conversation with optional tool calling.

        Used by FORGE, SCRIBE.
        Messages and tools are in Anthropic format.
        """
```

## Two agent patterns

PACE agents fall into two patterns:

### Non-agentic (PRIME, GATE, SENTINEL, CONDUIT)

These agents make a single LLM call with a large system prompt and structured user message, and parse the YAML response:

```python
raw = adapter.complete(system_prompt, user_message, max_tokens=4096)
report = yaml.safe_load(raw)
```

Simple, predictable, and fast.

### Agentic (FORGE, SCRIBE)

These agents run a tool-calling loop. They call `adapter.chat()` repeatedly, appending tool results to the message history, until the model calls `complete_handoff`:

```python
while True:
    response = adapter.chat(
        system=system_prompt,
        messages=messages,
        tools=TOOLS,
        max_tokens=8192,
    )
    messages.append(response.to_assistant_message())

    for call in response.tool_calls:
        if call.name == "complete_handoff":
            return call.input  # handoff note
        result = dispatch_tool(call.name, call.input)
        messages.append({"role": "user", "content": [
            {"type": "tool_result", "tool_use_id": call.id, "content": result}
        ]})

    if response.stop_reason == "end_turn":
        break
```

## Two model tiers

PACE agents fall into two cost tiers based on what they do:

| Tier | Agents | Factory | Config key | Why |
| ---- | ------ | ------- | ---------- | --- |
| Code generation | FORGE, SCRIBE | `get_llm_adapter()` | `llm.model` | Multi-step tool-calling loops; requires strong reasoning |
| Analytical | PRIME, GATE, SENTINEL, CONDUIT | `get_analysis_adapter()` | `llm.analysis_model` | Single-call structured YAML generation; cheaper models perform well |

Configure in `pace.config.yaml`:

```yaml
llm:
  provider: anthropic
  model: claude-sonnet-4-6           # FORGE + SCRIBE
  analysis_model: claude-haiku-4-5-20251001  # PRIME, GATE, SENTINEL, CONDUIT
```

If `analysis_model` is omitted, `get_analysis_adapter()` falls back to `model` — no behaviour change for existing deployments.

On a typical day with one SHIP attempt, analytical agents account for 3–4 API calls vs FORGE's 10–25. Switching analytical agents to Haiku reduces per-run cost by ~40–50% for Anthropic-backed deployments.

## ChatResponse and ToolCall

`adapter.chat()` always returns a `ChatResponse`:

```python
@dataclass
class ChatResponse:
    stop_reason: str          # "end_turn" | "tool_use" | "max_tokens"
    text: str | None          # assistant text (may be None if only tool calls)
    tool_calls: list[ToolCall]

@dataclass
class ToolCall:
    id: str     # unique call ID (used to match tool results)
    name: str   # tool name
    input: dict # parsed tool arguments
```

`response.to_assistant_message()` converts the response back to an Anthropic-format message for appending to the conversation history.

## Message format

PACE uses **Anthropic message format** internally throughout all agents. Both adapters accept and produce this format. The LiteLLMAdapter converts to/from OpenAI format transparently at the API boundary.

```python
# Anthropic format (what PACE uses internally):
{"role": "user", "content": "Implement the login endpoint."}
{"role": "assistant", "content": [
    {"type": "text", "text": "I'll write the implementation."},
    {"type": "tool_use", "id": "toolu_1", "name": "write_file",
     "input": {"path": "src/auth.py", "content": "..."}},
]}
{"role": "user", "content": [
    {"type": "tool_result", "tool_use_id": "toolu_1", "content": "File written."}
]}
```

## Available adapters

### AnthropicAdapter (default)

Wraps the [Anthropic Python SDK](https://github.com/anthropics/anthropic-sdk-python) directly. No format conversion needed — PACE's internal format is identical to Anthropic's API format.

```yaml
llm:
  provider: anthropic
  model: claude-sonnet-4-6
```

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

Supported models:
| Model | Speed | Capability |
|-------|-------|-----------|
| `claude-sonnet-4-6` | Medium | Best balance (recommended) |
| `claude-opus-4-6` | Slow | Highest capability |
| `claude-haiku-4-5-20251001` | Fast | Cost-efficient |

### LiteLLMAdapter

Routes to any [LiteLLM-supported provider](https://docs.litellm.ai/docs/providers). Converts Anthropic format to OpenAI format at the API boundary.

```yaml
llm:
  provider: litellm
  model: openai/gpt-4o
```

```bash
export LLM_API_KEY="..."
pip install litellm
```

The adapter handles:
- Converting `input_schema` (Anthropic) → `parameters` (OpenAI) for tool definitions
- Converting `tool_use` blocks → `tool_calls` for assistant messages
- Converting `tool_result` user messages → `role: tool` messages
- Converting OpenAI response back to `ChatResponse`

See [Switch LLM Provider](/guides/switch-llm-provider/) for provider-specific configuration examples.

## How the adapter is selected

```python
from llm import get_llm_adapter, get_analysis_adapter

# FORGE and SCRIBE: uses llm.model (strong reasoning for code generation)
adapter = get_llm_adapter()

# PRIME, GATE, SENTINEL, CONDUIT: uses llm.analysis_model (analytical tasks)
adapter = get_analysis_adapter()
```

The factory reads `llm.provider` from `pace.config.yaml` and instantiates the correct adapter. The API key always comes from environment variables.

## Provider requirements

Not all providers support tool calling. Tool calling is required for FORGE and SCRIBE. All officially supported providers handle it:

| Provider prefix | Tool calling | Notes |
|-----------------|-------------|-------|
| `anthropic/*` | Native | Best quality for code |
| `openai/*` | Native | Strong alternative |
| `gemini/*` | Native | Cost-efficient |
| `bedrock/*` | Native | AWS-native |
| `groq/*` | Yes | Fastest inference |
| `mistral/*` | Yes | EU-hosted option |
| `ollama/*` | Model-dependent | Check model card |

## Implementing a custom adapter

See [Add a New LLM Provider](/guides/add-a-new-llm/) for a step-by-step guide to implementing and registering a custom `LLMAdapter`.
