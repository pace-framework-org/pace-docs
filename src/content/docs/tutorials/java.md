---
title: PACE with Java (Spring Boot)
description: Configure PACE to plan, implement, and gate a Spring Boot service using Maven or Gradle and JUnit 5.
sidebar:
  order: 5
---

This tutorial walks through setting up PACE for a Java Spring Boot project. By the end, FORGE will write Java code, GATE will run your JUnit 5 test suite, and SENTINEL will review for Java-specific security issues.

## Prerequisites

- Java 17 or 21
- Maven 3.9+ or Gradle 8+
- An existing Spring Boot project with at least a minimal test suite
- An API key for your LLM provider

## Project layout assumed by this tutorial

```
my-service/
├── pace/                    ← PACE subdirectory
│   └── pace.config.yaml
├── src/
│   ├── main/java/com/acme/
│   └── test/java/com/acme/
├── pom.xml                  ← or build.gradle
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

## 2 — Configure for Java

Edit `pace/pace.config.yaml`:

```yaml
framework_version: "1.0"

product:
  name: "Acme Service"
  description: >
    A Spring Boot REST API for the Acme platform. Serves mobile and web
    clients. Handles orders, inventory, and payment processing.
  github_org: "acme-corp"

sprint:
  duration_days: 14

source:
  dirs:
    - name: "api"
      path: "src/main/java/com/acme/"
      language: "Java"
      description: "Spring Boot application, domain models, and REST controllers"
    - name: "tests"
      path: "src/test/java/com/acme/"
      language: "Java"
      description: "JUnit 5 unit and integration tests"

tech:
  primary_language: "Java 21"
  ci_system: "GitHub Actions"
  test_command: "mvn -q test"   # or: ./gradlew test --quiet
  build_command: "mvn -q compile" # or: ./gradlew compileJava

platform:
  type: local   # switch to github after verifying locally

llm:
  provider: anthropic
  model: claude-sonnet-4-6
```

:::note
`mvn -q test` suppresses Maven's verbose output so GATE can parse the test results cleanly. For Gradle, use `./gradlew test --quiet`.
:::

### Maven vs Gradle test commands

| Build tool | `test_command` | `build_command` |
|------------|---------------|-----------------|
| Maven | `mvn -q test` | `mvn -q compile` |
| Maven (skip integration tests) | `mvn -q test -Dexclude="**/*IT.java"` | `mvn -q compile` |
| Gradle | `./gradlew test --quiet` | `./gradlew compileJava` |
| Gradle (single module) | `./gradlew :api:test --quiet` | `./gradlew :api:compileJava` |

## 3 — Set credentials

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

## 4 — Write a Java-focused sprint plan

Create `.pace/plan.yaml` at your repo root:

```yaml
sprint:
  goal: "Add a ProductCatalog service with CRUD endpoints"
  duration_days: 5

days:
  - day: 1
    theme: "ProductCatalog domain model and repository"
    stories:
      - title: "Product JPA entity and Spring Data repository"
        acceptance_criteria:
          - "Product entity has id, name, price, and stockQuantity fields"
          - "ProductRepository extends JpaRepository<Product, Long>"
          - "ProductRepositoryTest covers findByName and save round-trip"
          - "mvn test exits 0"
        out_of_scope:
          - "REST endpoints"
          - "Category associations"

  - day: 2
    theme: "ProductCatalogService business logic"
    stories:
      - title: "ProductCatalogService with validation"
        acceptance_criteria:
          - "createProduct() throws IllegalArgumentException for negative price"
          - "updateStock() throws InsufficientStockException when quantity < 0"
          - "Service layer is unit-tested with Mockito (no database)"
          - "mvn test exits 0"

  - day: 3
    theme: "REST controller and integration tests"
    clearance_day: true
    stories:
      - title: "ProductController with GET/POST/PUT endpoints"
        acceptance_criteria:
          - "GET /products returns 200 with list"
          - "POST /products returns 201 with Location header"
          - "PUT /products/{id} returns 200 or 404"
          - "Integration tests use @SpringBootTest and MockMvc"
          - "mvn test exits 0"
```

## 5 — Run Day 1

```bash
cd pace
python pace/orchestrator.py --day 1
```

### What FORGE does with Java

FORGE's tool-calling loop will:
1. Read existing source files under `src/main/java/com/acme/` and `src/test/java/com/acme/`
2. Understand the package structure and Spring conventions
3. Write new `.java` files using JPA annotations, Spring Data interfaces, and JUnit 5 patterns
4. Run `mvn -q compile` (build_command) to catch syntax errors before running tests
5. Run `mvn -q test` and read failures to self-correct

A typical FORGE run for Day 1:

```
[FORGE] Reading src/main/java/com/acme/AcmeServiceApplication.java ...
[FORGE] Reading pom.xml ...
[FORGE] Writing src/main/java/com/acme/catalog/domain/Product.java ...
[FORGE] Writing src/main/java/com/acme/catalog/repository/ProductRepository.java ...
[FORGE] Writing src/test/java/com/acme/catalog/repository/ProductRepositoryTest.java ...
[FORGE] Running build: mvn -q compile ...
[FORGE] Running tests: mvn -q test ...
[FORGE] All tests pass. Calling complete_handoff.
```

### What SENTINEL checks for Java

SENTINEL applies Java-specific checks including:

- **Injection risks**: SQL injection via native queries, SpEL injection in `@Query`
- **Deserialization**: unsafe use of `ObjectInputStream`, `XmlDecoder`
- **Secrets in source**: hardcoded passwords in `application.properties` or `@Value`
- **Dependency vulnerabilities**: flags commonly vulnerable versions (Log4Shell, Spring4Shell patterns)
- **JWT handling**: weak signing algorithms, missing expiry validation

## 6 — Handling Maven multi-module projects

For multi-module projects, point PACE at the specific module you are sprinting on:

```yaml
source:
  dirs:
    - name: "catalog-service"
      path: "catalog-service/src/main/java/"
      language: "Java"
      description: "Catalog bounded context — products, categories, pricing"

tech:
  test_command: "mvn -q test -pl catalog-service"
  build_command: "mvn -q compile -pl catalog-service -am"
```

## 7 — Example: switching to GitHub platform

Once your local runs succeed, switch to GitHub to get CI polling and automatic PRs:

```yaml
platform:
  type: github
```

```bash
export GITHUB_TOKEN="ghp_..."
export GITHUB_REPOSITORY="acme-corp/acme-service"
pip install PyGithub
```

See [Switch Platform](/guides/switch-platform/) for the full credential reference.

## Common issues

**`mvn: command not found`**
PACE runs `test_command` from the repo root. If Maven is not on `PATH` inside the `pace/` virtualenv, use the Maven wrapper: `test_command: "../mvnw -q test"` (adjust path relative to repo root).

**Gradle daemon conflicts**
If FORGE runs the Gradle daemon and your shell has a separate daemon running, use `--no-daemon`: `test_command: "./gradlew test --quiet --no-daemon"`.

**Test output too verbose for GATE**
GATE reads the full test output. With Surefire, add `-Dsurefire.failIfNoSpecifiedTests=false` and ensure `<reportFormat>plain</reportFormat>` in your POM for clean failure messages.

**FORGE writes to wrong package**
If your base package is not `com.acme`, update `source.dirs[].path` and `source.dirs[].description` to reflect your actual package structure so SCRIBE and FORGE understand the layout.
