# Admin Auth Security Hardening

## Implemented controls
- Cookie security hardened with `HttpOnly=true`, `SameSite=Lax`, and `SecurePolicy=SameAsRequest`.
- Identity password policy and lockout are enabled.
- Admin claims are explicitly seeded (`tool_permission=admin:read/admin:write`).
- Access denied now routes to `/auth/access-denied` to avoid incorrect login redirects for authenticated users.

## Operational guidance
- Store `AdminBootstrap` secrets in environment variables or secret manager.
- Rotate the bootstrap admin password after first login and enforce MFA through upstream controls if required.
