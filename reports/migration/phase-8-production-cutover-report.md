# Phase 8 — Production Cutover Report (SQLite → PostgreSQL)

## Scope
Operational production rollout protocol for executing the SQLite → PostgreSQL cutover with strict safety controls, measurable rollback triggers, and immediate post-cutover parity verification.

This phase is planning-only and introduces no implementation/code-path changes.

## 1) Production Cutover Plan (Exact Sequence)

### Pre-cutover freeze window
1. Announce deployment freeze and maintenance window (read-only or no-write window preferred).
2. Confirm on-call ownership: release manager, app engineer, DBA, QA representative.
3. Capture pre-cutover baseline metrics (error rate, p95 latency, startup health).

### Step A — Backup SQLite source of truth
1. Stop writes (maintenance mode/read-only gate).
2. Perform SQLite backup using immutable copy + checksum verification.
3. Store backup in two locations (primary artifact storage + offsite/secondary retention).
4. Validate backup readability by opening file and running basic row-count queries.

### Step B — Create PostgreSQL target
1. Provision/verify PostgreSQL database, role permissions, TLS, and networking.
2. Apply least-privilege credentials for application runtime.
3. Validate connection from application host to PostgreSQL endpoint.

### Step C — Apply migrations
1. Run EF Core migrations against the PostgreSQL target in controlled release pipeline.
2. Confirm migration history table exists and includes all expected migration IDs.
3. Record migration execution logs/artifacts.

### Step D — Import data
1. Export from SQLite in deterministic table order respecting FK dependencies.
2. Import into PostgreSQL with transactional batches (per table or bounded groups).
3. Validate identity/sequence alignment after import (`MAX(Id)` vs sequence current value).
4. Re-enable constraints/indexes (if disabled during bulk import).

### Step E — Verify parity (blocking gate)
1. Compare table-level row counts between SQLite backup and PostgreSQL target.
2. Run deterministic sample checks:
   - slug-based lookups,
   - ordered result slices,
   - relationship joins,
   - null/boolean/date field spot checks.
3. Run smoke API checks against staging slot pointed at PostgreSQL.
4. Proceed only when parity checks are fully green.

### Step F — Switch provider configuration
1. Deploy configuration switch (`DatabaseProvider=Postgres`) via controlled release.
2. Restart application instances gradually (canary first, then full fleet).
3. Keep SQLite backup and rollback config immediately available.

### Step G — Stabilization window
1. Run elevated monitoring for first 60 minutes.
2. Hold release completion until monitoring checklist remains within thresholds.

---

## 2) Rollback Triggers (Measurable Conditions)

Rollback is **mandatory** when any trigger is met:

1. **Startup failure trigger**
   - Any production instance fails startup readiness for >5 minutes post-switch, OR
   - >20% of instances fail readiness probes during rollout.

2. **Migration failure trigger**
   - Migration command exits non-zero, OR
   - Migration history table missing expected migration IDs, OR
   - Schema validation detects missing required tables/columns/indexes.

3. **Elevated error-rate trigger**
   - HTTP 5xx rate exceeds baseline by >2x for 10 consecutive minutes, OR
   - Absolute 5xx rate >1% sustained for 5 minutes.

4. **Data mismatch trigger**
   - Row-count mismatch in critical tables,
   - slug lookup returns different logical records,
   - deterministic ordering mismatch in core list endpoints,
   - FK integrity/orphan checks fail.

### Rollback sequence
1. Halt rollout immediately.
2. Switch provider config back to SQLite.
3. Restart/recycle app instances to load reverted configuration.
4. Validate core API health and row-count consistency on SQLite source.
5. Preserve PostgreSQL artifacts/logs for root-cause analysis.
6. Open incident review; no reattempt until corrective action is validated in pre-prod.

---

## 3) Runtime Monitoring Checklist (Post-switch)

Track continuously during rollout + stabilization:

1. **Startup logs**
   - Host boot success,
   - DI/service initialization success,
   - no unhandled exceptions during startup.

2. **Migration logs**
   - Migration completion markers,
   - no pending/unapplied migration warnings,
   - no DDL/runtime schema exceptions.

3. **DB connection pool**
   - active/idle pool usage,
   - wait/timeout events,
   - connection exhaustion signals.

4. **Error rates**
   - HTTP 4xx/5xx distribution,
   - exception frequency by endpoint,
   - DB exception categories (timeout, deadlock, auth, constraint).

5. **Query latency**
   - p50/p95/p99 latency for core read and write endpoints,
   - slow-query counts above agreed threshold,
   - regression against pre-cutover baseline.

---

## 4) Deployment Safety Gates (Go/No-Go)

All gates are required for GO:

- [ ] SQLite backup completed and checksum-verified.
- [ ] Backup restore drill completed successfully (readability + sample query validation).
- [ ] PostgreSQL migration dry-run completed in pre-production using production-like snapshot.
- [ ] Data import rehearsal completed with parity checks passing.
- [ ] QA sign-off documented (regression + bad-path + parity scenarios).
- [ ] Rollback procedure executed in rehearsal and timed (RTO within agreed limit).
- [ ] On-call staffing and communication bridge confirmed.
- [ ] Cutover runbook approved by release manager + engineering + QA.

**No-Go rule:** Any unchecked gate blocks production cutover.

---

## 5) Immediate Post-Cutover Verification

Execute within first 15 minutes after provider switch:

1. **Row counts**
   - Validate counts for critical tables (`ToolContents`, `ToolCategories`, `ToolFeatures`, `ToolSteps`, plus related content tables).

2. **Core API endpoints**
   - Health endpoint,
   - tool list endpoint,
   - tool detail endpoint,
   - representative write path (if applicable in production mode).

3. **Slug lookup validation**
   - Verify known slugs resolve correctly,
   - confirm normalization behavior (trim/case-insensitive expectations).

4. **Ordering consistency**
   - Compare ordered list output against expected deterministic ordering baseline.

5. **Integrity checks**
   - Duplicate slug uniqueness check,
   - FK orphan check,
   - sequence/identity alignment validation.

If any verification fails: invoke rollback sequence immediately.

---

## 6) Final Cutover Confidence Score

**Production Confidence Score: 95 / 100**

### Rationale
- Prior phases already established migration correctness, parity validation, and rollback rehearsal paths.
- This cutover protocol adds explicit measurable rollback triggers, strict go/no-go gates, and deterministic post-switch verification.
- Residual risk exists for environment-specific operational variance (networking/pool tuning), which is bounded by the monitoring and rollback controls above.
