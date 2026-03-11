---
title: Add a New Platform
description: How to implement CIAdapter and TrackerAdapter for a new CI/CD or issue-tracking platform.
sidebar:
  order: 6
---

# Add a New Platform

PACE uses two separate abstract base classes for platform integration:

- **`CIAdapter`** — CI/CD and Git hosting (PRs, CI polling, job summaries)
- **`TrackerAdapter`** — Sprint tracker / issue platform (escalations, advisory findings)

You can implement one or both depending on what your platform supports.

## Step 1: Create your adapter file

Create `pace/platforms/myplatform.py`. Import the base class(es) you need:

```python
from platforms.base import CIAdapter, TrackerAdapter
```

## Step 2: Implement CIAdapter (optional)

If your platform supports PRs/MRs and CI pipelines:

```python
class MyPlatformCIAdapter(CIAdapter):
    def __init__(self, token: str, ...) -> None:
        self._token = token
        self._available = bool(token)

    def open_review_pr(self, day: int, pace_dir: Path) -> str:
        """Open a PR/MR for a human gate day. Return its URL."""
        ...

    def wait_for_commit_ci(self, sha: str, timeout_minutes: int = 15, poll_interval: int = 20) -> dict:
        """Poll CI until the commit reaches a terminal state.

        Return dict with keys: conclusion, url, name, sha
        conclusion must be one of: success | failure | cancelled | no_runs | timeout
        """
        ...

    def post_daily_summary(self, day: int, gate_report: dict) -> None:
        """Post a one-line status update."""
        ...

    def write_job_summary(self, markdown: str) -> None:
        """Write the full markdown report to the platform's job/run UI."""
        ...

    def set_variable(self, name: str, value: str) -> bool:
        """Set a CI/CD pipeline variable. Return True on success."""
        ...  # Optional: base class returns False (non-fatal)
```

## Step 3: Implement TrackerAdapter (optional)

If your platform supports issue tracking:

```python
class MyPlatformTrackerAdapter(TrackerAdapter):
    def __init__(self, token: str, ...) -> None:
        self._token = token
        self._available = bool(token)

    def open_escalation_issue(self, day: int, day_dir: Path, hold_reason: str = "") -> str:
        """Open a HOLD escalation ticket. Return its URL."""
        ...

    def push_advisory_items(self, day: int, items: list[dict], agent: str) -> str:
        """Open an advisory findings ticket. Return its URL."""
        ...
```

## Step 4: Register in the factory

Edit `pace/platforms/__init__.py` and add your platform to the factory functions:

```python
def get_ci_adapter() -> CIAdapter:
    ...
    if ci_type == "myplatform":
        from platforms.myplatform import MyPlatformCIAdapter
        return MyPlatformCIAdapter(
            token=os.environ.get("MYPLATFORM_TOKEN", ""),
        )
    ...

def get_tracker_adapter() -> TrackerAdapter:
    ...
    if tracker_type == "myplatform":
        from platforms.myplatform import MyPlatformTrackerAdapter
        return MyPlatformTrackerAdapter(
            token=os.environ.get("MYPLATFORM_TOKEN", ""),
        )
    ...
```

## Step 5: Configure

Update `pace.config.yaml`:

```yaml
platform:
  ci: myplatform      # if implementing CIAdapter
  tracker: myplatform  # if implementing TrackerAdapter
```

Add the required environment variables to your CI/CD pipeline configuration.

## Tips

- If your platform only supports CI (e.g. Jenkins), only implement `CIAdapter`. Set `tracker:` to a platform that supports issue tracking (Jira, GitHub Issues, etc.).
- If your platform only supports issue tracking (e.g. Jira), only implement `TrackerAdapter`. Set `ci:` to a platform that supports CI.
- The `set_variable` method in `CIAdapter` is optional — the base class returns `False` which is treated as non-fatal by the orchestrator.
- All methods should handle errors internally and return empty strings / `False` on failure rather than raising exceptions.
