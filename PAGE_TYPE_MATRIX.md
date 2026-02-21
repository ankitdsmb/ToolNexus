# PAGE_TYPE_MATRIX

## Scope and method
This classification is based on the active MVC route map plus rendered Razor views currently used by those routes.

## Type definitions
- **TYPE A — Static info pages**: primarily editorial/legal/support content with minimal or no runtime tool execution.
- **TYPE B — Tool index/search pages**: catalog and filtering UX used to discover tools.
- **TYPE C — Tool runtime pages**: pages that mount interactive tool runtime, templates, and execution JS.

## Matrix

| Route pattern | Primary view / handler | Type | Why this type | Runtime sensitivity |
|---|---|---|---|---|
| `/` | `Views/Home/Index.cshtml` | TYPE A | Marketing + discovery content; no per-tool runtime mount. | Medium (discovery widgets depend on stable IDs/data attrs). |
| `/about` | `Views/Home/About.cshtml` | TYPE A | Static informational content. | Low. |
| `/contact-us` | `Views/Home/ContactUs.cshtml` | TYPE A | Static support/feedback page with client-only form validation. | Medium (form IDs/data-error-for used by inline JS). |
| `/disclaimer` | `Views/Home/Disclaimer.cshtml` | TYPE A | Static legal content. | Low. |
| `/privacy` | `Views/Home/Privacy.cshtml` | TYPE A | Static legal/privacy content. | Low. |
| `/tools` | `Views/Tools/Index.cshtml` | TYPE B | Tool catalog/search/filter landing. | High (tools-grid selectors drive filtering and category state). |
| `/tools/{segment}` (category match) | `Views/Tools/Category.cshtml` | TYPE B | Category-specific tool listing grid. | Medium-High (grid/card selectors reused by tools-grid logic). |
| `/tools/{segment}` (tool slug match) | `Views/Tools/ToolShell.cshtml` | TYPE C | Dedicated tool page with runtime root and runtime bootstrap. | Critical (tool runtime contract + manifest/template/module loading). |

## Non-page endpoints observed (excluded from A/B/C)
- `/sitemap.xml` (XML output, not HTML page).
- `/tools/catalog` and `/tools/manifest/{slug}` (JSON APIs consumed by front-end/runtime).
- `/auth/login`, `/auth/logout` (auth flow endpoints; no dedicated rendered discovery surface in current UI).

## Practical mapping for later phases
- **Feedback / tool request insertion target:** `/contact-us` is the existing TYPE A surface that already has form semantics and conversion intent.
- **Primary SEO expansion surfaces:** TYPE A pages + TYPE B tool index/category + TYPE C SSR documentation panel in `ToolShell`.
- **Do not treat runtime API endpoints as content pages** in SEO rollout planning.
