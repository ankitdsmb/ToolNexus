# Bugs and Half-Implemented Findings

## Fixed in This Audit
1. **Sanitized error middleware swallowed post-response exceptions**
   - Symptom: error logs showed unhandled exception while HTTP response still completed with 200, creating misleading incident signals.
   - Root cause: catch-all handled every exception but could not write sanitized error once response had started.
   - Fix: include exception context in logs and short-circuit without rewriting already-started responses.

2. **`dotnet tool restore` lacked a default manifest path**
   - Symptom: bootstrap command printed "Cannot find a manifest file" and restored nothing.
   - Root cause: repository root had `tools.manifest.json` for runtime tools, but no `.config/dotnet-tools.json` for .NET local tools.
   - Fix: added `.config/dotnet-tools.json` root manifest so standard `dotnet tool restore` resolves deterministically.

## Confirmed Partial / Operational Gaps
- None currently confirmed in this pass.

## Over-Engineered / Refactor Candidates
1. **Middleware stack has several logging layers with overlapping responsibility**
   - Request, admin, tool execution, and sanitize middleware all write logs; incident ownership can become ambiguous.
2. **Runtime compatibility adapters remain transitional-heavy**
   - DOM adapter + lifecycle normalization indicate migration in progress; maintainability risk if legacy path persists long-term.

## Runtime Risks
- Externalized logging and incident flows are robust but noisy under heavy test runs.
- Dependency warnings in npm install (deprecated packages + vulnerabilities) should be prioritized for upgrade planning.
