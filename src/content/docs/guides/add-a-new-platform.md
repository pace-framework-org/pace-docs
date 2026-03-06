---
title: Add a New Platform
description: Implement a custom PlatformAdapter to connect PACE to any CI/CD or Git hosting platform.
sidebar:
  order: 6
---

If your CI/CD platform isn't natively supported, you can add it by implementing the `PlatformAdapter` abstract base class. This guide walks through the full implementation.

## Prerequisites

Familiarity with:
- Python dataclasses and abstract base classes
- Your platform's REST API or SDK

## 1 — Create the adapter file

Create `pace/platforms/myplatform.py`:

```python
"""MyPlatform adapter for PACE."""

import os
from pathlib import Path
from .base import PlatformAdapter


class MyPlatformAdapter(PlatformAdapter):
    """PACE platform adapter for MyPlatform."""

    def __init__(self):
        self.api_key = os.environ["MYPLATFORM_API_KEY"]
        self.project = os.environ["MYPLATFORM_PROJECT"]
        # Initialise your SDK / HTTP client here

    def open_review_pr(self, day: int, pace_dir: Path) -> str:
        """Create a pull/merge request and return its URL."""
        title = f"PACE Day {day} Review"
        body_file = pace_dir / f"day-{day}" / "review-pr.md"
        body = body_file.read_text() if body_file.exists() else ""

        # Call your platform API to create the PR
        pr = self._client.create_pr(title=title, body=body)
        return pr.url

    def open_escalation_issue(self, day: int, day_dir: Path) -> str:
        """Create an escalation issue and return its URL."""
        issue_file = day_dir / "escalation-issue.md"
        body = issue_file.read_text() if issue_file.exists() else ""

        issue = self._client.create_issue(
            title=f"PACE Day {day} Escalation",
            body=body,
        )
        return issue.url

    def wait_for_commit_ci(
        self,
        sha: str,
        timeout_minutes: int = 15,
        poll_interval: int = 20,
    ) -> dict:
        """Poll for CI result and return a result dict."""
        import time

        deadline = time.time() + timeout_minutes * 60
        while time.time() < deadline:
            build = self._client.get_build_for_sha(sha)
            if build and build.status in ("success", "failed", "cancelled"):
                return {
                    "conclusion": "success" if build.status == "success" else "failure",
                    "name": build.pipeline_name,
                    "sha": sha,
                    "url": build.url,
                }
            time.sleep(poll_interval)

        return {"conclusion": "timeout", "sha": sha}

    def post_daily_summary(self, day: int, gate_report: dict) -> None:
        """Post a summary comment or status update."""
        decision = gate_report.get("gate_decision", "UNKNOWN")
        message = f"PACE Day {day}: {decision}"
        self._client.post_comment(message)

    def write_job_summary(self, markdown: str) -> None:
        """Write the markdown summary to a platform-specific location."""
        summary_file = Path("pace-summary.md")
        summary_file.write_text(markdown, encoding="utf-8")
```

## 2 — The PlatformAdapter interface

All five methods are required:

```python
class PlatformAdapter(ABC):
    @abstractmethod
    def open_review_pr(self, day: int, pace_dir: Path) -> str:
        """Return the PR/MR URL."""

    @abstractmethod
    def open_escalation_issue(self, day: int, day_dir: Path) -> str:
        """Return the issue URL."""

    @abstractmethod
    def wait_for_commit_ci(
        self,
        sha: str,
        timeout_minutes: int = 15,
        poll_interval: int = 20,
    ) -> dict:
        """Return dict with keys: conclusion, name, sha, url.
        conclusion values: 'success' | 'failure' | 'timeout' | 'no_runs'
        """

    @abstractmethod
    def post_daily_summary(self, day: int, gate_report: dict) -> None:
        """Post a daily status update to the platform."""

    @abstractmethod
    def write_job_summary(self, markdown: str) -> None:
        """Write the markdown job summary to a platform-specific location."""
```

## 3 — Register the adapter

Open `pace/platforms/__init__.py` and add your adapter to the factory:

```python
from .myplatform import MyPlatformAdapter

def get_platform_adapter() -> PlatformAdapter:
    cfg = load_config()
    platform_type = cfg.platform_type

    if platform_type == "github":
        return GitHubAdapter()
    elif platform_type == "gitlab":
        return GitLabAdapter()
    elif platform_type == "bitbucket":
        return BitbucketAdapter()
    elif platform_type == "jenkins":
        return JenkinsAdapter()
    elif platform_type == "local":
        return LocalAdapter()
    elif platform_type == "myplatform":          # ← add this
        return MyPlatformAdapter()               # ← and this
    else:
        raise ValueError(f"Unknown platform type: {platform_type!r}")
```

## 4 — Update pace.config.yaml

```yaml
platform:
  type: myplatform
```

## 5 — Test your adapter

```bash
python -c "
from pace.platforms import get_platform_adapter
adapter = get_platform_adapter()
print(type(adapter))
result = adapter.wait_for_commit_ci('abc123', timeout_minutes=1)
print(result)
"
```

## CI result dictionary

`wait_for_commit_ci` must return a dictionary with these keys:

| Key | Type | Values |
|-----|------|--------|
| `conclusion` | str | `"success"`, `"failure"`, `"timeout"`, `"no_runs"` |
| `name` | str | Pipeline/workflow name (for display) |
| `sha` | str | The commit SHA that was polled |
| `url` | str \| None | Link to the CI run |

GATE uses `conclusion` to evaluate the CI criterion:
- `"success"` → PASS
- `"failure"` → FAIL
- `"timeout"` or `"no_runs"` → PARTIAL (if out_of_scope) or FAIL

## Submitting your adapter

If your adapter could benefit others, open a pull request against the [pace-framework-starter](https://github.com/your-org/pace-framework-starter) repository. Include:
- The adapter file in `pace/platforms/`
- The factory registration in `pace/platforms/__init__.py`
- Required environment variables documented in `README.md`
- A brief section in `pace.config.yaml` comments
