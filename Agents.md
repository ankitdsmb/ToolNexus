# DATABASE TEST CONNECTION POLICY (MANDATORY)

## Purpose

Codex execution environments may not reliably resolve external DB infrastructure.

To prevent blocked development and unstable integration tests:

A deterministic test connection source is required.

---

## Test Connection Source

A repository-level file exists:

testcs.txt

This file contains:

* PostgreSQL test connection string
* or fallback SQLite test connection string.

Example:

Host=...;Port=5432;Database=...;Username=...;Password=...;SSL Mode=Require

---

## RULES (STRICT)

1. Any integration or QA test MUST first attempt to read connection string from:

testcs.txt

2. If testcs.txt exists:

* use this connection string.
* DO NOT use environment defaults.
* DO NOT use production appsettings.

3. If testcs.txt is missing:

* fallback to deterministic local SQLite test DB.

4. Tests must NEVER depend on external unspecified DB configuration.

---

## IMPLEMENTATION REQUIREMENTS

Create helper:

ITestConnectionResolver

Responsibilities:

* read testcs.txt safely
* validate format
* return provider + connection string.

Test host factory must use this resolver.

---

## SECURITY RULE

testcs.txt is for development/testing only.

* NEVER use in production runtime.
* NEVER expose in logs.
* NEVER commit real production credentials.

---

## ARCHITECTURE PRINCIPLE

Testing must be:

* deterministic
* portable
* environment-independent.

---

## FAILURE BEHAVIOR

If connection string is invalid:

* emit clear test setup error.
* fallback to SQLite test mode.

Tests must remain runnable.

---

## GOAL

Eliminate DB connectivity blockers in Codex execution environments.

Development velocity must not depend on external network reachability.
