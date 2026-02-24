# Admin Authentication Architecture

```mermaid
flowchart TD
    A[Browser requests /admin] --> B[AuthZ policy AdminRead/AdminWrite]
    B -->|Unauthenticated| C[/auth/login]
    C --> D[POST /auth/login + antiforgery]
    D --> E[Identity SignInManager.PasswordSignInAsync]
    E -->|Success| F[Issue ToolNexus.Auth cookie]
    F --> G[/admin/dashboard]
    B -->|Authenticated but missing claim| H[/auth/access-denied]
    I[StartupOrchestrator] --> J[DB migration phase]
    J --> K[AdminIdentitySeedHostedService]
    K --> L[Create/verify admin user + claims from env/secrets]
```

## Dev vs Production modes
- **Development:** missing `AdminBootstrap` credentials logs warning and skips seeding to keep local startup flexible.
- **Production:** missing `AdminBootstrap` credentials throws startup error, preventing insecure deployment.

## Required configuration
- `AdminBootstrap__UserName`
- `AdminBootstrap__Email`
- `AdminBootstrap__Password`
- Optional: `AdminBootstrap__DisplayName`
