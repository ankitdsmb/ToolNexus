# Bugs and Half-Implemented Findings

## Fixed in This Audit
1. **Sanitized error middleware swallowed post-response exceptions**
   - Symptom: error logs showed unhandled exception while HTTP response still completed with 200, creating misleading incident signals.
   - Root cause: catch-all handled every exception but could not write sanitized error once response had started.
   - Fix: include exception context in logs and short-circuit without rewriting already-started responses.

## Confirmed Partial / Operational Gaps
1. **`dotnet tool restore` not wired to default manifest location**
   - Current repo has `tools.manifest.json` at root, but no `.config/dotnet-tools.json` manifest.
   - Outcome: restore command reports "Cannot find a manifest file".

2. **Frontend `npm test` script missing**
   - Package defines `test:js`, `test:runtime`, and multiple playwright commands, but no canonical `test` script.
   - Outcome: baseline command in common CI workflows fails unless scripts are called explicitly.

## Over-Engineered / Refactor Candidates
1. **Middleware stack has several logging layers with overlapping responsibility**
   - Request, admin, tool execution, and sanitize middleware all write logs; incident ownership can become ambiguous.
2. **Runtime compatibility adapters remain transitional-heavy**
   - DOM adapter + lifecycle normalization indicate migration in progress; maintainability risk if legacy path persists long-term.

## Runtime Risks
- Externalized logging and incident flows are robust but noisy under heavy test runs.
- Dependency warnings in npm install (deprecated packages + vulnerabilities) should be prioritized for upgrade planning.
