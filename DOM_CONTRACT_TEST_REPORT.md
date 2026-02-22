# DOM Contract Test Report

## Coverage delivered
- TYPE A contracts: home discovery IDs and contact form IDs.
- TYPE B contracts: tools search/filter selectors and tool-card data attributes.
- TYPE C contracts: runtime mount root, runtime body selectors, and config object keys.

## Enforcement behavior
- Missing selector causes immediate test failure.
- Missing runtime config fields (`apiBaseUrl`, `toolExecutionPathPrefix`, `runtimeModulePath`, `tool.slug`) fails TYPE C checks.

## Test entrypoint
- `tests/playwright/contracts/dom-contract.spec.js`
