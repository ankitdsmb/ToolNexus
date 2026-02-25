# ToolNexus Architecture Manual

## End-to-End Lifecycle

```text
Client (tool runtime)
  -> API endpoint (/api/v1/tools/{slug}/{action})
  -> Pipeline steps
  -> UniversalExecutionEngine
  -> Authority Resolver
  -> Execution Snapshot Builder
  -> Admission + Adapter Selection
  -> Language/Worker Orchestration
  -> Conformance Validation + Normalization
  -> Unified Result + Telemetry Projection
  -> Client render + runtime observability
```

## Stage-by-Stage Explanation

### 1) Client Runtime
- Loads manifest/runtime metadata.
- Mounts UI through lifecycle adapter.
- Emits runtime identity and observability events.

### 2) API + Pipeline
- Validates request shape and policy context.
- Passes execution request to universal engine.

### 3) UniversalExecutionEngine
- Creates shared context tags.
- Resolves authority.
- Builds immutable snapshot.
- Routes to execution adapter.

### 4) Adapter + Worker Layer
- Chooses language/capability adapter.
- Coordinates worker lease/orchestration for execution.
- Returns normalized raw result.

### 5) Conformance Layer
- Validates status/output contract.
- Normalizes invalid/missing contract fields.
- Records conformance issues.

### 6) Response + Telemetry
- Returns unified execution result.
- Emits telemetry projection for dashboards and audits.

## Boundary and Protection Model
Core non-negotiable boundaries:
- authority model intact
- immutable snapshot integrity
- conformance validation enabled
- no bypass path around governance

## Runtime Modes
- Auto runtime mode
- Custom runtime mode
- Safe fallback path
- Mount mode variants (fullscreen/panel/inline/popover/command)
