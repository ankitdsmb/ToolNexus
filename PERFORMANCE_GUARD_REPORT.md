# Performance Guard Report

## Guard design
- Runtime mount timing can be measured from navigation to runtime selectors (`#tool-root` + `[data-tool-output]`).
- Layout-shift risk is indirectly guarded through screenshot diffs across desktop/tablet/mobile.
- Page load stability is enforced through HTTP response checks and `networkidle` wait strategy.

## Warning policy
- Treat sustained mount-time increase or repeated visual shifts as warnings for regression triage.
- Promote to failure in CI if project sets tighter SLA thresholds in future tuning.
