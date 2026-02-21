# SEO_SAFE_ZONES

## Objective
Define where SEO content can be appended without violating runtime contracts.

## TYPE A — Static info pages

### Safe for SEO content
- Add new semantic sections after existing `static-page__section` blocks.
- Extend FAQ blocks with additional `article.static-page__faq-item` entries.
- Add internal-link sections (related tools, learn-more paths, legal/resource hubs).
- Add concise trust/proof sections where no hardcoded JS selectors are referenced.

### Unsafe / caution
- Home page: do not rename/remove IDs used by inline discovery logic (`toolSearch`, `featuredGrid`, `trendingTools`, `recentTools`, `recentRow`, `heroTypewriter`).
- Contact page: do not rename/remove `contactForm`, `contactStatus`, `messageCounter`, field IDs, or `[data-error-for]` mappings.
- Preserve `[data-reveal]` and `[data-dynamic-stat]` where motion/widget behavior is expected.

---

## TYPE B — Tool index/search pages

### Safe for SEO content
- Intro copy above filter toolbar (`/tools`) as additional explanatory paragraph(s).
- Category-level explanatory text in each `data-tool-group` as static prose block.
- Append “How to choose the right tool” and “Related categories” sections below grids.
- Add FAQ section below listing containers (outside live filter containers).

### Unsafe / caution
- Do not change/remove:
  - `#toolsSearchInput`
  - `[data-category-filter]`
  - `[data-density]`
  - `[data-tool-group]` + `data-category`
  - `.tool-card[data-tool-slug]` data payload
- Avoid inserting bulky content inside `.tool-grid` where filter code toggles card visibility.

---

## TYPE C — Tool runtime pages

### Safe for SEO content
- **Primary safe zone:** `article.tool-seo` in `ToolShell` (SSR docs area).
- Safe appendable sections inside docs article:
  - extended guide/how-to narrative
  - additional examples
  - FAQ expansion
  - use-case expansion
  - related-tools clusters
- Supplemental copy can be inserted adjacent to existing docs sections, keeping heading hierarchy (`h2` then `h3`).

### Unsafe / caution
- Do not mutate runtime container identity:
  - `#tool-root`
  - `data-tool-root`
  - `data-tool-slug`
- Do not inject editorial markup into runtime templates in a way that interferes with runtime alias detection (`.tool-page`, `.tool-layout`, `#inputEditor`, `#outputField`, action button regions).
- Do not alter `window.ToolNexusConfig` key names or structure.

---

## Cross-cutting insertion policy
- Keep SEO copy **outside** interactive roots and query-selected control clusters.
- Prefer appending new content sections at the end of content articles, not between control elements and their dependent status nodes.
- If a block has IDs/classes queried by JS, treat it as immutable unless runtime contract is updated first.
