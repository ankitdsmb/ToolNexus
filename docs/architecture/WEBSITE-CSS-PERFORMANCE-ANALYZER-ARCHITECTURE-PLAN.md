# Website CSS Performance Analyzer — Complete Architecture Plan

## Discovery Inputs Used
This plan is based on the platform architecture and runtime/data constraints already documented in:
- `docs/audit/FULL-IMPLEMENTATION-AUDIT-2026-02-26.md` (solution architecture and runtime/worker realities)
- `docs/ARCHITECTURE-MASTER-CONTEXT.md` (immutable execution/governance/runtime constraints)
- Existing CSS services and security middleware in `src/ToolNexus.Web/Services/*` and `src/ToolNexus.Web/Middleware/ToolSecurityMiddleware.cs` (current implementation baseline)

---

## 1) Execution Architecture

### Step 1 — Tool Type Classification
**Classification: C) server-side processing tool (with hybrid UI consumption).**

**Why:**
- External website scanning and multi-page crawl require trusted network egress and SSRF controls that cannot be safely delegated to browsers.
- Playwright browser automation, selector-level analysis, and optimized CSS generation are CPU/memory intensive and must run in controlled worker capacity.
- Public report pages and downloadable artifacts require persisted server-side outputs.
- The ToolNexus architecture lock requires governed execution and observability through platform layers, which aligns with server-side execution.

### Step 2 — Execution Location
**Recommended split:**
- **ToolNexus.Web:** host tool shell UI + SEO report pages + cached read models.
- **ToolNexus.Api:** authoritative analyze/download/compare APIs and execution admission.
- **Background worker:** heavy Playwright crawling, coverage extraction, optimization, and persistence.

**Safest model:** request/acknowledge pattern.
1. UI submits `analyze` command.
2. API validates/governs and enqueues scan.
3. Worker performs scan and writes results.
4. UI polls result endpoint.

This prevents request-thread blocking and reduces API timeout/DoS exposure.

### Step 3 — Playwright Architecture
- **Browser lifecycle:**
  - One long-lived browser process per worker instance.
  - One isolated browser context per scan.
  - One page instance per crawled URL.
  - Always close page/context in `finally` blocks.
- **Pooling strategy:**
  - Worker-level pool of Chromium contexts (not browsers) to avoid expensive browser cold starts.
  - Recycle context after each scan, never share context across scans.
- **Concurrency limits:**
  - `max concurrent scans per worker = 3`.
  - `max pages per scan = 5`.
  - `max concurrent page navigations per scan = 1` (sequential crawl for stability and deterministic ordering).
- **Timeout limits:**
  - per navigation timeout: 10s.
  - per page render/settle: 2s.
  - full scan hard timeout: 60s.
  - compare operation (two scans): 2 x 60s with reuse of cached prior scans when available.

### Step 4 — Crawler Design
Crawler rules:
- max pages = 5.
- same-domain only.
- canonical URL normalization for duplicate prevention.
- ignore external links and non-http(s) schemes.

Flow:
1. Seed queue with normalized root URL.
2. BFS traversal (depth-capped, e.g., 2).
3. For each page, Playwright loads page and extracts anchor hrefs.
4. Resolver keeps only same-origin links.
5. De-duplicate by normalized key (`scheme + host + normalized path + sorted query`).
6. Stop when queue empty or `pages == 5`.

### Step 5 — CSS Coverage Strategy
Use **dual signal strategy**:

1. **Rule-level usage (coverage engine):**
   - CDP/coverage tells which stylesheet ranges were used.
   - Produces high-confidence used-byte and used-rule metrics.

2. **Selector-level detection:**
   - Parse stylesheet AST.
   - Split complex selectors and test selector matches against DOM snapshots.
   - Track per-selector usage counts across crawled pages.

**Data flow:**
`crawl pages -> collect stylesheet text + coverage ranges + DOM snapshots -> normalize + parse AST -> map ranges to rules -> map rules to selectors -> aggregate usage metrics`

### Step 6 — Framework Detection
Use weighted heuristics (multi-signal, confidence score):

- **Bootstrap signals:** `.container(-fluid)?`, `.row`, `.col-`, `.btn`, `.navbar`, bootstrap CSS variables (`--bs-`).
- **Tailwind signals:** utility prefixes (`sm:`, `md:`, `lg:` escaped in selectors), classes like `.flex`, `.items-center`, `.bg-`, `.text-`, and CSS var patterns (`--tw-`).
- **Foundation signals:** `.grid-x`, `.cell`, `.callout`, `.top-bar`, `.reveal`.

Detection logic:
- Score framework when selector + variable + file-name hints pass thresholds.
- If two frameworks exceed threshold, report `mixed` with per-framework confidence.
- Persist both `primary_framework` and `framework_signals` JSON.

### Step 7 — CSS Optimization Engine
Pipeline:
1. Parse CSS to AST.
2. Mark selectors as `used`, `unused`, or `unknown`.
3. **Selector filtering:** remove only selectors with strong unused evidence across all crawled pages.
4. **Rule removal:** remove whole rule only when every selector in rule is removable and rule is not protected.
5. **Preserve media queries:** keep `@media` wrappers; prune inner rules selectively.
6. **Preserve keyframes/font-face/layer:** always keep `@keyframes`, `@font-face`, `@property`, `@layer` declarations unless explicitly proven dead by reference graph.
7. Emit optimized CSS + source map metadata for report auditability.

Safety mode defaults to conservative removal and exposes aggressive mode only as explicit user option.

---

## 2) Service Architecture

### Runtime Integration (Step 15)
UI must integrate with ToolShell runtime contract:
- Input pane: URL + optional compare domain + advanced options (max pages fixed at 5).
- Output pane: progress timeline, score cards, framework detection, selector/rule breakdown, download actions.
- Follow-up action bar: rerun, compare, open public report, download optimized CSS.

Execution status model:
- `queued -> running -> completed | failed | timed_out`.
- Polling endpoint every 2s until terminal state.

### Step 10 — Public Report Pages
Routes:
- `/tools/css-report/{domain}`
- `/tools/css-report/{domain}/{scanId}` (immutable historical snapshot)

SEO strategy:
- canonical URL based on latest stable scan.
- server-rendered metadata (title, description, og tags, structured data for report stats).
- shareable deep links with immutable scan IDs.

### Step 11 — Website Comparison Engine
Route:
- `/tools/css-compare/{domainA}-vs-{domainB}`

Design:
- Try reuse latest fresh cached scans (<24h).
- If stale/missing, queue scans for missing side(s).
- Comparison read model computes:
  - efficiency delta
  - framework difference
  - unused CSS delta
  - selector entropy/composition differences

---

## 3) Database Schema

### Step 8 — Proposed Schema (PostgreSQL)

**`css_scan_runs`**
- `id uuid pk`
- `requested_by_ip inet null`
- `domain text not null`
- `normalized_url text not null`
- `status text not null`
- `scan_started_at timestamptz null`
- `scan_completed_at timestamptz null`
- `scan_time_ms int null`
- `pages_scanned int not null default 0`
- `total_css_size_bytes int not null default 0`
- `used_css_size_bytes int not null default 0`
- `unused_css_size_bytes int not null default 0`
- `efficiency_score numeric(5,2) not null default 0`
- `primary_framework text null`
- `framework_detected text[] not null default '{}'`
- `framework_signals jsonb not null default '{}'::jsonb`
- `summary jsonb not null default '{}'::jsonb`
- `error_code text null`
- `error_message text null`
- `created_at timestamptz not null`

**`css_scan_pages`**
- `id uuid pk`
- `scan_run_id uuid fk -> css_scan_runs.id`
- `page_url text not null`
- `page_path text not null`
- `total_rules int not null`
- `used_rules int not null`
- `unused_rules int not null`
- `created_at timestamptz not null`

**`css_selector_metrics`**
- `id uuid pk`
- `scan_run_id uuid fk`
- `selector text not null`
- `rule_hash text not null`
- `used_count int not null`
- `matched_pages int not null`
- `is_removed bool not null`
- `created_at timestamptz not null`

**`css_artifacts`**
- `id uuid pk`
- `scan_run_id uuid fk`
- `artifact_type text not null` (`optimized_css`, `raw_report`, `download_bundle`)
- `storage_path text not null`
- `sha256 text not null`
- `byte_size int not null`
- `expires_at timestamptz null`
- `created_at timestamptz not null`

**`css_comparisons`**
- `id uuid pk`
- `left_scan_id uuid fk`
- `right_scan_id uuid fk`
- `domain_a text not null`
- `domain_b text not null`
- `winner_domain text null`
- `efficiency_diff numeric(6,2) not null`
- `summary jsonb not null`
- `created_at timestamptz not null`

### Indexing Strategy
- `css_scan_runs(domain, created_at desc)` for latest-by-domain retrieval.
- `css_scan_runs(status, created_at)` for worker/admin monitoring.
- GIN index on `framework_signals` for analytics filters.
- `css_scan_pages(scan_run_id)` and `css_selector_metrics(scan_run_id)` for report assembly.
- Unique dedupe key: `(domain, date_trunc('hour', created_at), status='completed')` optional to control scan storms.

### Step 9 — Caching Strategy
- Cache latest successful scan by domain for **24h**.
- Cache comparison payloads for **6h**.
- Cache keys:
  - `css:scan:domain:{domain}`
  - `css:scan:id:{scanId}`
  - `css:compare:{domainA}:{domainB}`
- Invalidation:
  - on new completed scan: invalidate domain cache + dependent comparisons.
  - on manual rerun request: bypass cache and refresh.
  - on artifact expiry: soft-remove download links from cached payload.

---

## 4) API Design

### Step 14 — Endpoints

1. `POST /api/tools/css/analyze`
   - request: `{ url, options?: { maxPages, mode } }`
   - response: `{ scanId, status: "queued", estimatedWaitSeconds }`

2. `GET /api/tools/css/result/{scanId}`
   - response: full scan status + metrics + report links.

3. `GET /api/tools/css/result/domain/{domain}`
   - response: latest successful scan summary for domain.

4. `POST /api/tools/css/download`
   - request: `{ scanId, type: "optimized_css" }`
   - response: signed/temporary download URL or stream.

5. `POST /api/tools/css/compare`
   - request: `{ domainA, domainB, forceRefresh?: false }`
   - response: `{ comparisonId, status, reportUrl }`

6. `GET /api/tools/css/compare/{comparisonId}`
   - response: computed comparison payload.

Standard response envelope:
- `requestId`
- `status`
- `data`
- `errors[]`
- `timingMs`

---

## 5) Security Model

### Step 12 — External Scanning Protections
- SSRF protection:
  - require absolute http/https URL.
  - DNS resolution and private/reserved CIDR denylist checks.
  - block loopback, link-local, RFC1918, `.local`, localhost.
  - re-resolve host before navigation to reduce DNS-rebinding risk.
- Rate limiting:
  - per-IP limits (e.g., 5 scans/hour baseline).
  - per-domain limits (e.g., 5 scans/hour baseline).
- IP abuse protection:
  - temporary blocklist escalation on repeated violations.
  - suspicious user-agent filtering on protected endpoints.
- Domain scanning limits:
  - only same-domain crawl for internal links.
  - page count capped to 5.
  - reject non-public targets.

---

## 6) Performance Protections

### Step 13 — Overload Prevention
- global worker scan concurrency cap (`N` workers * 3 scans/worker).
- strict crawler page cap (5).
- per-scan timeout (60s hard cutoff).
- Playwright resource blocking:
  - block video/font/large image requests during analysis mode.
  - allow CSS, HTML, and JS required for realistic rendering.
- backpressure:
  - queue depth threshold; reject with `429` when saturated.
- memory protection:
  - browser restart after configurable scan count (e.g., every 50 scans) to mitigate leaks.

---

## 7) Implementation Roadmap

### Step 16 — Phased Delivery
1. **Phase 1 — Contract + data model**
   - define API contracts, DB migrations, cache key strategy, status model.
2. **Phase 2 — Secure scan admission**
   - SSRF/rate/domain protections + enqueue pipeline.
3. **Phase 3 — Worker scan engine**
   - Playwright pooling, crawler, rule-level coverage collection.
4. **Phase 4 — Selector and framework analyzers**
   - selector metrics + framework detection confidence model.
5. **Phase 5 — Optimization engine + artifacts**
   - safe CSS pruning, downloadable output storage.
6. **Phase 6 — Public SEO reports + compare**
   - report pages, metadata, comparison read models.
7. **Phase 7 — Observability + hardening**
   - admin telemetry, incident dashboards, load/perf tuning.

### Step 17 — Risk Analysis & Mitigations
- **Runtime conflicts with ToolShell contract**
  - Mitigation: keep UI in runtime-required anchors only; add runtime integration tests.
- **Server overload from scan bursts**
  - Mitigation: queue admission limits + per-IP/domain throttles + cache reuse.
- **Playwright memory leaks**
  - Mitigation: strict disposal, context isolation, periodic browser recycle.
- **Crawler loops/URL explosions**
  - Mitigation: canonical dedupe + same-domain filter + max pages/depth.
- **False-positive CSS removals**
  - Mitigation: conservative defaults, preserve critical at-rules, expose confidence in report.

### Step 18 — Final Architecture Summary
- **Execution model:** server-authoritative analyze pipeline via API + background worker, with ToolShell UI polling and rendering.
- **Data flow:** request -> admission/security/governance -> queued scan -> Playwright crawl/coverage -> selector/framework analysis -> optimization -> persisted artifacts/read model -> API/report pages.
- **Security protections:** SSRF DNS/IP checks, user-agent/IP/domain rate controls, private network denial, scan scope constraints.
- **Performance protections:** bounded concurrency, strict timeouts, page caps, resource blocking, cache-first reuse, queue backpressure.
- **Integration points:** ToolShell runtime anchors, governed API endpoints, worker orchestration, PostgreSQL persistence, SEO route controllers, admin observability surfaces.

