# Website CSS Performance Analyzer — Implementation Contract & Component Design

## Required Discovery Artifacts Reviewed
This implementation contract is constrained by the existing platform reports and architecture locks:
- Runtime lifecycle + ToolShell/runtime constraints in `docs/architecture/CRITICAL-TOOL-LIFECYCLE-DISCOVERY.md` and `docs/runtime/Tool-Runtime-Architecture.md`.
- Solution architecture and execution/governance/worker realities in `docs/audit/FULL-IMPLEMENTATION-AUDIT-2026-02-26.md`.
- Data/execution immutability and PostgreSQL requirements in `docs/ARCHITECTURE-MASTER-CONTEXT.md`.
- Tool-specific baseline in `docs/architecture/WEBSITE-CSS-PERFORMANCE-ANALYZER-ARCHITECTURE-PLAN.md`.

---

## Step 1 — Tool Type Confirmation

**Final classification: Server-side execution tool (with ToolShell UI client for orchestration/rendering).**

### Why this must be server-side
1. **SSRF-safe network egress** must be controlled in trusted infrastructure; browser-side scans cannot enforce private-network blocking reliably.
2. **Playwright crawl + CSS coverage + selector analysis** are compute/memory heavy and must be bounded by worker concurrency controls.
3. **Persistent artifacts and public SEO reports** require server-owned storage and durable records.
4. **Platform governance model** requires server-side admission, telemetry, and execution observability.

---

## Step 2 — Tool Execution Flow (UI → API → Worker → Result)

1. **User submits URL** in ToolShell input pane.
2. **UI sends** `POST /api/tools/css/analyze` with URL + options.
3. **API admission layer validates** URL, applies SSRF/rate/quota policy, normalizes domain.
4. **API creates `CssScanJob`** with `Queued` status and enqueue metadata.
5. **Worker dequeues next job** respecting global + per-worker concurrency caps.
6. **Worker runs Playwright scan** (browser context per scan, BFS same-domain crawl up to 5 pages).
7. **Analyzer computes metrics** (coverage bytes, selector usage, framework detection, optimizer output).
8. **Persistence layer writes** `CssScanResult`, `CssScanPage`, `CssSelectorMetric`, `CssArtifact`.
9. **Cache layer updates** `css:scan:domain:{domain}` (24h TTL) and `css:scan:id:{scanId}`.
10. **UI polls** `GET /api/tools/css/result/{scanId}` every 2s until terminal state.
11. **UI renders results** and enables compare/download/report actions.

Terminal statuses: `Completed | Failed | TimedOut | Blocked`.

---

## Step 3 — Tool UI Runtime Integration (ToolShell Anchors)

The module must bind only inside canonical runtime anchors:
- `data-tool-shell`
- `data-tool-context`
- `data-tool-input`
- `data-tool-status`
- `data-tool-output`
- `data-tool-followup`
- `data-tool-content-host`

### Layout contract
- **Input (`data-tool-input`)**
  - URL input
  - Optional compare domain input
  - Scan mode toggle (`standard`, `conservative-optimize`)
  - Submit button
- **Status (`data-tool-status`)**
  - Job state badge (`Queued`, `Running`, `Completed`, `Failed`, `TimedOut`)
  - progress text (`2/5 pages crawled`)
  - elapsed timer
- **Output (`data-tool-output`)**
  - score cards (efficiency, total/used/unused CSS)
  - framework detection confidence
  - top unused selectors + page-level table
  - optimization summary + warnings
- **Follow-up (`data-tool-followup`)**
  - `Re-run`
  - `Compare domains`
  - `Open report page`
  - `Download optimized CSS`
  - `Download raw JSON`
- **Content host (`data-tool-content-host`)**
  - progressive rendering container for result modules/charts.

No ToolShell structure mutation is permitted.

---

## Step 4 — API Contract

All endpoints use envelope:
```json
{
  "requestId": "string",
  "status": "ok|error",
  "data": {},
  "errors": [],
  "timingMs": 0
}
```

### 1) `POST /api/tools/css/analyze`
Request:
```json
{
  "url": "https://example.com",
  "options": {
    "maxPages": 5,
    "mode": "standard",
    "forceRefresh": false
  }
}
```
Response:
```json
{
  "requestId": "...",
  "status": "ok",
  "data": {
    "scanId": "uuid",
    "domain": "example.com",
    "jobStatus": "Queued",
    "pollUrl": "/api/tools/css/result/{scanId}",
    "estimatedWaitSeconds": 15
  },
  "errors": [],
  "timingMs": 12
}
```

### 2) `GET /api/tools/css/result/{scanId}`
Response `Running`:
```json
{
  "data": {
    "scanId": "uuid",
    "status": "Running",
    "progress": {
      "pagesScanned": 2,
      "maxPages": 5,
      "elapsedMs": 21400
    }
  }
}
```
Response `Completed` includes:
- summary metrics
- framework detection
- per-page results
- artifacts/download tokens
- public report URL.

### 3) `GET /api/tools/css/result/domain/{domain}`
Returns latest cached or persisted successful scan for the normalized domain.

### 4) `POST /api/tools/css/download`
Request:
```json
{
  "scanId": "uuid",
  "artifactType": "optimized_css"
}
```
Response:
```json
{
  "data": {
    "downloadUrl": "/api/tools/css/download/{token}",
    "expiresAtUtc": "2026-03-04T12:00:00Z"
  }
}
```

### 5) `POST /api/tools/css/compare`
Request:
```json
{
  "domainA": "site-a.com",
  "domainB": "site-b.com",
  "forceRefresh": false
}
```
Response:
```json
{
  "data": {
    "comparisonId": "uuid",
    "status": "Ready|Queued",
    "leftScanId": "uuid",
    "rightScanId": "uuid",
    "reportUrl": "/tools/css-compare/site-a.com-vs-site-b.com"
  }
}
```

---

## Step 5 — Database Model (EF Core)

All entities use UUID primary keys and UTC timestamps.

### `CssScanJob`
- `Id` (PK)
- `Domain` (indexed)
- `NormalizedUrl`
- `RequestedByIp`
- `Status` (indexed)
- `AttemptCount`
- `QueuedAtUtc` (indexed)
- `StartedAtUtc`
- `CompletedAtUtc`
- `FailureCode`
- `FailureMessage`

Indexes:
- `(Status, QueuedAtUtc)` for dequeue
- `(Domain, QueuedAtUtc DESC)` for domain quota checks.

### `CssScanResult`
- `Id` (PK)
- `ScanJobId` (FK unique → `CssScanJob.Id`)
- `Domain` (indexed)
- `EfficiencyScore`
- `TotalCssBytes`
- `UsedCssBytes`
- `UnusedCssBytes`
- `OptimizationPotentialBytes`
- `PrimaryFramework`
- `FrameworkSignalsJson`
- `SummaryJson`
- `CreatedAtUtc` (indexed)

Indexes:
- `(Domain, CreatedAtUtc DESC)`
- `(EfficiencyScore)` optional analytics index.

### `CssScanPage`
- `Id` (PK)
- `ScanResultId` (FK → `CssScanResult.Id`)
- `Url`
- `Path`
- `Depth`
- `TotalRules`
- `UsedRules`
- `UnusedRules`
- `CreatedAtUtc`

Indexes:
- `(ScanResultId)`
- `(ScanResultId, Path)`.

### `CssSelectorMetric`
- `Id` (PK)
- `ScanResultId` (FK → `CssScanResult.Id`)
- `Selector`
- `RuleHash`
- `MatchedPages`
- `UsedCount`
- `UnusedConfidence`
- `IsRemovedInOptimized`
- `CreatedAtUtc`

Indexes:
- `(ScanResultId)`
- `(ScanResultId, RuleHash)`
- `(UnusedConfidence DESC)`.

### `CssArtifact`
- `Id` (PK)
- `ScanResultId` (FK → `CssScanResult.Id`)
- `ArtifactType` (`optimized_css`, `raw_report`, `comparison_json`)
- `StoragePath`
- `Sha256`
- `ByteSize`
- `ExpiresAtUtc`
- `CreatedAtUtc`

Indexes:
- `(ScanResultId, ArtifactType)`
- `(ExpiresAtUtc)`.

> Register all entities under `ToolNexusContentDbContext` with fluent configs and PostgreSQL-compatible mappings.

---

## Step 6 — Background Worker Design

Hosted-service pattern:
- `CssScanQueueHostedService` (dequeue loop)
- `CssScanProcessor` (job orchestration)

Responsibilities:
1. reserve queued job atomically
2. transition status `Queued -> Running`
3. execute scan pipeline
4. persist results + artifacts
5. transition terminal state
6. emit metrics/logs.

### Concurrency and retries
- **Per worker concurrency:** 3 active scans.
- **Retry policy:** max 2 retries for transient failures (navigation timeout, temporary DNS failure).
- **No retry** for blocked/private-network/validation failures.
- **Backoff:** exponential (`5s`, `15s`).
- **Hard timeout:** 60s total scan; mark `TimedOut`.

---

## Step 7 — Playwright Execution Model

1. Single browser instance per worker process.
2. New isolated browser context per scan.
3. One page object per crawled URL (sequential navigation).
4. Resource controls: block heavy non-essential assets when safe.
5. Cleanup in `finally`: close page(s), close context, recycle browser on threshold.

Limits:
- `maxPages = 5`
- `maxScanDuration = 60 seconds`
- `navigationTimeout = 10 seconds` per page.

---

## Step 8 — Crawler Algorithm

Traversal: **BFS, same-domain only, deduped**.

Queue record:
```text
QueueItem {
  Url: string,
  Depth: int,
  ParentUrl: string?
}
```

Algorithm:
1. Normalize seed URL.
2. Enqueue seed (`depth=0`), add to `visited` set.
3. While queue not empty and scanned pages < 5:
   - dequeue item
   - load page
   - collect links
   - normalize/filter links to same-domain http/https
   - enqueue unseen links (depth+1)
4. End when cap reached or queue exhausted.

---

## Step 9 — CSS Analysis Engine

Dual-source analysis:
1. **Coverage bytes/ranges** (rule-level used ranges).
2. **Selector matching** against rendered DOM snapshots.

Aggregates produced:
- `TotalCssSizeBytes`
- `UsedCssSizeBytes`
- `UnusedCssSizeBytes`
- `OptimizationPotentialBytes`
- `EfficiencyScore = Used / Total * 100` (bounded 0..100)

Result also includes per-page and per-selector breakdowns.

---

## Step 10 — CSS Optimizer Design

Optimization rules:
- remove selectors classified as confidently unused
- preserve `@media` wrappers while pruning only removable inner rules
- always preserve `@keyframes`, `@font-face`, `@property`, `@layer`
- keep syntax/ordering stable where possible for diffability

Output artifacts:
- optimized CSS text
- optimization manifest JSON (what was removed/kept and why)
- checksum + size reduction stats.

---

## Step 11 — Framework Detection Heuristics

Framework confidence scoring (0..1):
- selector signature hits
- CSS variable namespace hits
- filename/content hints
- normalized by total observed stylesheet signals.

Supported frameworks:
- **Bootstrap** (`.row`, `.col-*`, `.btn`, `--bs-*`)
- **Tailwind** (`--tw-*`, utility-class density patterns)
- **Foundation** (`.grid-x`, `.cell`, `.top-bar`)

Classification:
- highest score above threshold => `primaryFramework`
- multiple above threshold => `mixed` with per-framework scores.

---

## Step 12 — Caching

Cache key:
- `css:scan:domain:{domain}` (24h TTL)

Companion keys:
- `css:scan:id:{scanId}`
- `css:compare:{domainA}:{domainB}`

Invalidation:
1. completed new scan invalidates domain + related comparison entries
2. `forceRefresh=true` bypasses read-through cache
3. artifact expiration prunes stale download links from cached payload.

---

## Step 13 — Public SEO Report Pages

SSR route:
- `/tools/css-report/{domain}`

Optional immutable snapshot route:
- `/tools/css-report/{domain}/{scanId}`

Page includes:
- CSS efficiency score and summary cards
- unused CSS/selector report tables
- downloadable artifact links (optimized CSS/raw JSON)
- canonical metadata and structured data for shareability.

---

## Step 14 — Security Model

Protections (reusing `ToolSecurityMiddleware` + endpoint policy):
1. URL scheme allowlist (`http`, `https`).
2. SSRF guard via DNS resolution and CIDR denylist.
3. private/loopback/link-local network blocking.
4. per-IP rate limits.
5. per-domain scan quotas.
6. user/domain abuse throttling with temporary denylist.
7. re-resolve host on navigation to reduce DNS rebinding risk.

---

## Step 15 — Performance Protection

- global scan concurrency cap (bounded active scans)
- per-worker concurrency `<=3`
- page cap `<=5`
- queue depth limit (reject new scans with `429` when saturated)
- hard scan timeout `60s`
- periodic browser recycle after N scans.

---

## Step 16 — Observability

OpenTelemetry counters/histograms:
- `scan_started`
- `scan_completed`
- `scan_failed`
- `scan_duration_ms`

Dimensions:
- domain hash (not raw domain for privacy where required)
- status
- framework
- pages_scanned
- cache_hit (`true/false`).

Also log correlation IDs across API admission, worker execution, and artifact generation.

---

## Step 17 — Implementation Phases

1. **Phase 1:** EF models + migrations.
2. **Phase 2:** API endpoints + admission validators.
3. **Phase 3:** scan worker + queue.
4. **Phase 4:** crawler (BFS/same-domain/dedupe).
5. **Phase 5:** analysis engine (coverage + selectors + framework detection).
6. **Phase 6:** optimizer + artifact downloads.
7. **Phase 7:** SSR report pages + compare UX + telemetry hardening.

---

## Step 18 — Final System Summary

- **Execution model:** server-authoritative queued scan pipeline with ToolShell-driven polling UI.
- **Data flow:** UI request → secure API admission → queued job → worker crawl/analyze/optimize → persisted entities/artifacts → cached read model → API + SSR reports.
- **Security:** SSRF/private-network blocks, rate limits, quotas, middleware integration, rebinding mitigations.
- **Performance protections:** strict page/time/concurrency caps, queue backpressure, retry boundaries, browser lifecycle hygiene.
- **Runtime integration:** no shell mutation; strict usage of `data-tool-*` anchors for input/status/output/follow-up content.

