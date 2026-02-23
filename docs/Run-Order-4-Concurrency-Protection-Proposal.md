# Run Order 4 — Concurrency Protection (Architecture Proposal)

## Scope

This proposal analyzes update/write flows for:

1. Tool definitions
2. Execution policies
3. Content editor graph

Constraint: **design only**. No implementation changes are included.

---

## 1) Current-state write flow analysis

## 1.1 Tool definitions

### Active write paths

- API write path: `PUT /api/admin/tools/{id}` maps directly to `IToolDefinitionService.UpdateAsync` and accepts mutable fields only (`SaveToolRequest`) with no version token or conditional header requirement.
- MVC write path: admin `ToolsController.Save` updates tool definition first, then writes execution policy in a second operation.
- Repository write path: `EfToolDefinitionRepository.UpdateAsync` loads entity by id, overwrites all mutable fields, sets `UpdatedAt = UtcNow`, and saves.

### Concurrency profile

- Reads are snapshot-style (`AsNoTracking`) for details/lists.
- Writes do not compare against a prior version value.
- `UpdatedAt` exists, but is informational only (not used as a compare-and-swap guard).

### Risk outcomes

- Last-write-wins on overlapping edits.
- Stale admin pages can silently overwrite newer data.
- Mixed outcome risk in MVC combined save (tool update success + policy update failure, or vice versa).

---

## 1.2 Execution policies

### Active write paths

- API write path: `PUT /api/admin/execution/{slug}` calls `IExecutionPolicyService.UpdateBySlugAsync`.
- MVC path: same policy update called from admin tool form save.
- Repository write path: `EfExecutionPolicyRepository.UpsertBySlugAsync` does create-or-overwrite for all policy fields and updates in-memory cache after commit.

### Concurrency profile

- Policy GET is cache-backed, but cache does not provide write conflict protection.
- No token (`Version`, ETag, rowversion/xmin) in request or response contract.
- Upsert operation has no stale-write condition.

### Risk outcomes

- Last-write-wins for timeout/rate-limit/execution enable flags.
- Incident response hazard: stale submit can unintentionally re-enable execution.
- Cached old reads can increase stale-submit probability within the UI lifecycle.

---

## 1.3 Content editor graph

### Active write paths

- UI path: content editor loads graph once on tab open via `GET /api/admin/content/{toolId}`, keeps it client-side, then saves entire graph via `PUT`.
- Repository write path: `EfToolContentEditorRepository.SaveGraphAsync` clears all collections (`Features`, `UseCases`, `Steps`, `Examples`, `Faq`, `RelatedTools`) and rebuilds from request payload.

### Concurrency profile

- Save model is full replace, not patch.
- No version token in `ToolContentEditorGraph`/`SaveToolContentGraphRequest`.
- Long-lived client graph increases stale window.

### Risk outcomes

- Highest-risk overwrite surface.
- Any stale save can remove unrelated updates from another editor because lists are fully replaced.
- Reordering + list mutation conflicts are especially destructive under concurrent edits.

---

## 2) Explicit overwrite/stale scenarios

## 2.1 Tool definitions

1. Admin A edits slug/category/status.
2. Admin B edits icon/sortOrder from older snapshot.
3. B saves later and silently reverts A’s slug/category/status.

Also: status toggle endpoint (`PATCH /status`) can race with full `PUT`, leading to confusing final status.

## 2.2 Execution policies

1. Operator A disables execution during outage.
2. Operator B (stale page) adjusts timeout with `IsExecutionEnabled=true` still selected.
3. B save re-enables execution unintentionally.

## 2.3 Content editor

1. Editor A adds FAQs and reorders steps.
2. Editor B edits features from stale snapshot.
3. B save clears and recreates graph, removing A’s updates.

## 2.4 Composite form (tool + policy)

The MVC form performs sequential writes for two distinct resources with no shared concurrency transaction semantics, so partial-update states are possible and hard to reason about operationally.

---

## 3) Optimistic concurrency architecture (proposed)

## 3.1 Resource boundaries

Introduce explicit optimistic concurrency per independently editable admin resource:

- `ToolDefinition`
- `ToolExecutionPolicy`
- `ToolContentGraph` (rooted at `ToolContent`)

Each resource has its own version token lifecycle.

## 3.2 Enforcement model

1. Every GET for mutable admin resource returns a `versionToken`.
2. Every write (PUT/PATCH/POST) requires matching token via payload field or `If-Match`.
3. Repository performs conditional update using concurrency token.
4. Token mismatch returns structured `409 Conflict` with current server representation.

## 3.3 Why optimistic (not locking)

- Current admin behavior is stateless request/response and occasionally long editing sessions.
- Pessimistic locks would be fragile for long-lived browser sessions and increase deadlock/abandonment complexity.
- OCC gives deterministic conflict detection with lower operational cost.

---

## 4) Version token strategy

## 4.1 Token design

- Token is **opaque** to clients (`string versionToken`).
- Internally backed by DB concurrency primitive:
  - PostgreSQL: `xmin` projection or explicit generated version column.
  - SQLite fallback: explicit integer/binary version column incremented on write.
- Wire encoding: base64 (or strong ETag-safe quoted token).

## 4.2 Schema strategy by resource

- `ToolDefinitions`: add concurrency column/property and mark as EF concurrency token.
- `ToolExecutionPolicies`: same pattern.
- `ToolContents`: add root concurrency token and ensure every graph mutation bumps root token.

## 4.3 Contract strategy

- Read DTOs include `VersionToken`:
  - `ToolDefinitionDetail`
  - `ToolExecutionPolicyModel`
  - `ToolContentEditorGraph`
- Write requests include required `VersionToken`.
- API may also emit `ETag` and accept `If-Match` for standards alignment.

## 4.4 Transitional compatibility

- Phase 1: optional token accepted + warning logs when missing.
- Phase 2: hard enforcement (428 Precondition Required or 400 fallback).
- Phase 3: remove non-token write path.

---

## 5) Conflict detection and response flow

## 5.1 Server flow

1. Client GETs resource and receives `versionToken=A`.
2. Client submits write with `versionToken=A`.
3. Server attaches original token and attempts save.
4. If token differs in DB, EF throws `DbUpdateConcurrencyException` (or zero-row conditional update).
5. Server loads latest state and responds with `409` conflict envelope.

## 5.2 Conflict envelope (proposed)

```json
{
  "error": "ConcurrencyConflict",
  "resource": "ToolDefinition",
  "resourceId": "42",
  "clientVersionToken": "A",
  "serverVersionToken": "B",
  "serverState": {},
  "changedFields": ["status", "category"],
  "message": "Resource was modified by another user. Refresh and reconcile changes."
}
```

For content graph, `changedFields` should be section-level at minimum (`features`, `steps`, `examples`, `faqs`, `useCases`, `relatedTools`).

## 5.3 Composite tool+policy submit handling

For admin MVC save:

- Include both tokens (`toolVersionToken`, `policyVersionToken`).
- Validate both before commit path.
- On conflict in either section, return an explicit split conflict view model instead of silent redirect.

---

## 6) Safe UI conflict handling

## 6.1 Baseline UX requirements

On conflict:

1. Preserve in-progress edits locally (memory + local storage draft).
2. Show persistent conflict banner.
3. Offer actions: reload latest, compare, re-apply.

## 6.2 Tool definition + policy forms

- Display per-field compare (`Your value` vs `Server value`).
- Let user choose per-field resolution before re-submit.
- Disable blind overwrite button.

## 6.3 Content editor UX (critical)

Because save is graph replacement today:

- Show section-level conflict summary and item counts changed.
- Build rebase helper:
  - start from latest server graph
  - replay local operations where non-overlapping
  - require manual decision on collisions (same item/section reorder conflict)

Minimum safe first release:

- no auto-merge,
- preserve draft,
- explicit manual reconcile workflow.

## 6.4 Proactive stale warning (recommended)

- Poll lightweight “head token” endpoint while edit tab is open.
- If token changes, warn user before save.
- Reduces surprise conflicts and support burden.

---

## 7) Migration impact

## 7.1 Database

- Add concurrency columns to `ToolDefinitions`, `ToolExecutionPolicies`, `ToolContents`.
- Backfill existing rows with initial tokens.
- Ensure provider parity (Postgres + SQLite test matrix).

## 7.2 Application/service layer

- Update model contracts to include `VersionToken`.
- Update service/repository method signatures to require token on writes.
- Add deterministic concurrency exception mapping.

## 7.3 API/Web clients

- Admin web forms and JS editor must store/send tokens and handle 409 responses.
- Any automation/integration clients using admin endpoints must be updated.

## 7.4 Testing and observability

- Add integration tests for two-writer conflict paths across all three resources.
- Add audit metadata for conflict outcomes (attempted token, current token, actor).
- Track conflict rate metrics to tune UX and detect hotspots.

---

## 8) Breaking change risks

## 8.1 API contract break risk (high)

Mandatory token on existing PUT/PATCH endpoints breaks old clients immediately.

Mitigation:

- versioned admin API routes or staged enforcement window.

## 8.2 UI behavioral change risk (medium)

Users accustomed to “save always works” will now see conflict states.

Mitigation:

- clear conflict UX and draft safety from day one.

## 8.3 Content semantics risk (medium/high)

OCC detects conflicts but does not automatically merge replacement-style graphs.

Mitigation:

- explicit user education and planned rebase assistant iteration.

## 8.4 Operational risk (low/medium)

Conflict frequency may increase under concentrated admin activity.

Mitigation:

- head-token staleness warnings,
- actionable conflict payloads,
- conflict metrics and alerting.

---

## 9) Recommended rollout sequence

1. **Schema + DTO groundwork**: add tokens, return on reads.
2. **Server OCC enforcement**: conditional writes + 409 envelope.
3. **UI safety**: conflict banner + draft preservation + manual reconcile flow.
4. **Hardening**: provider-parity tests, race simulations, conflict telemetry dashboards.

---

## 10) Decision summary

Current tool definition, policy, and content graph writes are all vulnerable to silent last-write-wins behavior, with content editor carrying the highest destructive overwrite risk. A unified optimistic concurrency model with required version tokens, deterministic conflict responses, and safe UI reconciliation is the recommended architecture. Migration is moderate-to-high impact due to contract changes, so phased rollout and compatibility strategy are essential.
