---
title: PACE with C# (.NET)
description: Configure PACE for an ASP.NET Core service using dotnet test, xUnit, and the .NET 8 SDK.
sidebar:
  order: 6
---

This tutorial shows how to configure PACE for a C# ASP.NET Core project. FORGE will write idiomatic C# code, GATE will run your xUnit or NUnit test suite via `dotnet test`, and SENTINEL will audit for .NET-specific security risks.

## Prerequisites

- .NET 8 SDK (or 6/7 — adjust `primary_language` accordingly)
- An existing ASP.NET Core project with at least a minimal test project
- An API key for your LLM provider

## Project layout assumed by this tutorial

```
MyService/
├── pace/                        ← PACE subdirectory
│   └── pace.config.yaml
├── src/
│   └── MyService/               ← main project (.csproj)
├── tests/
│   └── MyService.Tests/         ← test project (.csproj)
├── MyService.sln
└── .pace/
```

## 1 — Install PACE

```bash
# From your repo root
git clone https://github.com/pace-framework-org/pace-framework-starter pace
cd pace
python -m venv .venv && source .venv/bin/activate
pip install PyYAML jsonschema anthropic
```

## 2 — Configure for C#

Edit `pace/pace.config.yaml`:

```yaml
framework_version: "1.0"

product:
  name: "MyService"
  description: >
    An ASP.NET Core REST API for the MyService platform. Handles user
    management, billing, and notification delivery for B2B customers.
  github_org: "my-org"

sprint:
  duration_days: 14

source:
  dirs:
    - name: "api"
      path: "src/MyService/"
      language: "C#"
      description: "ASP.NET Core controllers, services, domain models, and EF Core data layer"
    - name: "tests"
      path: "tests/MyService.Tests/"
      language: "C#"
      description: "xUnit unit and integration tests, including WebApplicationFactory tests"

tech:
  primary_language: "C# 12 / .NET 8"
  ci_system: "GitHub Actions"
  test_command: "dotnet test --no-build -v minimal"
  build_command: "dotnet build --no-restore -v minimal"

platform:
  type: local

llm:
  provider: anthropic
  model: claude-sonnet-4-6
```

:::note
`--no-build` on `dotnet test` avoids rebuilding twice. PACE runs `build_command` first (which compiles), then `test_command`. For single-project solutions without a separate build step, you can omit `build_command` and use `dotnet test -v minimal` alone.
:::

### Test framework variants

| Framework | `test_command` |
|-----------|---------------|
| xUnit (default) | `dotnet test --no-build -v minimal` |
| NUnit | `dotnet test --no-build -v minimal` |
| MSTest | `dotnet test --no-build -v minimal` |
| Specific project only | `dotnet test tests/MyService.Tests --no-build -v minimal` |
| With coverage | `dotnet test --no-build -v minimal --collect:"XPlat Code Coverage"` |

## 3 — Set credentials

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

## 4 — Write a C# sprint plan

Create `.pace/plan.yaml` at your repo root:

```yaml
sprint:
  goal: "Implement a NotificationService with email and webhook channels"
  duration_days: 5

days:
  - day: 1
    theme: "Notification domain model and channel abstraction"
    stories:
      - title: "INotificationChannel interface and domain entities"
        acceptance_criteria:
          - "INotificationChannel has SendAsync(Notification, CancellationToken) method"
          - "Notification record has Id, RecipientEmail, Subject, Body, and Channel properties"
          - "NotificationStatus enum has Pending, Sent, Failed values"
          - "Domain entities have no external dependencies (no EF Core, no HTTP)"
          - "dotnet test exits 0 with at least 3 passing unit tests"
        out_of_scope:
          - "Email sending implementation"
          - "Webhook HTTP calls"

  - day: 2
    theme: "EmailChannel implementation with retry logic"
    stories:
      - title: "SmtpEmailChannel with polly retry policy"
        acceptance_criteria:
          - "SmtpEmailChannel implements INotificationChannel"
          - "Retries up to 3 times with exponential backoff on transient errors"
          - "Unit tests mock ISmtpClient; no real SMTP calls in tests"
          - "dotnet test exits 0"

  - day: 3
    theme: "WebhookChannel and NotificationService orchestration"
    clearance_day: true
    stories:
      - title: "HttpWebhookChannel and NotificationService"
        acceptance_criteria:
          - "HttpWebhookChannel sends POST with JSON payload and HMAC-SHA256 signature"
          - "NotificationService.SendAsync() routes to correct channel by Notification.Channel"
          - "Integration test uses WebApplicationFactory; mocks external HTTP"
          - "dotnet test exits 0"
```

## 5 — Run Day 1

```bash
cd pace
python pace/orchestrator.py --day 1
```

### What FORGE does with C#

FORGE's tool-calling loop will:
1. Read `.csproj` files to understand project references and NuGet packages
2. Read existing source files to understand namespaces, patterns, and DI registration
3. Write new `.cs` files following C# conventions (PascalCase, `async/await`, nullable reference types)
4. Run `dotnet build` to catch compilation errors
5. Run `dotnet test` and read `xunit` output to self-correct failures

A typical FORGE run for Day 1:

```
[FORGE] Reading src/MyService/MyService.csproj ...
[FORGE] Reading src/MyService/Program.cs ...
[FORGE] Writing src/MyService/Notifications/INotificationChannel.cs ...
[FORGE] Writing src/MyService/Notifications/Notification.cs ...
[FORGE] Writing src/MyService/Notifications/NotificationStatus.cs ...
[FORGE] Writing tests/MyService.Tests/Notifications/NotificationDomainTests.cs ...
[FORGE] Running build: dotnet build --no-restore -v minimal ...
[FORGE] Running tests: dotnet test --no-build -v minimal ...
[FORGE] All tests pass. Calling complete_handoff.
```

### What SENTINEL checks for C#

SENTINEL applies .NET-specific checks:

- **Injection**: SQL injection via raw string queries in EF Core (`FromSqlRaw` with user input), XML injection
- **Secrets**: hardcoded connection strings, API keys in `appsettings.json` committed to source
- **Deserialization**: insecure `BinaryFormatter` usage, unsafe `Newtonsoft.Json` type handling with `TypeNameHandling.All`
- **Authentication**: missing `[Authorize]` on sensitive controllers, weak JWT validation settings
- **CORS**: overly permissive `AllowAnyOrigin` in production configurations
- **Dependency**: flags known-vulnerable NuGet packages based on package version patterns

## 6 — Multi-project solutions

For solutions with several projects, restrict FORGE to the relevant ones:

```yaml
source:
  dirs:
    - name: "notifications"
      path: "src/MyService.Notifications/"
      language: "C#"
      description: "Notification domain, channel implementations, and service orchestration"
    - name: "notifications-tests"
      path: "tests/MyService.Notifications.Tests/"
      language: "C#"
      description: "xUnit tests for the notifications bounded context"

tech:
  test_command: "dotnet test tests/MyService.Notifications.Tests --no-build -v minimal"
  build_command: "dotnet build src/MyService.Notifications --no-restore -v minimal"
```

## 7 — Azure DevOps or GitHub Actions

For CI integration after local validation:

**GitHub Actions** — set `platform.type: github` and see [Run PACE on GitHub Actions](/tutorials/github-actions/).

**Azure DevOps** — Azure DevOps pipelines are not yet a native PACE platform adapter. Use `platform.type: local` and archive the `.pace/` directory as a pipeline artifact. Alternatively, configure `platform.type: jenkins` if you have a Jenkins instance alongside Azure DevOps.

## Common issues

**`dotnet: command not found`**
PACE runs commands from the repo root. Ensure `dotnet` is on `PATH` in the shell where you run the orchestrator, or use the full path: `test_command: "/usr/local/share/dotnet/dotnet test ..."`.

**Build succeeds but tests not found**
`dotnet test` with `--no-build` requires the binary to already exist. If you skip `build_command`, ensure you have run `dotnet build` manually at least once before the first `--day 1` run.

**FORGE adds packages not in `.csproj`**
FORGE may `using` a NuGet package it assumes is available. If `dotnet build` fails with missing namespace errors, FORGE will retry. If it loops, add the package manually (`dotnet add package ...`) and re-run the day.

**Nullable reference type warnings treated as errors**
If your project has `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>`, FORGE may generate code with nullable warnings that block compilation. Include a note in `product.description` such as "The codebase enforces nullable reference types — always annotate nullable parameters and return types."
