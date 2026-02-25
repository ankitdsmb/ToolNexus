# ToolNexus Admin Manual

## 1. Authority Configuration
Execution authority controls which execution path is used and under what policy:
- legacy authoritative
- unified authoritative
- shadow-only routes for controlled rollout

## 2. Execution Policies
Policies govern:
- admission decisions
- capability allowances
- runtime restrictions and escalation limits

## 3. Capability Lifecycle
Capabilities move through lifecycle states (registry/foundation toward governed usage), with policy + telemetry visibility.

## 4. Governance and Control
Never bypass:
- authority resolver
- execution snapshot freezing
- conformance validation

These layers are core governance controls.

## 5. Telemetry and Monitoring
Track:
- runtime identity decisions
- conformance issue counts
- worker/orchestrator usage
- fallback/recovery patterns
- incident events

## 6. Troubleshooting
Start with:
1. Admission decision and authority tags
2. Snapshot metadata
3. Conformance result and issues
4. Adapter selection and runtime identity
5. Client runtime console/telemetry

## 7. Rollout Controls
Use staged rollout for:
- new capabilities
- adapter changes
- runtime mode policy updates

Prefer shadow or restricted rollout before full enablement.
