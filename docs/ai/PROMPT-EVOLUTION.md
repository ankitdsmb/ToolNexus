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

Date: 2026-02-24
Problem: Runtime Playwright audits failed because tool pages emitted repeated console errors from 404 POSTs to `/api/admin/runtime/logs`, and QA startup depended on local PostgreSQL availability.
Root Cause: Tool shell/runtime logger defaults hardcoded a runtime log endpoint that exists in API host but not Web host, so every runtime log attempt generated failed fetches; Playwright webserver inherited PostgreSQL defaults instead of an isolated test database.
Architecture Decision: Make client-side runtime log transport optional-by-default and explicitly environment-configurable; force Playwright host bootstrap to deterministic SQLite defaults to preserve startup survivability in local/CI environments.
Fix Implemented: Updated Playwright webserver launcher to inject SQLite provider/connection defaults, disabled implicit runtime log endpoint defaults in web runtime logger/incident reporter, and removed hardcoded ToolShell runtimeLogEndpoint injection to prevent non-existent endpoint calls.
Files Modified: scripts/playwright-webserver.mjs; src/ToolNexus.Web/wwwroot/js/runtime/runtime-logger.js; src/ToolNexus.Web/wwwroot/js/runtime/runtime-incident-reporter.js; src/ToolNexus.Web/Views/Tools/ToolShell.cshtml
Tests Executed: npm run test:runtime; npm run test:js; npx playwright test tests/playwright; dotnet test ToolNexus.sln
Result: Full mandatory QA suite passes, runtime console guard is clean for tool routes, and Playwright startup no longer depends on external PostgreSQL.
Next Recommendation: Add a dedicated web-host endpoint capability contract test to assert configured runtime log endpoints resolve before enabling client log transport.

Date: 2026-02-24
Problem: Admin authentication was incomplete (`GET /auth/login` only), preventing any authenticated admin access despite policy-protected routes.
Prompt: Implement production-safe admin auth foundation with secure login POST, proper access-denied behavior, startup identity bootstrap, and startup-orchestration alignment.
Result: Integrated ASP.NET Core Identity, added antiforgery-protected login flow with lockout-aware credential validation, created `AdminIdentitySeedHostedService` startup phase after DB migration, and routed forbidden users to `/auth/access-denied`.
Improvement: Admin authorization remains strict while authentication is now functional, auditable, and environment-configurable (no hardcoded credentials).
New Version: Any admin-area authorization work must include end-to-end identity bootstrap + login + forbidden UX validation and startup-phase ordering evidence.
