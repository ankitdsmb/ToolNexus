# HTML_CONTRACT_MAP

## 1) Global shell contract (all rendered pages)

### Required layout structure
- `body > .app-shell` with three shell layers:
  - command layer (`_Header`)
  - workspace layer (`main.container` with `@RenderBody()`)
  - system layer (`_Footer`)
- Dynamic bootstrap script conditionally imports modules based on DOM presence:
  - `[data-tool-group], .tools-index` -> `tools-grid.js`
  - `.tool-page` -> `tool-page.js`
  - `[data-reveal], [data-dynamic-stat]` -> motion + dynamic widgets

### Unsafe-to-change zones
- Removing `.tools-index`, `[data-tool-group]`, or `.tool-page` class hooks breaks module auto-import decisions.
- Changing the existence semantics of `[data-reveal]` / `[data-dynamic-stat]` changes motion/widget initialization behavior.

---

## 2) TYPE A contract map (static/info pages)

## Home (`/`)
### Runtime selectors and IDs used by page script
- `#toolSearch`
- `#featuredGrid` with child `.card`
- `#trendingTools`
- `#recentTools`
- `#recentRow`
- `#heroTypewriter`
- `[data-counter]` + `[data-dynamic-stat]`
- card anchors with `data-tool-slug`, `data-title`, `data-description`

### Data attributes and behavioral anchors
- `[data-reveal]` triggers motion module import.
- `data-utility` chips support quick utility semantics.

### Unsafe zones
- Discovery widget region around `#featuredGrid`, `#trendingTools`, and `#recentTools`.
- Any element IDs referenced directly in inline script.

## Contact (`/contact-us`)
### Required form contract
- Form root: `#contactForm`
- Status region: `#contactStatus`
- Counter: `#messageCounter`
- Inputs: `#name`, `#email`, `#subject`, `#message`
- Error placeholders: `[data-error-for="name|email|subject|message"]`

### Unsafe zones
- Field IDs and `data-error-for` mappings (validation depends on exact key parity).

## About / Privacy / Disclaimer
- No page-specific script contract detected.
- Mostly semantic sections and FAQ markup.
- Lower runtime fragility.

---

## 3) TYPE B contract map (tool index/search pages)

## Tools index (`/tools`)
### Required selectors
- `#toolsSearchInput`
- `[data-category-filter]`
- `[data-density]`
- `[data-tool-group]` wrappers with `data-category`
- `.tool-grid`
- `.tool-card[data-tool-slug]`
- optional `[data-group-count]`, `[data-tool-usage]`

### Generated fallback behavior
- Empty-state node `[data-tools-empty-state]` is injected if absent.

### Unsafe zones
- Any class/attribute hooks above; these are directly queried in `tools-grid.js`.

## Category page (`/tools/{category}`)
### Required selectors (shared grid behavior)
- `.tool-grid#toolGrid`
- Tool cards from `_ToolCard` partial (must preserve `.tool-card[data-tool-slug]` and dataset payload)

### Unsafe zones
- Card data contract used for filtering and usage telemetry.

---

## 4) TYPE C contract map (tool runtime pages)

## Entry shell (`/tools/{tool-slug}` -> `ToolShell`)
### Required server-rendered mount root
- `#tool-root`
- `data-tool-root="true"`
- `data-tool-slug="{slug}"`

### Required runtime config object
- `window.ToolNexusConfig` with:
  - `apiBaseUrl`
  - `toolExecutionPathPrefix`
  - `runtimeModulePath`
  - `tool.slug`, `tool.title`, `tool.seoDescription`, `tool.exampleInput`, `tool.clientSafeActions`

### Required script bootstrap
- module script `~/js/tool-runtime.js`

### SSR docs container (non-runtime)
- `article.tool-seo` and internal sections (`overview`, `features`, `usage`, `examples`, `faq`, `use-cases`, `related`).

## Runtime DOM contract (post-template load)
Runtime validator requires these nodes somewhere under runtime scope:
- `[data-tool-root]`
- `[data-tool-header]`
- `[data-tool-body]`
- `[data-tool-input]`
- `[data-tool-output]`
- `[data-tool-actions]`

If missing, adapter attempts to map legacy aliases (`.tool-page`, `.tool-layout`, `#inputEditor`, `#outputField`, etc.) and can inject fallback nodes.

### Unsafe zones (critical)
- `#tool-root` element identity and `data-tool-*` attributes.
- Runtime template skeleton nodes used to infer legacy layout.
- Dependency loader tags (`script[data-runtime-dependency]`, `link[data-runtime-dependency-css]`) during execution.

---

## 5) Contract risk tiers
- **Tier 0 (Critical / do not alter in content pass):** runtime root and runtime data attributes, tool runtime bootstrap config, grid selectors.
- **Tier 1 (High):** page-level IDs referenced by inline scripts (`contact`, `home discovery`, tools search/filter).
- **Tier 2 (Low):** static legal/info prose blocks without script coupling.
