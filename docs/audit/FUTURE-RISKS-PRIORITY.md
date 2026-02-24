# Future Risks Priority Matrix

## HIGH
1. **Dependency security debt (npm vulnerabilities)**
   - 1 high + 6 moderate vulnerabilities reported during `npm ci`.
   - Risk: supply-chain or runtime security exposure if left unpatched.

2. **Error observability ambiguity for late pipeline failures**
   - Improved by this change, but other middlewares may still produce overlapping error semantics.

## MEDIUM
1. **No default `npm test` entrypoint**
   - Team/CI inconsistency risk.
2. **Tool manifest mismatch for dotnet tools**
   - Local onboarding friction and inconsistent dev setup.
3. **Runtime transitional adapters**
   - Complexity growth if modern lifecycle migration is not completed.

## LOW
1. **Console warnings for NO_COLOR/FORCE_COLOR during playwright runs**
   - Noise only; no functional breakage observed.
2. **Deprecated npm packages in dev test toolchain**
   - Mostly operational debt, currently non-blocking for runtime correctness.
