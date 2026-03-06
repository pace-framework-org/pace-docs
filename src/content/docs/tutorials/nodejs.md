---
title: PACE with Node.js / TypeScript
description: Configure PACE for a Node.js or TypeScript service using npm/pnpm, Jest or Vitest, and Express or NestJS.
sidebar:
  order: 7
---

This tutorial shows how to configure PACE for a Node.js TypeScript project. FORGE will write TypeScript, GATE will run Jest or Vitest, and SENTINEL will audit for Node.js-specific security risks.

## Prerequisites

- Node.js 20 LTS or later
- npm, pnpm, or yarn
- TypeScript 5+ (recommended)
- An existing project with at least a minimal test suite
- An API key for your LLM provider

## Project layout assumed by this tutorial

```
my-api/
├── pace/                ← PACE subdirectory
│   └── pace.config.yaml
├── src/
│   ├── routes/
│   ├── services/
│   └── models/
├── tests/               ← or src/**/*.test.ts
├── package.json
├── tsconfig.json
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

## 2 — Configure for Node.js / TypeScript

Edit `pace/pace.config.yaml`:

```yaml
framework_version: "1.0"

product:
  name: "My API"
  description: >
    A Node.js TypeScript REST API built with Express. Handles user accounts,
    billing subscriptions, and webhook delivery for SaaS customers.
  github_org: "my-org"

sprint:
  duration_days: 14

source:
  dirs:
    - name: "src"
      path: "src/"
      language: "TypeScript"
      description: "Express routes, service layer, domain models, and middleware"
    - name: "tests"
      path: "tests/"
      language: "TypeScript"
      description: "Jest unit and integration tests"

tech:
  primary_language: "TypeScript 5 / Node.js 20"
  ci_system: "GitHub Actions"
  test_command: "npm test -- --forceExit"
  build_command: "npm run build"   # or: npx tsc --noEmit

platform:
  type: local

llm:
  provider: anthropic
  model: claude-sonnet-4-6
```

### Test runner variants

| Setup | `test_command` |
|-------|---------------|
| Jest (default) | `npm test -- --forceExit` |
| Jest (CI mode) | `npx jest --ci --forceExit` |
| Vitest | `npx vitest run` |
| Mocha + ts-node | `npx mocha --require ts-node/register 'tests/**/*.test.ts'` |
| pnpm + Jest | `pnpm test -- --forceExit` |
| Nx monorepo | `npx nx test my-app` |

:::tip
`--forceExit` prevents Jest from hanging when open handles (database connections, HTTP servers) are not closed after tests. For Vitest, this is not needed.
:::

### Build command vs type-check only

If you want FORGE to catch TypeScript errors without emitting files:

```yaml
tech:
  build_command: "npx tsc --noEmit"
```

If you emit a compiled `dist/` directory:

```yaml
tech:
  build_command: "npm run build"
```

## 3 — Set credentials

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

## 4 — Write a Node.js sprint plan

Create `.pace/plan.yaml` at your repo root:

```yaml
sprint:
  goal: "Add a WebhookService that delivers events to customer endpoints"
  duration_days: 5

days:
  - day: 1
    theme: "Webhook domain model and delivery queue"
    stories:
      - title: "Webhook entity, repository interface, and in-memory queue"
        acceptance_criteria:
          - "Webhook interface has id, url, secret, and events string[] fields"
          - "WebhookRepository interface has save(), findById(), and findByEvent() methods"
          - "InMemoryWebhookRepository implements WebhookRepository"
          - "Unit tests cover save-and-retrieve round-trip and findByEvent filtering"
          - "npm test exits 0"
        out_of_scope:
          - "HTTP delivery"
          - "Persistence (database)"

  - day: 2
    theme: "HMAC signing and HTTP delivery"
    stories:
      - title: "WebhookDeliveryService with HMAC-SHA256 signature"
        acceptance_criteria:
          - "deliver() sends POST with X-Webhook-Signature header"
          - "Signature is HMAC-SHA256 of JSON body using webhook.secret"
          - "Unit tests mock axios/fetch; no real HTTP calls"
          - "Failed deliveries (non-2xx) throw DeliveryError with status code"
          - "npm test exits 0"

  - day: 3
    theme: "Retry logic and Express route"
    clearance_day: true
    stories:
      - title: "Retry with exponential backoff and POST /webhooks endpoint"
        acceptance_criteria:
          - "Retries up to 3 times with 1s, 2s, 4s delays"
          - "POST /webhooks validates body with zod and returns 201 or 422"
          - "Integration test uses supertest; no real outbound HTTP"
          - "npm test exits 0"
```

## 5 — Run Day 1

```bash
cd pace
python pace/orchestrator.py --day 1
```

### What FORGE does with TypeScript

FORGE's tool-calling loop will:
1. Read `package.json`, `tsconfig.json`, and existing source files
2. Understand your module resolution, import aliases, and existing patterns
3. Write `.ts` files using interfaces, classes, and async/await patterns
4. Run `npx tsc --noEmit` (or `build_command`) to catch type errors
5. Run `npm test` and read Jest output to self-correct failures

A typical FORGE run for Day 1:

```
[FORGE] Reading package.json ...
[FORGE] Reading tsconfig.json ...
[FORGE] Reading src/index.ts ...
[FORGE] Writing src/webhooks/Webhook.ts ...
[FORGE] Writing src/webhooks/WebhookRepository.ts ...
[FORGE] Writing src/webhooks/InMemoryWebhookRepository.ts ...
[FORGE] Writing tests/webhooks/InMemoryWebhookRepository.test.ts ...
[FORGE] Running build: npx tsc --noEmit ...
[FORGE] Running tests: npm test -- --forceExit ...
[FORGE] All tests pass. Calling complete_handoff.
```

### What SENTINEL checks for Node.js

SENTINEL applies Node.js-specific checks:

- **Injection**: NoSQL injection in MongoDB queries, template literal injection in SQL
- **Prototype pollution**: unsafe use of `Object.assign` or lodash `merge` with user input
- **Path traversal**: `path.join` or `fs.readFile` with unvalidated user-provided paths
- **Secrets**: API keys or tokens hardcoded in source, `.env` files committed
- **Dependency risks**: `eval()`, `Function()` constructor with dynamic strings, `child_process.exec` with user input
- **HTTP security**: missing `helmet`, missing rate limiting on auth endpoints
- **JWT**: weak secrets, missing expiry validation, `none` algorithm acceptance

## 6 — NestJS projects

NestJS projects work the same way with a small config adjustment:

```yaml
source:
  dirs:
    - name: "src"
      path: "src/"
      language: "TypeScript"
      description: >
        NestJS application. Uses decorators, modules, and dependency injection.
        Controllers in src/*/**.controller.ts, services in src/*/**.service.ts.

tech:
  primary_language: "TypeScript 5 / Node.js 20 / NestJS 10"
  test_command: "npm run test -- --forceExit"
  build_command: "npm run build"
```

Include a note about NestJS patterns in `product.description` so FORGE generates proper `@Injectable()`, `@Controller()`, and `@Module()` decorators.

## 7 — Monorepo setups (Turborepo / Nx)

```yaml
source:
  dirs:
    - name: "webhook-service"
      path: "apps/webhook-service/src/"
      language: "TypeScript"
      description: "Webhook delivery microservice — NestJS, Prisma ORM"

tech:
  test_command: "npx turbo test --filter=webhook-service"
  build_command: "npx turbo build --filter=webhook-service"
```

## Common issues

**Jest hangs after tests pass**
Add `--forceExit` to your test command. If you use database connections or an Express server in tests, ensure `afterAll()` closes them — FORGE will respect this pattern if you note it in `product.description`.

**TypeScript path aliases not resolved in Jest**
If you use `paths` in `tsconfig.json` (e.g. `@/services/*`), ensure `moduleNameMapper` in `jest.config.js` mirrors them. FORGE reads `jest.config.js` and will use the same aliases in new test files.

**`build_command` fails with module not found**
If `npx tsc` cannot find a type definition, add the missing `@types/*` package to `devDependencies` manually, then re-run the day. FORGE can only write code it believes compiles; it cannot add npm packages.

**ESM / CommonJS module conflicts**
If your project mixes ESM and CJS, include a clear note in `product.description`: "The project uses ESM (`"type": "module"` in package.json). All imports must use file extensions."
