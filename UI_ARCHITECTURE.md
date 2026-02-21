# UI_ARCHITECTURE

## Frontend Stack
- Server-rendered Razor MVC (`ToolNexus.Web`) + modular ES modules in `wwwroot/js`.
- No React/Next.js; progressive enhancement model.

## Component Reuse Strategy
- Shared layout partials in `Views/Shared`.
- Tool pages centralized in `Views/Tools/ToolShell.cshtml` with manifest-driven runtime module loading.
- Tool-specific JS modules under `wwwroot/js/tools/*`.

## CSS Architecture
- Token-first CSS (`design-tokens.css`) + system-level styles (`ui-system.css`) + page/tool-specific CSS.
- Good separation, but token duplication exists (`space` and typography tokens redefined in multiple roots).

## Layout & Width Consistency
- Uses container tokens and page max widths, generally consistent.
- Dual max-width variables (`--container-max` vs `--page-max-width`) create long-term drift risk.

## Spacing Inconsistencies
- `--space-1` and `--space-2` both map to `8px`; `--space-3` and `--space-4` both `16px`.
- This weakens semantic spacing scale and can hide future UI debt.

## Duplicated UI Logic
- Significant parallel modules (`*.app.js`, `*.dom.js`, `*.api.js`) plus legacy and modern runtime adapters.
- This supports migration but increases maintenance complexity.

## SEO Architecture
- Strong SEO surface on tool pages: canonical URL, JSON-LD, long-form docs, FAQs, related tools.
- ToolShell embeds rich content sections for crawlability.

## Senior UI Audit Verdict
- **Strengths**: SEO depth, reusable shell, token system, mobile breakpoints.
- **Gaps**: token duplication, runtime complexity, high JS module sprawl, potential styling divergence over time.
