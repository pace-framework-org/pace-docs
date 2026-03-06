---
title: Add a New LLM Provider
description: Implement a custom LLMAdapter to connect PACE to any AI model or inference endpoint.
sidebar:
  order: 7
---

PACE ships with `AnthropicAdapter` and `LiteLLMAdapter`. If you need to integrate a provider that LiteLLM doesn't cover — a private inference endpoint, a custom wrapper, or a research model — you can implement the `LLMAdapter` interface directly.

## The LLMAdapter interface

```python
class LLMAdapter(ABC):
    @abstractmethod
    def complete(self, system: str, user: str, max_tokens: int = 4096) -> str:
        """Single-turn structured completion. Returns the response text.

        Used by: PRIME, GATE, SENTINEL, CONDUIT (non-agentic agents).
        """

    @abstractmethod
    def chat(
        self,
        system: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        max_tokens: int = 8192,
    ) -> ChatResponse:
        """Multi-turn conversation with optional tool calling.

        Used by: FORGE, SCRIBE (agentic tool-loop agents).
        messages and tools are in Anthropic format.
        """
```

## Message format

PACE uses **Anthropic message format** internally. Your adapter receives messages in this format and must return a `ChatResponse`:

```python
# Input message examples (Anthropic format):
{"role": "user", "content": "Write a login endpoint."}
{"role": "assistant", "content": [
    {"type": "text", "text": "I'll read the existing code first."},
    {"type": "tool_use", "id": "toolu_1", "name": "read_file", "input": {"path": "src/auth.py"}},
]}
{"role": "user", "content": [
    {"type": "tool_result", "tool_use_id": "toolu_1", "content": "# auth.py\n..."}
]}
```

```python
# Return type:
@dataclass
class ChatResponse:
    stop_reason: str          # "end_turn" | "tool_use" | "max_tokens"
    text: str | None          # assistant text (may be None if only tool calls)
    tool_calls: list[ToolCall]  # empty list if no tool calls

@dataclass
class ToolCall:
    id: str
    name: str
    input: dict
```

## 1 — Create the adapter file

```python
"""MyModel LLM adapter for PACE."""

import requests
from .base import LLMAdapter, ChatResponse, ToolCall


class MyModelAdapter(LLMAdapter):
    """PACE LLM adapter for MyModel inference API."""

    def __init__(self, model: str, api_key: str, base_url: str = "https://api.mymodel.ai"):
        self.model = model
        self.api_key = api_key
        self.base_url = base_url

    def complete(self, system: str, user: str, max_tokens: int = 4096) -> str:
        """Single-turn completion — used by PRIME, GATE, SENTINEL, CONDUIT."""
        response = requests.post(
            f"{self.base_url}/v1/complete",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "model": self.model,
                "system": system,
                "prompt": user,
                "max_tokens": max_tokens,
            },
            timeout=120,
        )
        response.raise_for_status()
        return response.json()["text"]

    def chat(
        self,
        system: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        max_tokens: int = 8192,
    ) -> ChatResponse:
        """Multi-turn chat with tool calling — used by FORGE, SCRIBE."""
        payload = {
            "model": self.model,
            "system": system,
            "messages": self._convert_messages(messages),
            "max_tokens": max_tokens,
        }
        if tools:
            payload["tools"] = self._convert_tools(tools)

        response = requests.post(
            f"{self.base_url}/v1/chat",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json=payload,
            timeout=300,
        )
        response.raise_for_status()
        return self._parse_response(response.json())

    def _convert_messages(self, messages: list[dict]) -> list[dict]:
        """Convert Anthropic-format messages to your API format."""
        converted = []
        for msg in messages:
            # Implement format conversion here
            converted.append(msg)
        return converted

    def _convert_tools(self, tools: list[dict]) -> list[dict]:
        """Convert Anthropic tool definitions to your API format."""
        return tools

    def _parse_response(self, data: dict) -> ChatResponse:
        """Parse your API response into a ChatResponse."""
        tool_calls = [
            ToolCall(id=tc["id"], name=tc["name"], input=tc["arguments"])
            for tc in data.get("tool_calls", [])
        ]
        return ChatResponse(
            stop_reason=data.get("stop_reason", "end_turn"),
            text=data.get("text"),
            tool_calls=tool_calls,
        )
```

## 2 — Register the adapter

Open `pace/llm/__init__.py`:

```python
from .mymodel import MyModelAdapter

def get_llm_adapter() -> LLMAdapter:
    cfg = load_config()
    provider = cfg.llm.provider
    model = cfg.llm.model

    if provider == "anthropic":
        return AnthropicAdapter(model=model, api_key=os.environ["ANTHROPIC_API_KEY"])
    elif provider == "litellm":
        return LiteLLMAdapter(model=model, ...)
    elif provider == "mymodel":                # ← add this
        return MyModelAdapter(                 # ← and this
            model=model,
            api_key=os.environ["MYMODEL_API_KEY"],
            base_url=cfg.llm.base_url or "https://api.mymodel.ai",
        )
    else:
        raise ValueError(f"Unknown LLM provider: {provider!r}")
```

## 3 — Configure and run

```yaml
# pace/pace.config.yaml
llm:
  provider: mymodel
  model: mymodel-large-v2
  base_url: null
```

```bash
export MYMODEL_API_KEY="..."
python pace/orchestrator.py --day 1
```

## Key implementation notes

### Tool call ID uniqueness

FORGE and SCRIBE match tool results to tool calls by `id`. Ensure each tool call in your response has a unique ID string. If your API doesn't return IDs, generate them:

```python
import uuid
tool_calls = [
    ToolCall(id=f"call_{uuid.uuid4().hex[:8]}", name=tc["name"], input=tc["args"])
    for tc in data.get("tool_calls", [])
]
```

### stop_reason values

PACE checks `stop_reason` to decide whether to continue the tool loop:

| Value | Meaning |
|-------|---------|
| `"tool_use"` | Model wants to call a tool — loop continues |
| `"end_turn"` | Model is done — loop exits |
| `"max_tokens"` | Context limit hit — treated as done |

Map your API's equivalent values to these strings.

### Timeout handling

FORGE and SCRIBE loops can run for many turns. Set generous timeouts on your HTTP client (300+ seconds) and handle network errors gracefully.
