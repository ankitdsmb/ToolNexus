# Integrity Script Environment Requirements

The integrity tooling relies on npm-managed dependencies and should always be executed in an environment prepared with `npm ci`.

## Required dependencies

- `purgecss` (required by `npm run integrity:css`)

`purgecss` is a required package dependency. If it cannot be imported, the `integrity:css` script exits with a clear error message instructing maintainers to install dependencies with `npm ci`.

## Recommended execution order

1. `npm ci`
2. `npm run integrity:css`
3. `npm run integrity:css-ownership`

This order ensures deterministic installs and consistent integrity results across CI and local environments.
