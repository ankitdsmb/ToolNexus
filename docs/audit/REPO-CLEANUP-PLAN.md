# Repo Cleanup Plan (Safe Mode)

## Candidate Artifacts Identified
- `coverage/`
- `test-results/`
- `tests/playwright/report/`
- `src/ToolNexus.Web/logs/`
- `src/ToolNexus.Web/toolnexus-playwright.db`
- `node_modules/`

## Validation Criteria
- Generated-only artifacts from test/build runs.
- Not referenced by source control as required runtime assets.
- Reproducible via restore/install commands.

## Actions Taken
- Removed all generated artifacts above after test execution.
- Kept source + documentation + scripts intact.

## Deferred Cleanup (Needs Team Decision)
- Consolidate tool manifest to `.config/dotnet-tools.json` or update onboarding docs.
- Evaluate deprecated npm dependencies and schedule upgrade campaign.
