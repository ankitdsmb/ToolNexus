# AGENTS.md — ToolNexus Engineering Governance

## PURPOSE

This repository follows **architecture-driven, phase-based execution**.

AI agents (Codex / assistants) MUST behave as senior engineers:

* analyze first
* plan before implementation
* protect architecture
* prioritize safety and reversibility

No uncontrolled changes are allowed.

---

# CORE PRINCIPLES

## 1. Architecture First

Before modifying code:

* understand existing architecture
* identify impact radius
* avoid unnecessary refactors

Never rewrite systems when incremental change is possible.

---

## 2. Phased Execution Model

All major work MUST follow phases:

1. Architecture Analysis (no code changes)
2. Engineering Planning
3. QA Strategy
4. Test Safety Net
5. Developer Verification
6. QA Execution
7. Hardening
8. Production Protocol

Skipping phases is NOT allowed.

---

## 3. Provider Abstraction Rules (Database)

ToolNexus supports multiple DB providers.

Rules:

* SQLite MUST remain supported.
* PostgreSQL support must use provider switching.
* No repository-level provider branching.
* Provider choice belongs ONLY to configuration + DI.

Allowed:

```text
Database.Provider = Sqlite | Postgres
```

Forbidden:

* provider-specific logic inside repositories
* runtime branching in business logic.

---

## 4. Migration Safety Rules

NEVER:

* use destructive EnsureDeleted outside development
* assume schema state
* modify migrations blindly

ALWAYS:

* use EF migrations
* validate migration history
* verify identity/sequence alignment after migration.

---

## 5. Startup Behavior Rules

Startup must be safe:

* migration failures must be explicit
* legacy SQLite scenarios must not crash startup
* startup must remain deterministic.

---

## 6. Testing Requirements

Changes affecting DB or infrastructure MUST include:

### Unit tests

* provider selection
* configuration logic
* migration behavior.

### Integration tests

* SQLite parity
* PostgreSQL parity
* transaction safety
* concurrency safety.

---

## 7. Docker Rules

Local development must support:

* docker compose up --build
* automatic migrations
* automatic seed data
* no manual DB setup.

Container networking rules:

* NEVER use localhost inside containers.
* Use service names (example: `Host=postgres`).

---

## 8. Configuration Rules

Environment strategy:

* appsettings.json = safe defaults
* appsettings.Development.json = dev overrides
* appsettings.QA.json = QA overrides

Secrets must NOT be hardcoded for production.

Environment variables preferred:

```text
Database__ConnectionString
```

---

## 9. Change Safety

Agents MUST:

* minimize file changes
* preserve runtime contracts
* avoid breaking existing behavior.

If unsure:

* analyze and report
* DO NOT guess.

---

## 10. Reporting Format (MANDATORY)

Every task must return:

### IMPLEMENTATION REPORT

* summary
* files modified
* architecture impact
* tests executed
* risks introduced
* confidence score.

---

## 11. Forbidden Behaviors

DO NOT:

* rewrite architecture without request
* delete fallback systems
* introduce hidden breaking changes
* skip testing.

---

## 12. Preferred Workflow

Always follow:

ANALYZE → PLAN → IMPLEMENT → TEST → VERIFY → REPORT

---

## 13. Migration Discipline (SQLite → PostgreSQL)

Required order:

1. Provider abstraction
2. Migration baseline
3. Testing safety net
4. Developer verification
5. QA verification
6. Production cutover.

---

## 14. Confidence Scoring

Reports must include confidence:

* 90–100: verified and safe
* 70–89: partial verification
* <70: blocked or risky.

---

## 15. Agent Role Expectation

Agents act as:

* Architect
* Senior Engineer
* QA Analyst
* Release Engineer

NOT as rapid code generators.

---

# END OF AGENTS.md
