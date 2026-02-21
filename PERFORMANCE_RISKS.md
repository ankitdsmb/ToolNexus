# PERFORMANCE_RISKS

## Discovery-Level Findings
1. **Pipeline step ordering ambiguity**: equal order values (`200`) for policy and caching create fragile behavior.
2. **Request-path heavy transforms**: CPU-intensive tools execute inline with no offload/queueing.
3. **Runtime module proliferation**: many small JS modules can increase network/parse overhead.
4. **Potential cache-key cardinality growth**: cache includes input + options; for high-entropy payloads this can bloat cache churn.
5. **Dual runtime (legacy+modern)**: compatibility layer adds boot complexity and potential duplicated work.

## Sync-over-Async Risk
- Core .NET paths are async-first; no obvious sync-over-async anti-pattern seen in primary flow.

## Memory Allocation Hotspots
- Cache serializes items for sizing and storage; repeated serialization on hot paths may add CPU/allocation cost.
- Tool operations on large payloads can pressure LOH if payload limits are raised.

## API Bottlenecks
- Single-node in-memory concurrency limiter per tool slug; no cross-instance coordination.
- No queue-based backpressure for spikes beyond request throttling.

## Frontend Render Risks
- Dynamic runtime initialization with dependency/template/module loading can delay TTI for tool pages.
