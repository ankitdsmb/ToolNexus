# Admin Authentication Architecture Report

## Existing pipeline analysis
- Middleware order in `ToolNexus.Web` is `UseRouting -> CorrelationId -> UseAuthentication -> UseAuthorization -> endpoint mapping`.
- Cookie auth is configured with `ToolNexus.Auth`, login challenge path `/auth/login`, and previously used `/auth/login` for access denied.
- Admin area route is `/admin/{controller=Dashboard}/{action=Index}/{id?}` and controllers enforce `AdminRead` / `AdminWrite` policies based on `tool_permission` claims.

## Root cause
- The app had only `GET /auth/login`; there was no credential validation, no sign-in call, and no identity store.
- Authorization challenge for admin endpoints redirected to `/auth/login`, but there was no way to establish an authenticated principal.
- Authenticated users missing admin claims were also redirected back to login, obscuring access-denied state and causing confusing navigation loops.

## Design decision
- **Option A selected:** ASP.NET Core Identity integration using EF Core store.
- Rationale: provides password hashing, lockout protections, sign-in management, and a production-safe identity lifecycle with startup seeding.
