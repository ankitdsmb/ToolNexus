# Run Order 1 — Audit Reliability Guardrails

## FINAL SPECIFICATION

### 1. Data Model Changes

#### tables

1. `audit_events` (authoritative immutable forensic record)
2. `audit_outbox` (durable delivery queue for external sinks)
3. `audit_dead_letter` (terminal failures requiring operator action)

#### columns

**`audit_events`**

- `id UUID PRIMARY KEY`
- `occurred_at_utc TIMESTAMPTZ NOT NULL`
- `actor_type TEXT NOT NULL` (e.g., `admin_user`, `service_account`, `system`)
- `actor_id TEXT NULL` (nullable for system actions)
- `tenant_id TEXT NULL`
- `trace_id TEXT NULL`
- `request_id TEXT NULL`
- `action TEXT NOT NULL` (normalized verb/object format, e.g., `admin.user.update`)
- `target_type TEXT NULL`
- `target_id TEXT NULL`
- `result_status TEXT NOT NULL` (`success`, `failure`, `partial`)
- `http_status INT NULL`
- `source_ip INET NULL` (stored as received; redaction applies in payload/body fields)
- `user_agent TEXT NULL`
- `payload_redacted JSONB NOT NULL` (canonical redacted payload)
- `payload_hash_sha256 TEXT NOT NULL` (hash of canonical redacted payload)
- `schema_version INT NOT NULL DEFAULT 1`
- `created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()`

**`audit_outbox`**

- `id UUID PRIMARY KEY`
- `audit_event_id UUID NOT NULL REFERENCES audit_events(id) ON DELETE CASCADE`
- `destination TEXT NOT NULL` (e.g., `siem_primary`)
- `idempotency_key TEXT NOT NULL` (`<destination>:<audit_event_id>:v<schema_version>`)
- `delivery_state TEXT NOT NULL` (`pending`, `in_progress`, `retry_wait`, `delivered`, `dead_lettered`)
- `attempt_count INT NOT NULL DEFAULT 0`
- `next_attempt_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()`
- `last_error_code TEXT NULL`
- `last_error_message TEXT NULL` (truncated diagnostic)
- `last_attempt_at_utc TIMESTAMPTZ NULL`
- `delivered_at_utc TIMESTAMPTZ NULL`
- `lease_owner TEXT NULL` (worker instance id)
- `lease_expires_at_utc TIMESTAMPTZ NULL`
- `created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()`

**`audit_dead_letter`**

- `id UUID PRIMARY KEY`
- `outbox_id UUID NOT NULL UNIQUE REFERENCES audit_outbox(id) ON DELETE CASCADE`
- `audit_event_id UUID NOT NULL REFERENCES audit_events(id) ON DELETE CASCADE`
- `destination TEXT NOT NULL`
- `final_attempt_count INT NOT NULL`
- `first_failed_at_utc TIMESTAMPTZ NOT NULL`
- `dead_lettered_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()`
- `error_summary TEXT NOT NULL`
- `error_details JSONB NULL` (bounded, sanitized)
- `operator_status TEXT NOT NULL DEFAULT 'open'` (`open`, `requeued`, `ignored`, `resolved`)
- `operator_note TEXT NULL`
- `operator_id TEXT NULL`
- `updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()`

#### indexes

**`audit_events`**

- `idx_audit_events_occurred_at` on `(occurred_at_utc DESC)`
- `idx_audit_events_actor` on `(actor_type, actor_id, occurred_at_utc DESC)`
- `idx_audit_events_action` on `(action, occurred_at_utc DESC)`
- `idx_audit_events_tenant` on `(tenant_id, occurred_at_utc DESC)` where `tenant_id IS NOT NULL`
- `idx_audit_events_trace` on `(trace_id)` where `trace_id IS NOT NULL`

**`audit_outbox`**

- unique: `ux_audit_outbox_destination_event` on `(destination, audit_event_id)`
- unique: `ux_audit_outbox_idempotency_key` on `(idempotency_key)`
- `idx_audit_outbox_sched` on `(delivery_state, next_attempt_at_utc)` for worker pickup
- `idx_audit_outbox_lease` on `(lease_expires_at_utc)` where `delivery_state = 'in_progress'`

**`audit_dead_letter`**

- `idx_audit_dead_letter_status_time` on `(operator_status, dead_lettered_at_utc DESC)`
- `idx_audit_dead_letter_destination` on `(destination, dead_lettered_at_utc DESC)`

---

### 2. Runtime Flow

#### write path

1. Admin write operation begins transaction.
2. Build audit envelope from request context and operation result.
3. Apply deterministic redaction and truncation before persistence.
4. Insert into `audit_events` within the same transaction as the admin write.
5. Insert one `audit_outbox` row per configured destination in same transaction.
6. Commit transaction.

**Non-blocking rule:** If any audit insert fails due to transient DB contention, retry DB statement locally inside operation transaction budget (max 2 short retries). If still failing, **do not fail admin write**; commit admin write and emit a minimal fallback platform log with event fingerprint + error code for immediate operational alerting. This is the only permitted degrade mode.

#### failure path

- External sink delivery failures (network/auth/5xx/timeout) never affect admin write path.
- Worker updates `attempt_count`, stores bounded diagnostic in outbox, computes `next_attempt_at_utc`, and sets state to `retry_wait`.
- If retry budget exhausted, move to dead-letter flow.

#### retry flow

- Worker claims due rows (`pending`/`retry_wait`) with lease.
- Delivers with `idempotency_key` header/field.
- On success: mark `delivered` and set `delivered_at_utc`.
- On retryable failure: release lease, schedule next attempt.
- On non-retryable failure (4xx semantic/auth misconfig), skip remaining retries only after first confirmation attempt and dead-letter immediately.

---

### 3. Redaction Rules

#### exact patterns

Apply to keys (case-insensitive key matching after snake/camel normalization):

- **Always redact full value:**
  - `password`, `passphrase`, `secret`, `client_secret`, `api_key`, `access_key`, `private_key`, `token`, `refresh_token`, `authorization`, `set_cookie`, `cookie`, `session_id`, `otp`, `mfa_code`, `pin`
- **PII partial-mask:**
  - `email`, `phone`, `ssn`, `national_id`, `tax_id`, `credit_card`, `card_number`
- **Free-text pattern scan redact:**
  - JWT-like: `eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}`
  - Bearer token: `(?i)bearer\s+[a-z0-9\-\._~\+\/]+=*`
  - PEM blocks: `-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]+?-----END [A-Z ]+PRIVATE KEY-----`
  - Credit card PAN candidate: `\b(?:\d[ -]*?){13,19}\b` (only masked when Luhn-valid)

#### masking strategy

- Full redact values replaced with constant string: `"[REDACTED]"`.
- Partial PII mask:
  - email: keep first char of local-part and full domain (`a***@example.com`)
  - phone: keep last 2 digits (`********45`)
  - SSN/national/tax id: keep last 4 (`*****1234`)
  - card: keep BIN first 6 + last 4 (`411111******1111`)
- Redaction metadata added per event under `_redaction_meta`:
  - `rule_version`, `fields_redacted_count`, `patterns_redacted_count`, `redacted_paths[]` (JSON paths)
- Redaction execution is deterministic and idempotent (re-applying produces identical result).

---

### 4. Truncation Rules

#### field caps

- Any scalar string field cap: **2,048 UTF-8 bytes**.
- `last_error_message` cap: **1,024 UTF-8 bytes**.
- `user_agent` cap: **512 UTF-8 bytes**.
- Truncation marker format: `"<TRUNCATED bytes_original=NNN bytes_kept=MMM sha256=...>"` appended to retained prefix.

#### payload caps

- `payload_redacted` serialized size hard cap: **64 KiB**.
- If cap exceeded:
  1. Drop non-forensic optional branches in order: `debug`, `stack`, `raw_request`, `raw_response`.
  2. If still over cap, recursively truncate largest remaining string nodes.
  3. If still over cap, replace largest arrays with summary object: `{ "_truncated_array": true, "original_count": N, "sample": [first 3 items hash summaries] }`.

#### metadata format

Always include `_truncation_meta`:

- `applied` (bool)
- `rule_version`
- `bytes_original`
- `bytes_final`
- `dropped_paths[]`
- `truncated_paths[]`
- `content_hash_sha256_before`
- `content_hash_sha256_after`

This preserves forensic traceability while preventing oversized storage and sink rejection.

---

### 5. Outbox Worker Behavior

#### retry policy

- Max attempts per destination: **12**.
- Retryable classes:
  - transport/network failures
  - HTTP `429`
  - HTTP `5xx`
  - explicit sink timeout
- Non-retryable classes (dead-letter immediately after one confirmation retry):
  - HTTP `400`/`401`/`403`/`404`/`422` due to payload contract or auth config

#### backoff formula

For attempt `n` (1-indexed):

- `delay_seconds = min(3600, 2^(n-1) * 5) + jitter(0..3)`
- Schedule via `next_attempt_at_utc = now_utc + delay_seconds`
- Lease timeout per in-flight job: `max(30s, p95_delivery_latency*3)` capped at 5 minutes

#### idempotency logic

- Outbox uniqueness on `(destination, audit_event_id)` ensures one logical message per sink.
- Worker sends `idempotency_key` with every attempt.
- Sink required to treat same key as upsert/no-op for 24h minimum retention.
- Worker success criteria:
  - `2xx` accepted response OR
  - explicit duplicate-already-processed response mapped to success.

This guarantees at-least-once delivery with deterministic dedupe.

---

### 6. Dead-letter workflow

#### operator recovery process

1. Alert triggers when new `audit_dead_letter.operator_status='open'` exists for >5 minutes.
2. Operator triages root cause category (`auth`, `schema`, `rate_limit`, `destination_down`, `unknown`).
3. Apply corrective action (rotate credentials, fix mapping, raise sink quota, etc.).
4. Requeue by setting `operator_status='requeued'` and creating a fresh `audit_outbox` row with same `audit_event_id` + new `idempotency_key` version suffix (`v2`, `v3`, ...).
5. Preserve original dead-letter row as immutable incident record; only status/note fields are mutable.
6. If business-accepted loss exception is approved, set `operator_status='ignored'` with mandatory `operator_note` and ticket reference.

---

### 7. Required migrations order

1. Create `audit_events` table + indexes.
2. Create `audit_outbox` table + indexes + FK to `audit_events`.
3. Create `audit_dead_letter` table + indexes + FKs.
4. Add enum/check constraints for state columns (`delivery_state`, `operator_status`, `result_status`).
5. Backfill no data (new feature) and deploy read-only dashboards.
6. Enable write path feature flag (`audit_guardrails_write_enabled`) at 1% traffic, then ramp.
7. Enable worker feature flag (`audit_guardrails_worker_enabled`) after write stability confirmed.

---

### 8. Safe rollout plan

#### zero downtime migration strategy

- **Phase A (expand):** apply additive schema migrations only (new tables/indexes/constraints compatible with old app).
- **Phase B (dark write):** enable write path to new audit tables while existing logging remains primary; compare event counts and hash distributions.
- **Phase C (shadow delivery):** run outbox worker against non-production sink endpoint for validation.
- **Phase D (progressive cutover):** move to production sink by tenant cohort (1% → 10% → 50% → 100%) with rollback toggle.
- **Phase E (stabilize):** enforce alert thresholds and on-call runbook.

#### locked metrics definitions

- `audit_write_success_rate` = successful `audit_events` inserts / attempted admin writes (5-min window), target `>= 99.9%`.
- `audit_write_degrade_count` = count of admin writes where fallback platform-log path was used, target `0`, page on `> 0` for 10 min.
- `outbox_backlog_depth` = rows in `pending|retry_wait|in_progress`, alert if continuously increasing for 15 min.
- `outbox_delivery_latency_p95` = `delivered_at_utc - created_at_utc`, target `< 120s`.
- `outbox_retry_rate` = retried deliveries / total deliveries, investigate if `> 5%` sustained 30 min.
- `dead_letter_open_count` = `operator_status='open'` count, page if `> 0` for critical destinations.
- `dead_letter_age_max_minutes` = max age of open dead-letter, page at `> 30` minutes.
- `redaction_application_rate` = events with `_redaction_meta.fields_redacted_count > 0` / total events (watch for sudden drops indicating rule regression).
- `truncation_application_rate` = events with `_truncation_meta.applied=true` / total events (watch for spikes indicating payload bloat).

All metrics emitted with labels: `destination`, `tenant_tier`, `environment`, and `schema_version`.

---

**READY FOR IMPLEMENTATION PHASE.**
