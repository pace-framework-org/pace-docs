---
title: SCRIBE & Context Documents
description: How SCRIBE keeps PACE agents informed about your codebase as it evolves across sprint days.
sidebar:
  order: 3
---

SCRIBE is the last agent to run each day. Its job is to update a set of **context documents** in `.pace/context/` that other agents read on subsequent days. Without SCRIBE, FORGE on Day 5 would have no knowledge of the architectural decisions made on Day 1.

## The problem SCRIBE solves

LLM agents have no persistent memory between runs. When FORGE runs on Day 7, it has no direct knowledge of:
- What files were created on Days 1–6
- What module patterns were established
- What security decisions were made
- Which CI workflows were set up

SCRIBE bridges this gap by maintaining curated, up-to-date documents that summarise the current state of the codebase across all relevant domains.

## Context documents

SCRIBE maintains four context documents in `.pace/context/`:

### `engineering.md`

Used by: **FORGE**, **GATE**

Contains:
- Module map (what each file/directory does)
- Established patterns (error handling style, naming conventions, abstractions)
- Integration points (database connections, external API clients)
- Test organisation (where tests live, what test helpers exist)

Example excerpt:
```markdown
## Module Map (as of Day 4)

### src/models/
- `user.py` — User model with bcrypt password hashing (Day 1)
- `refresh_token.py` — RefreshToken model for rotation (Day 3)
- `__init__.py` — re-exports User, RefreshToken

### src/auth/
- `jwt_utils.py` — create_token(), verify_token() using python-jose (Day 2)
- `middleware.py` — FastAPI dependency for JWT validation (Day 4)

### tests/
- `test_user_model.py` — Unit tests for User model (4 tests)
- `test_auth_endpoints.py` — Integration tests for /auth/* (8 tests)

## Patterns
- Error handling: raise HTTPException with status_code and detail
- Database: SQLAlchemy session via Depends(get_db)
- Password hashing: bcrypt, rounds=12
```

### `security.md`

Used by: **SENTINEL**

Contains:
- Authentication and authorisation boundaries
- Input validation conventions
- Secrets management approach
- Known security constraints and decisions

Example excerpt:
```markdown
## Authentication
- JWT tokens signed with RS256, private key from JWT_PRIVATE_KEY env var
- Token expiry: 24h access, 7d refresh
- Refresh tokens stored in DB and invalidated on rotation

## Input Validation
- All request bodies validated with Pydantic models
- Path parameters: FastAPI type coercion only (no custom validation yet)

## Secrets
- No secrets in source — all from environment variables
- Required vars: DATABASE_URL, JWT_PRIVATE_KEY, JWT_PUBLIC_KEY
```

### `devops.md`

Used by: **CONDUIT**

Contains:
- CI/CD workflow descriptions
- Makefile targets and their purposes
- Required environment variables for deployment
- Infrastructure decisions

Example excerpt:
```markdown
## CI Workflows
- `.github/workflows/ci.yml` — runs pytest on push to main and PRs
  - Job: test → steps: checkout, setup-python, install deps, pytest
  - Pinned: actions/checkout@v4, actions/setup-python@v5

## Makefile Targets
- `make test` — runs pytest (same as CI)
- `make lint` — runs ruff
- `make migrate` — runs alembic upgrade head

## Environment Variables
- DATABASE_URL — Postgres connection string
- JWT_PRIVATE_KEY — RSA private key for token signing
- JWT_PUBLIC_KEY — RSA public key for token verification
```

### `product.md`

Used by: **PRIME**

Contains:
- High-level product decisions made during the sprint
- Deferred scope and why
- Changed requirements
- Stakeholder constraints

Example excerpt:
```markdown
## Decisions
- Day 2: decided to use RS256 over HS256 for JWT — allows stateless verification
  by external services without sharing the secret
- Day 3: refresh token rotation chosen over sliding expiry — simpler to reason
  about and easier to implement device session revocation

## Deferred
- OAuth / social login — explicitly out of scope for this sprint
- Email verification — deferred to next sprint
- Multi-factor authentication — not in scope
```

## How SCRIBE updates context

SCRIBE receives the full day's artifact chain — Story Card, Handoff Note, GATE report, SENTINEL report, and CONDUIT report — and uses them to produce targeted updates to each context document.

SCRIBE does not replace context documents wholesale. It **appends and revises** specific sections based on what actually changed today. A section about authentication from Day 2 won't be rewritten on Day 6 unless authentication changed on Day 6.

SCRIBE's output includes:
- Updated versions of changed context documents
- A brief log of what was changed and why

## Pre-seeding context before Day 1

You can pre-populate context documents before running the first day to give FORGE better starting context. This is especially valuable for:

- Large existing codebases (FORGE needs to understand current patterns)
- Teams with strict architectural conventions
- Security-sensitive domains

Create `.pace/context/engineering.md` manually before Day 1:

```markdown
## Existing Module Map

### src/
- `main.py` — FastAPI app entry point, router registration
- `database.py` — SQLAlchemy engine and session factory
- `models/` — SQLAlchemy ORM models (User, Product, Order)

## Conventions
- Use SQLAlchemy 2.0 async session pattern
- All endpoints return Pydantic response models
- Tests use pytest-asyncio with in-memory SQLite
```

SCRIBE will extend this document as new modules are added.

## External docs directory

If your project has an external documentation folder (architecture docs, ADRs, runbooks), set `source.docs_dir` in `pace.config.yaml`:

```yaml
source:
  docs_dir: "../my-docs/acme-api"
```

SCRIBE will read from this directory and can update markdown files there, keeping your engineering docs in sync with daily implementation progress.
