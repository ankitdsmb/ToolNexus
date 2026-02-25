Unified Tool Capability Model — Architecture Council

## SECTION 1 — Capability Model Philosophy

### 1.1 Why a Unified Model
ToolNexus now has mature execution governance and a multi-language runtime. The next scaling risk is **model fragmentation**: different capability definitions per subsystem (UI, router, policy engine, dashboard) create drift, over-permissioning, and poor operability. The Unified Tool Capability Model (UTCM) establishes one canonical contract used by all runtime decision points.

### 1.2 Design Principles
- **Single source of truth:** one capability manifest schema per tool action.
- **Least privilege first:** declared capabilities define the maximum allowed blast radius.
- **Composability:** capability sets are category-based and machine-evaluable.
- **Policy as data:** governance engines consume capability metadata instead of hard-coded exceptions.
- **Runtime introspection:** observed behavior feeds back into capability risk scoring.
- **UI determinism:** runtime UI renders from the same capability envelope used by execution admission.

### 1.3 Canonical Capability Envelope
Every tool action resolves to a capability envelope attached to admission, dispatch, execution logs, and UI context:
- `tool_slug`
- `action`
- `capabilities` (grouped by category)
- `capability_profile_id` (content hash)
- `risk_level` (derived)
- `isolation_class` (derived)
- `policy_snapshot_id`
- `effective_grants` (after policy reductions/escalations)

The envelope is immutable per execution and content-addressable for reproducibility.

---

## SECTION 2 — Capability Categories

All capabilities are normalized into five top-level categories.

### 2.1 `execution`
Describes how code is allowed to run.

Examples:
- `execution.language.node`
- `execution.language.python`
- `execution.proc.spawn`
- `execution.timeout.extended`
- `execution.cpu.burst`
- `execution.memory.high`

Governance meaning:
- Drives worker runtime selection and hard limits.
- Controls whether child processes are permitted.

### 2.2 `UI`
Describes runtime shell affordances and interactive surfaces.

Examples:
- `ui.input.file_upload`
- `ui.input.large_payload`
- `ui.output.rich_html`
- `ui.output.download`
- `ui.session.persist_state`
- `ui.action.confirm_destructive`

Governance meaning:
- Drives client-side guardrails, warning modals, and available controls.
- Ensures UI cannot expose actions that policy disallows.

### 2.3 `data`
Describes storage and data-plane access boundaries.

Examples:
- `data.read.workspace`
- `data.write.workspace`
- `data.read.tool_cache`
- `data.write.temp`
- `data.access.pii_masked`
- `data.retention.extended`

Governance meaning:
- Drives sandbox filesystem mount profile.
- Informs compliance checks (PII, retention class, audit expectations).

### 2.4 `network`
Describes outbound/inbound communication behavior.

Examples:
- `network.egress.http`
- `network.egress.https`
- `network.egress.domain_allowlist`
- `network.ingress.webhook`
- `network.ai.provider_api`
- `network.dns.lookup`

Governance meaning:
- Maps directly to egress policy and proxy enforcement.
- Enables per-domain policy and incident alerting.

### 2.5 `privileged`
Describes elevated operations with high blast radius.

Examples:
- `privileged.secret.read`
- `privileged.admin.mutate_policy`
- `privileged.system.command`
- `privileged.cross_tenant_access`
- `privileged.audit.override`

Governance meaning:
- Requires strongest admission controls, explicit approvals, and hardened isolation.
- Defaults to non-cacheable, non-batchable execution behavior.

### 2.6 Capability Manifest Shape (Logical)
```yaml
capability_manifest:
  tool_slug: string
  action: string
  version: semver
  categories:
    execution: [capability_key]
    ui: [capability_key]
    data: [capability_key]
    network: [capability_key]
    privileged: [capability_key]
  defaults:
    isolation_class: t0|t1|t2|t3
    requires_approval: boolean
    cache_eligible: boolean
```

---

## SECTION 3 — Capability → UI Mapping

### 3.1 Runtime UI Adaptation Contract
The UI client receives `effective_grants` and uses deterministic mapping tables. UI is not a separate policy engine; it is a **projection layer** of the same capability model.

| Capability Signal | UI Behavior | User Safety Effect |
|---|---|---|
| `ui.input.file_upload` + `data.write.workspace` | Enable file picker and dropzone | Prevents hidden file writes when absent |
| `network.egress.*` | Show outbound access badge + destination summary | Improves transparency before run |
| `privileged.secret.read` | Require elevated banner and explicit consent checkpoint | Prevents accidental secret use |
| `ui.action.confirm_destructive` | Gate action buttons with confirmation modal | Reduces destructive misclick risk |
| `execution.timeout.extended` | Show long-run indicator and cancel affordance | Better UX for non-instant tools |
| No matching grant | Hide/disable associated action control | Eliminates forbidden-action mismatch |

### 3.2 UI States Derived from Capability Profile
- **Safe Mode:** no network/privileged grants; streamlined controls.
- **Connected Mode:** network grants present; destination metadata visible.
- **Elevated Mode:** privileged grants present; explicit acknowledgment + stronger audit prompts.
- **Restricted Mode:** policy has reduced grants from declaration; UI displays downgraded capability notices.

### 3.3 Action Availability Rule
`action_visible = declared && policy_allowed && capability_mapped`

If any term is false, the action is unavailable in UI and blocked server-side, guaranteeing dual-layer consistency.

---

## SECTION 4 — Capability → Execution Mapping

### 4.1 Admission and Governance Consumption
Execution governance consumes the exact same manifest keys and evaluates:
1. declared capability set
2. actor/environment policy constraints
3. escalation needs
4. effective grants
5. isolation assignment

### 4.2 Worker Isolation Mapping
| Effective Capability Pattern | Isolation Class | Worker Pool |
|---|---|---|
| `execution` only, no side effects | `t0` | deterministic pool |
| `data.write.workspace`, no network/privileged | `t1` | workspace-jail pool |
| any `network.*` without privileged | `t2` | network-filtered pool |
| any `privileged.*` | `t3` | hardened privileged pool |

Rules:
- Highest-risk capability determines minimum isolation class.
- Cross-tier fallback is denied by default.
- Escalation creates one-time effective grant delta, recorded in policy snapshot.

### 4.3 Shared Model in Execution Lifecycle
- **Scheduler:** partitions queue by isolation class from capability envelope.
- **Sandbox:** materializes filesystem/network/syscall controls from capability sets.
- **Telemetry:** emits per-capability execution metrics.
- **Cache system:** evaluates eligibility from capability side-effect profile.

---

## SECTION 5 — Capability Drift Detection

### 5.1 Drift Definition
Capability drift occurs when observed runtime behavior exceeds or differs from declared/effective capabilities.

### 5.2 Drift Signals
- Network call observed with no `network.*` grant.
- Workspace write observed with no `data.write.*` grant.
- Secret broker access observed without `privileged.secret.read`.
- UI surfaced action with no corresponding effective grant.
- Worker assigned to lower isolation class than capability-derived minimum.

### 5.3 Detection Pipeline
1. Collect runtime events (sandbox, proxy, secret broker, UI telemetry).
2. Normalize events into capability-key space.
3. Compare against `effective_grants` in envelope.
4. Emit drift event with severity:
   - `warning` (harmless mismatch)
   - `violation` (policy bypass attempt)
   - `critical` (privileged mismatch or isolation breach)
5. Feed drift ledger + incident response automation.

### 5.4 Automated Responses
- Block current execution for critical drift.
- Quarantine worker fingerprint on repeated drift.
- Downgrade tool to Restricted lifecycle stage.
- Require capability manifest review before reactivation.

---

## SECTION 6 — Unified Governance Dashboard Model

### 6.1 Dashboard Data Model
The governance dashboard indexes the same capability profile fields used by admission and UI:
- `tool_slug`, `action`
- `capability_profile_id`
- `declared_capabilities`
- `effective_grants`
- `isolation_class`
- `policy_snapshot_id`
- `drift_events`
- `execution_outcomes`

### 6.2 Core Dashboard Views
- **Capability Coverage View:** declared vs effective grants by tool/action.
- **Isolation Heatmap:** capability class distribution across worker tiers.
- **Drift Monitor:** trend of warning/violation/critical drift events.
- **Privilege Exposure Panel:** tools invoking `privileged.*` over time.
- **Policy Friction View:** denials and reductions by capability category.

### 6.3 Governance KPIs
- capability declaration completeness rate
- effective-grant reduction ratio
- drift rate per 1,000 executions
- privileged execution share
- isolation mismatch count
- mean time to remediate drift incidents

### 6.4 Operational Benefits
- One model enables consistent metrics and fewer reconciliation jobs.
- Incident triage can pivot from tool → capability profile → worker → policy snapshot quickly.
- Compliance reporting is generated from immutable envelope-linked records.

---

## SECTION 7 — Final Unified Architecture

Adopt UTCM as the capability control-plane contract binding five runtime surfaces: execution governance, worker isolation, runtime UI behavior, action availability, and governance analytics.

### 7.1 End-to-End Unified Flow
1. Tool action resolves to canonical capability manifest.
2. Governance computes effective grants and isolation class.
3. Same effective grants are sent to UI and execution router.
4. Worker enforces sandbox based on capability-derived controls.
5. Telemetry and drift detectors compare observed behavior to effective grants.
6. Governance dashboard projects health, risk, and compliance from shared model.

### 7.2 Non-Negotiable Invariants
- No execution without capability envelope.
- No UI action without corresponding effective grant.
- No worker assignment below capability-derived isolation floor.
- No privileged execution without explicit snapshot-linked approval.
- No drift event without audit traceability.

### 7.3 Rollout Recommendation
- **Phase A:** introduce manifest schema + envelope generation.
- **Phase B:** enforce capability-driven UI and router mapping.
- **Phase C:** activate drift detection + dashboard consolidation.
- **Phase D:** tighten policy gates for privileged and high-network tools.

This architecture converts capability metadata from a documentation artifact into the primary runtime decision primitive, enabling consistency, safety, and operational clarity as ToolNexus evolves.

END.
