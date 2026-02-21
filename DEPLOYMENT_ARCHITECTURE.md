# DEPLOYMENT_ARCHITECTURE

## Containerization
- A single `dockerfile` exists for publishing/running `ToolNexus.Api`.
- No `docker-compose.yml` found; multi-service local orchestration is absent.

## Service Boundaries
- Logical boundaries: Web app, API app, application/infrastructure libraries.
- Deployment artifact provided only for API service in repo root dockerfile.

## Env & Secret Management
- Configuration is appsettings-driven with env override support.
- Risks:
  - placeholder API key included in source config,
  - development JWT signing key in config,
  - missing explicit secret-store integration (Key Vault/Secrets Manager/Vault).

## Health Checks
- Container healthcheck hits `/health`.
- API exposes `/health`, `/ready`, `/metrics`.

## Scaling Readiness
- Positives: stateless API pattern, rate limiting, cache layering, health endpoints.
- Gaps: no compose/k8s manifests, no autoscaling policy artifacts, no distributed queue for heavy workloads.

## Critical Build Risk
- Dockerfile references `src/ToolNexus.Domain/ToolNexus.Domain.csproj`, but that project is absent in source tree; container builds will fail without correction.
