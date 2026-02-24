# Refactor Next Steps

1. Consolidate middleware logging responsibilities with explicit ownership per concern (request, security, tool execution, exception).
2. Complete runtime lifecycle modernization to reduce legacy adapter dependence.
3. Normalize developer bootstrap commands (`dotnet tool restore`, `npm test`) to deterministic defaults.
4. Add CI gate for smoke playwright + runtime tests to catch regressions earlier.
