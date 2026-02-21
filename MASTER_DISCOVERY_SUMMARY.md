# MASTER_DISCOVERY_SUMMARY

## 1) Architecture Health Score
- **78 / 100**

## 2) UI Architecture Score
- **81 / 100**

## 3) Scalability Score
- **68 / 100**

## 4) Performance Risk Score
- **61 / 100** (higher = more risk)

## 5) Top 15 Critical Problems
1. Dockerfile references missing `ToolNexus.Domain` project.
2. README architecture no longer matches current source layout.
3. App-layer pipeline depends on HTTP context.
4. Pipeline step order collision at value `200`.
5. No dedicated AI provider gateway abstraction.
6. No provider fallback/scoring/quota model for future AI routing.
7. Secrets/default keys present in source config.
8. No compose/k8s deployment manifests in repo.
9. No distributed workload queue for heavy operations.
10. Large runtime orchestrator module increases maintenance cost.
11. Duplicated CSS token definitions can drift.
12. Multiple content sources can create SEO/content inconsistency.
13. No explicit load test suite for expected production traffic.
14. Node-local concurrency limiter limits cluster fairness.
15. Legacy+modern tool runtime duality increases defect surface.

## 6) Hidden Risks Discovered
- Behavior fragility from same-order pipeline steps.
- Silent config drift risk between documented and actual architecture.
- Operational blind spots for burst traffic and dependency degradation.

## 7) Safe Redesign Strategy (No Implementation)
- Phase A: Correct documentation/build drift and formalize architecture decision records.
- Phase B: Enforce strict pipeline ordering and relocate HTTP-specific checks to API boundary.
- Phase C: Introduce deployment manifests, secret-store integration, and production runbooks.
- Phase D: Add load/chaos/perf test pipelines and SLO dashboards.
- Phase E: If AI gateway is planned, add provider adapter contracts + routing strategy + quota subsystem as separate bounded context.

## 8) Refactor Priority Order
1. Fix Dockerfile/README drift.
2. Stabilize pipeline ordering and boundaries.
3. Harden config/secrets handling.
4. Add deployment orchestration artifacts.
5. Consolidate runtime module responsibilities.
6. Add scale/perf/security regression suites.

## 9) Bug-Risk Hotspots
- `ToolNexus.Application.Services.Pipeline` step orchestration.
- `ToolNexus.Web/wwwroot/js/tool-runtime.js` orchestration and fallback logic.
- Build/deploy assets (`dockerfile`, environment config).

## Exit Condition Validation
- Repository reviewed end-to-end at architecture level.
- No production logic rewritten.
- Discovery artifacts generated to support safe redesign planning.
