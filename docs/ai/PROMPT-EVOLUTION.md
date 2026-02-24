# Prompt Evolution Log

Use this log to track prompt changes, why they were made, and observed outcomes.

## Entry Template

Date:
Problem:
Prompt:
Result:
Improvement:
New Version:

---

## Notes
- Record one discrete issue per entry.
- Link related incidents, PRs, or test evidence when available.
- Prefer measurable outcomes (e.g., fewer runtime failures, faster recovery).

Date: 2026-02-23
Problem: Runtime regressions caused by tool contract mismatches (`action.trim`/DOM payload crashes) across execution-style tools.
Prompt: Global runtime compatibility normalization with architecture-first workflow, platform wrapper, defensive mount safeguards, and end-to-end validation.
Result: Added centralized runtime safety wrapper, hardened tool-page + legacy bridge execution paths, and expanded runtime safety tests for malformed payloads.
Improvement: Prevents class of failures without per-tool patch churn and preserves fallback behavior.
New Version: Keep platform-first normalization as default for any tool runtime error and require explicit contract tests for malformed payloads.

Date: 2026-02-23
Problem: Legacy runtime safety prevented crashes but did not guarantee operator-visible incident tracking.
Prompt: Implement structured runtime incident reporting end-to-end (runtime reporter + API + admin visibility + tests + docs) while preserving no-crash runtime behavior.
Result: Added runtime incident schema/reporting in JS runtime boundaries, backend ingestion/persistence, admin incidents integration, and automated tests covering ingestion/query/safety paths.
Improvement: Runtime failures remain non-fatal and now become actionable operational signals in admin monitoring.
New Version: For all runtime safety fixes, require explicit incident recording pipeline and admin visibility—not silent no-op behavior.

Date: 2026-02-24
Problem: End-to-end runtime QA failed because tool pages returned 500 when PostgreSQL was unavailable, and JS test runner overlap caused false negatives.
Prompt: Enforce runtime survivability under dependency outage (content DB optional at render time), preserve legacy URL contracts, and isolate JS test runners by scope.
Result: Added fail-closed content repository behavior (warning + null), legacy `-tools` category alias normalization, and Jest test scoping to `tests/js` only.
Improvement: Tool runtime remains reachable for all manifest tools during DB outage and CI signal quality improved by eliminating Vitest/Playwright-Jest collisions.
New Version: Treat content DB as optional for runtime page render; enforce test-runner isolation whenever introducing additional JS suites.

Date: 2026-02-24
Problem: `npm run test:js` crashed in Node/Jest when runtime incident reporting called `fetch` during fallback/error flows.
Prompt: Preserve runtime self-healing by treating incident transport as optional; guard network reporters and add regression coverage for environments without `fetch`.
Result: Added fetch-availability guards in runtime incident reporter, added vitest safety coverage, and aligned logger expectation test with structured `channel` metadata.
Improvement: Runtime error paths no longer throw in non-browser environments and JS test stability improved without reducing incident fidelity in browsers.
New Version: For any runtime observability path, require transport capability detection and non-throwing degradation tests.
