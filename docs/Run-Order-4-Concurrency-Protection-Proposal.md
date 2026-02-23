# Run Order 4 — Concurrency Protection (Architecture Proposal)

## Scope and constraints

This proposal analyzes current update flows for:

1. Tool definitions
2. Execution policies
3. Content editor graph

This is a **design-only** document. No implementation is included.

---

## 1) Current-state flow analysis

### 1.1 Tool definitions

**Current write path**

- Admin MVC form (`Admin/ToolsController.Save`) writes a tool definition and then writes policy in sequence. There is no version/etag parameter in either request shape. 
- API path (`api/admin/tools/{id}` PUT) forwards update requests with mutable fields only.
- Repository update (`EfToolDefinitionRepository.UpdateAsync`) loads row by id, mutates all mutable columns, then saves.

**Concurrency profile**

- Read phase uses `AsNoTracking` projection for edit payloads, so clients edit snapshots.
- Write phase does not include any compare-against token.
- `UpdatedAt` exists but is not used as a compare-and-swap condition.

**Risk summary**

- **Last-write-wins** on overlapping edits is guaranteed.
- A stale form submit can overwrite a recent admin change silently.
- Sequential tool+policy save in MVC can produce mixed state if one succeeds and the second fails.

### 1.2 Execution policies

**Current write path**

- API path (`api/admin/execution/{slug}` PUT) and MVC tool form path both call `ExecutionPolicyService.UpdateBySlugAsync`.
- Repository (`EfExecutionPolicyRepository.UpsertBySlugAsync`) does an upsert keyed by tool and saves entire policy.

**Concurrency profile**

- In-memory cache is read-through and updated after write.
- No version token in model or request.
- No conditional update predicate beyond identifying the row.

**Risk summary**

- **Last-write-wins** for policy tuning (timeouts, rate limits, enable flag).
- High operational impact: stale writes may unintentionally re-enable disabled execution or reset limits.
- Cache does not solve stale update; it only accelerates reads.

### 1.3 Content editor graph

**Current write path**

- Admin content tab fetches `/api/admin/content/{toolId}`, stores graph client-side, and later PUTs entire graph.
- Repository (`EfToolContentEditorRepository.SaveGraphAsync`) fully clears all child collections and recreates rows from request.

**Concurrency profile**

- Editor keeps a long-lived in-memory graph after first load.
- Save operation is destructive-replace (clear + rebuild), not patch/merge.
- No token, revision id, or conflict detection on save.

**Risk summary**

- **Highest stale overwrite risk** across all three flows.
- Two editors on same tool will race; second save can wipe additions/reordering from first.
- Because save is graph replacement, conflicts are coarse and can drop substantial user work.

---

## 2) Identified overwrite and stale-update scenarios

## 2.1 Tool definition scenarios

1. Admin A changes slug/category, Admin B changes icon/sort order from stale page.
2. B saves later; A’s slug/category can be reverted silently.
3. Toggle status endpoint can race with full form update and produce unexpected final status.

## 2.2 Policy scenarios

1. Operator A disables execution during incident response.
2. Operator B (stale page) updates timeout and leaves `IsExecutionEnabled=true`.
3. B save re-enables execution unintentionally.

## 2.3 Content editor scenarios

1. Editor A adds 3 FAQ items and reorders steps.
2. Editor B edits feature text from older snapshot.
3. B save clears/rebuilds graph and can erase A’s FAQ/reorder changes.

## 2.4 Cross-surface scenario (tool form saves tool + policy)

- MVC save performs two writes in sequence but not as one logical concurrency unit.
- If one write conflicts but the other succeeds, user sees partial success semantics.
- Observability/audit records become harder to reason about as a single “edit session”.

---

## 3) Proposed optimistic concurrency architecture

## 3.1 Design principles

1. **Optimistic concurrency everywhere** for admin writes.
2. **Explicit version token required** on mutable admin resources.
3. **Fail-fast on mismatch** with deterministic conflict payload.
4. **No silent merge on server** for multi-editor graph writes; server detects and returns conflict context.
5. **UI owns resolution** (reload, compare, selective apply).

## 3.2 Versioned resources

Treat each independently editable unit as versioned:

- Tool Definition resource
- Tool Execution Policy resource
- Tool Content Graph resource

For composite admin workflows (tool + policy), preserve independent tokens but support combined conflict response in MVC/API orchestration layer.

---

## 4) Version token strategy

## 4.1 Token shape

Use opaque string token surfaced as `versionToken` in JSON DTOs and as ETag-compatible header representation.

Recommended encoding:

- Backing value: DB-managed `rowversion/xmin` equivalent or monotonically changing binary stamp.
- Wire form: Base64 string.
- Client contract: opaque; never parsed client-side.

## 4.2 Storage strategy by domain

### Tool definitions

- Add concurrency column to `ToolDefinitions` (e.g., `byte[] RowVersion` with EF concurrency token).

### Execution policies

- Add concurrency column to `ToolExecutionPolicies`.

### Content graph

Use a **graph root token** on `ToolContents`.

- Add row-version token to `ToolContents` and bump it on any child collection mutation.
- Keep child-level item IDs for diff UX, but conflict gate is root token.

Rationale: editing model is full graph today; root token gives stable protection without requiring per-child OCC in v1.

## 4.3 API contract strategy

For each GET response of mutable admin resources:

- Include `versionToken` in body.
- Optionally mirror as `ETag` response header for standards alignment.

For each PUT/PATCH/POST update:

- Require `versionToken` in payload (or `If-Match` header).
- Reject missing token with 428 Precondition Required (or 400 if 428 rollout is too disruptive initially).

---

## 5) Conflict detection flow

## 5.1 Write algorithm (generic)

1. Client sends update with `versionToken` from latest GET.
2. Service maps token to original value and attaches entity with original concurrency value.
3. Repository attempts save.
4. If DB reports concurrency mismatch (`DbUpdateConcurrencyException`):
   - Reload current server state.
   - Return 409 Conflict with structured conflict envelope.

## 5.2 Conflict envelope contract (proposed)

```json
{
  "error": "ConcurrencyConflict",
  "resource": "ToolContentGraph",
  "resourceId": "tool:42",
  "clientVersionToken": "...",
  "serverVersionToken": "...",
  "serverState": { "...": "latest representation" },
  "changedFields": ["faqs", "steps"],
  "message": "Resource was modified by another user. Refresh and reapply your changes."
}
```

For tool and policy, `changedFields` can be computed by comparing client payload to current state.
For content graph, include coarse sets (`features`, `steps`, `examples`, `faqs`, `useCases`, `relatedTools`) at minimum.

## 5.3 MVC tool+policy orchestrated save behavior

When form saves both resources:

- Validate both tokens up front.
- Attempt updates in transactional boundary where practical.
- If either conflicts, return conflict model to view with:
  - section(s) in conflict
  - latest server values
  - user-submitted values
- Never auto-overwrite conflicted section.

---

## 6) Safe UI conflict handling

## 6.1 Baseline UX behavior

On conflict:

1. Preserve unsaved local edits in memory.
2. Show non-dismissive conflict banner.
3. Present actions:
   - **Reload latest** (discard local)
   - **Review diff**
   - **Apply my changes again** (rebase flow)

## 6.2 Tool definition and policy forms

- Field-level diff view: “Your value” vs “Current value”.
- Allow per-field choose-local/choose-server before resubmit.
- Disable blind “Save anyway”.

## 6.3 Content editor flow

Because graph saves are replacement-style:

- Show section-level diff counts (added/removed/edited/reordered).
- Provide merge assistant:
  - Start from latest server graph.
  - Replay local edits as operations where non-overlapping.
  - Flag overlapping operations for manual resolution.

Minimum safe fallback for first release:

- Keep local draft in browser storage.
- Force explicit manual reconcile on conflict.

## 6.4 Real-time staleness hints (optional, recommended)

- Poll lightweight “head version” endpoint while editor open.
- If server token changes, warn user before they click save.
- This reduces surprise conflicts without locking.

---

## 7) Migration impact

## 7.1 Database migrations

Required schema changes:

1. Add concurrency token column to `ToolDefinitions`.
2. Add concurrency token column to `ToolExecutionPolicies`.
3. Add concurrency token column to `ToolContents`.

Potential one-time backfill:

- Existing rows get generated token values automatically by DB defaults or first write.

## 7.2 Application + domain model changes

- Add `VersionToken` to response models (`ToolDefinitionDetail`, `ToolExecutionPolicyModel`, `ToolContentEditorGraph`).
- Add `VersionToken` to update request models.
- Service interfaces and repository signatures change to require tokens.

## 7.3 API and client impact

- Admin API consumers must supply token on writes.
- MVC pages and JS content editor must include token lifecycle (load/store/send/refresh on conflict).
- Contract tests needed for 409 conflict and 428/400 missing-token responses.

## 7.4 Observability and audit impact

- Audit entries should include:
  - prior token
  - new token
  - conflict outcome metadata (when conflict occurs)

This improves forensic clarity during incident response.

---

## 8) Breaking change risks

## 8.1 External/API consumers

- **High risk** if token becomes mandatory immediately on existing endpoints.
- Existing automation clients will fail writes until updated.

Mitigation:

- Versioned endpoints (`/api/admin/v2/...`) or transitional compatibility window.
- Soft rollout phase: warn on missing token, then enforce.

## 8.2 Admin web UX

- New conflict paths increase UI complexity.
- If conflict UX is weak, users may lose trust and copy/paste around the system.

Mitigation:

- Ship conflict banner + draft preservation in first increment.
- Add richer diff/merge iteratively.

## 8.3 Data semantics

- Content editor currently replaces full graph; OCC prevents silent overwrite but does not itself merge.
- Teams may expect auto-merge; unmet expectation can look like regression.

Mitigation:

- Explicitly communicate “detect + resolve” behavior in release notes.
- Add operation-based patch model later if collaborative editing becomes frequent.

## 8.4 Performance and contention

- More 409 responses under high parallel admin activity.
- Minor extra read/compare work on conflict handling.

Mitigation:

- Keep payloads focused.
- Provide staleness hints to reduce preventable conflicts.

---

## 9) Recommended rollout plan

1. **Phase 1 — Foundations**
   - Add tokens to schema/models.
   - Return tokens on GET.
2. **Phase 2 — Enforced OCC (API)**
   - Require token on write.
   - Return structured 409 conflict envelope.
3. **Phase 3 — UI conflict safety**
   - Draft preservation + reload/diff UX.
   - Section-level conflict handling for content graph.
4. **Phase 4 — Hardening**
   - Contract/integration tests for concurrent writers.
   - Metrics on conflict rate and resolution outcomes.

---

## 10) Decision summary

- Current admin update flows for tool definitions, policies, and content graph are vulnerable to silent last-write-wins overwrites.
- Introduce optimistic concurrency with opaque version tokens across all three resources.
- Enforce conflict detection via conditional writes and 409 conflict envelopes.
- Provide explicit UI conflict resolution paths; never silently overwrite on stale state.
- Plan migration carefully due to contract-level breaking potential for existing admin API clients.
