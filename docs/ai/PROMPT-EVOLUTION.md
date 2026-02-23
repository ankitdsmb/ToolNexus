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
