# Playwright Readiness URL Decision

## Selected URL
- **Readiness URL:** `http://127.0.0.1:5081/`
- **Configured readiness path:** `/`

## Decision Rationale
1. The root route is server-side rendered and returns HTML content, which matches the readiness requirement for a real page response.
2. It is safer than `/health` because no dedicated health endpoint exists in `ToolNexus.Web`.
3. It avoids host mismatch by consistently using `127.0.0.1` in both startup and Playwright `webServer.url`.

## Rejected Option
- `/tools` was considered but not chosen as the primary readiness target because `/` is the most universal, lowest-assumption route for app startup checks.
