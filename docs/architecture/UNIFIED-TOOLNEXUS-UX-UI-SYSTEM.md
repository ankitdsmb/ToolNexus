ToolNexus UX/UI Design System — Master Specification

## SECTION 1 — UX Philosophy

### 1.1 Platform identity
ToolNexus is one execution platform with many capability modules, not a marketplace of unrelated tools. The UI must always present:
- one shared ToolShell frame,
- one shared interaction grammar,
- one shared execution and governance language,
- capability-specific behavior inside platform-controlled boundaries.

The product promise is consistency, predictability, and policy transparency. Visual differentiation is secondary to operational clarity.

### 1.2 Interaction consistency rules
All tools must implement the same universal sequence:

**INPUT → ACTION → EXECUTION STATE → OUTPUT → FOLLOW-UP ACTIONS**

Rules:
1. Input region always appears before action controls.
2. Action controls always show execution implications (risk, async, network, approval).
3. Execution state always has a dedicated status layer (never implicit spinner-only behavior).
4. Output region always supports traceability metadata (timestamp, run id, capability profile id).
5. Follow-up actions always appear in a consistent result action bar.

### 1.3 Cognitive flow model
The cognitive model is “configure, run, verify, continue.”
- **Configure:** user provides input and understands constraints from capability badges.
- **Run:** user initiates explicit action with deterministic button semantics.
- **Verify:** user observes state changes and governance decisions in real time.
- **Continue:** user exports, retries, forks input, or escalates permissions.

The UI should reduce hidden state by exposing current execution phase and policy posture at all times.

### 1.4 Tool vs Platform responsibility
**Platform-controlled (mandatory):**
- Layout shell, navigation, status strip, capability badge schema, state machine semantics, governance messaging templates, and action bar behavior.

**Tool-controlled (extension-limited):**
- Input field variants,
- output renderer templates,
- optional extension slots for domain-specific controls,
- non-critical informative copy.

Tools may not override governance affordances, hide risk posture, or redefine state semantics.

---

## SECTION 2 — Global Layout Architecture

### 2.1 ToolShell layout hierarchy
1. `app-shell`
2. `platform-header`
3. `tool-context-bar`
4. `tool-workspace`
   - `input-panel`
   - `action-panel`
   - `execution-status-layer`
   - `output-panel`
   - `follow-up-panel`
5. `platform-footer` (optional operational metadata)

### 2.2 Header structure
Header includes:
- global brand and environment tag (prod/staging/dev),
- tool identity block (name, slug, version),
- current capability profile identifier,
- session controls.

### 2.3 Tool context area
Context bar surfaces immutable runtime descriptors:
- execution class,
- risk tier,
- sync/async mode,
- network requirement,
- approval requirement,
- lifecycle state (e.g., Canary, Active).

### 2.4 Input region
Input region contains:
- primary editor,
- optional file ingest,
- validation summary,
- inline schema hints.

Input region is always left/top in responsive flow to preserve interaction grammar.

### 2.5 Output region
Output region contains:
- streaming console/view,
- structured result renderer,
- diagnostics area,
- result metadata.

### 2.6 Action system
Action panel includes:
- primary run action,
- secondary validate action,
- cancel action (while running),
- retry action (on terminal failure).

Button ordering is fixed by state.

### 2.7 Status + execution indicators
Dedicated status layer must represent:
- phase label,
- progress indicator,
- elapsed time,
- queue position (for async),
- policy gate decision.

### 2.8 Capability badges
Canonical badges (non-overridable):
- `Execution: Sync|Async|Batch|Streaming`
- `Risk: Low|Moderate|High|Privileged`
- `Policy: Approval Required|Auto-Admit`
- `Network: Enabled|Isolated`
- `Lifecycle: Candidate|Canary|Active|Deprecated`

### 2.9 Semantic DOM structure
All key nodes require stable anchors:
- `data-tool-shell`
- `data-tool-header`
- `data-tool-context`
- `data-tool-input`
- `data-tool-actions`
- `data-tool-status`
- `data-tool-output`
- `data-tool-followup`
- `data-tool-extension-slot`

### 2.10 Accessibility considerations
- Landmark usage (`header`, `main`, `section`, `aside`, `footer`).
- `aria-live="polite"` for status updates; `aria-live="assertive"` for policy blocks/errors.
- Keyboard-first action order and visible focus outlines.
- Badge text never color-only; includes icon + label.
- State changes announced via screen-reader helper region.

### 2.11 Responsive strategy
- **Desktop:** two-column workspace (input/actions left, status/output right).
- **Tablet:** stacked sections with sticky action panel.
- **Mobile:** single-column progressive disclosure; output collapsible; action bar fixed bottom.

---

## SECTION 3 — Capability-Driven UI Model

UI rendering derives from runtime capability envelope and cannot be hardcoded per tool.

### 3.1 Execution class behavior
- **Sync:** immediate run feedback, input locked during execution, inline completion.
- **Async:** submission + job id, queue/progress widget, persistent resume link.
- **Batch:** file/list ingest emphasis, multi-item progress summary.
- **Streaming:** live token/chunk output panel with throttled rendering.

### 3.2 Risk tier behavior
- **Low:** neutral confirmation copy; single-step execution.
- **Moderate:** caution badge and preflight validation emphasis.
- **High:** explicit confirmation checkpoint and intent statement.
- **Privileged:** approval token UI, auditable acknowledgement, additional governance pane.

### 3.3 Async vs sync execution
- Sync terminal states are immediate in-page.
- Async introduces lifecycle cards: `Queued`, `Scheduled`, `Running`, `Completed`, `Failed`, `Canceled`.
- Async output supports “return later” with retrievable execution context.

### 3.4 Streaming results
Streaming tools expose:
- live output viewport,
- backpressure-safe chunk appending,
- pause autoscroll toggle,
- partial-result markers.

### 3.5 Approval-required tools
UI enforces gating:
- disabled primary action until approval artifact resolves,
- policy reason shown in governance panel,
- immutable audit line for approver + timestamp.

### 3.6 Network-enabled tools
Network-enabled capabilities show:
- outbound domain scope summary,
- data exposure notice,
- optional runtime outbound events counter.

### 3.7 Required examples

#### A) Low-risk transform tool UI
- Minimal caution chroma.
- Immediate run button.
- Inline result with copy/download actions.
- No approval drawer.

#### B) Async background tool UI
- Submit action transforms into job tracker.
- Input unlocks post-submission unless pinning is required.
- Output area defaults to “latest checkpoint.”

#### C) High-risk privileged tool UI
- Prominent risk and policy badges.
- Mandatory acknowledgement checkbox and reason code display.
- Run action relabeled to “Request privileged execution.”
- Governance timeline visible next to output.

---

## SECTION 4 — Feature-Wise UI Design

### 4.1 Input editor
- **UX behavior:** schema-guided entry, format helpers, validation before run.
- **Flow:** type/paste → validate → resolve errors → run.
- **Visual hierarchy:** label + hint, editor body, validation messages below.
- **States:**
  - idle: editable,
  - running: locked for sync, optionally editable for async,
  - success: retain input,
  - error: preserve input + highlight invalid spans.

### 4.2 File upload
- **UX behavior:** drag-drop + browse fallback.
- **Flow:** select file → parse preview → confirm mapping.
- **Visual hierarchy:** dropzone first, file chips second, parse diagnostics third.
- **States:** idle/running/success/error reflect parse lifecycle.

### 4.3 Action buttons
- **UX behavior:** deterministic semantics by state.
- **Primary:** Run/Submit/Request approval.
- **Secondary:** Validate.
- **Tertiary:** Cancel/Reset.
- Disabled logic is policy + validation driven.

### 4.4 Progress states
- Linear progress for known-duration jobs, indeterminate for unknown.
- Always accompany progress with text phase labels.

### 4.5 Streaming output
- Segmented by chunks with timestamps.
- Virtualized rendering for long streams.
- Freeze-scrolling control for inspection.

### 4.6 Error surface
- Top-level execution error card with reason code.
- Inline field errors remain in input zone.
- Technical diagnostics collapsible by default for non-privileged users.

### 4.7 Retry UX
- Retry appears only for retryable outcomes.
- One-click retry uses last valid input snapshot.
- “Edit before retry” entry point returns focus to failing input/control.

### 4.8 Tool status indicators
- Badge row + compact status chip.
- Status chip mirrors runtime state machine.

### 4.9 Capability warnings
- Contextual warnings under badges.
- Severity-based color + icon + text.

### 4.10 Governance messages
- Policy allow/deny messages in dedicated governance panel.
- Include machine reason code and user-readable explanation.

### 4.11 Result actions (copy/download/export)
- Persistent result action bar at output footer.
- Actions available only when output format supports them.
- Export includes run metadata manifest by default.

---

## SECTION 5 — Complete HTML Structure (MANDATORY)

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ToolNexus ToolShell</title>
  </head>
  <body>
    <div class="tn-app-shell" data-tool-shell data-tool-id="{{tool_slug}}" data-capability-profile-id="{{capability_profile_id}}">
      <header class="tn-platform-header" data-tool-header>
        <div class="tn-brand">ToolNexus</div>
        <div class="tn-tool-identity">
          <h1 data-tool-name>{{tool_name}}</h1>
          <p data-tool-version>Version {{tool_version}}</p>
        </div>
        <div class="tn-env-tag" data-platform-environment>{{environment}}</div>
      </header>

      <section class="tn-tool-context" data-tool-context aria-label="Tool capability context">
        <ul class="tn-capability-badges" role="list">
          <li class="tn-badge tn-badge--execution" data-capability-execution-class>{{execution_class}}</li>
          <li class="tn-badge tn-badge--risk" data-capability-risk-tier>{{risk_tier}}</li>
          <li class="tn-badge tn-badge--policy" data-capability-approval>{{approval_mode}}</li>
          <li class="tn-badge tn-badge--network" data-capability-network>{{network_mode}}</li>
          <li class="tn-badge tn-badge--lifecycle" data-capability-lifecycle>{{lifecycle_state}}</li>
        </ul>
        <aside class="tn-governance-note" data-tool-governance-message aria-live="polite"></aside>
      </section>

      <main class="tn-tool-workspace" data-tool-workspace>
        <section class="tn-panel tn-panel--input" data-tool-input aria-labelledby="tn-input-title">
          <h2 id="tn-input-title">Input</h2>
          <label for="tn-input-editor">Input payload</label>
          <textarea id="tn-input-editor" name="input" data-tool-input-editor></textarea>

          <div class="tn-upload" data-tool-upload>
            <label for="tn-file-input">Upload file</label>
            <input id="tn-file-input" type="file" data-tool-file-input />
            <div class="tn-upload-preview" data-tool-upload-preview></div>
          </div>

          <div class="tn-validation" data-tool-validation aria-live="polite"></div>
          <div class="tn-extension-slot" data-tool-extension-slot="input"></div>
        </section>

        <aside class="tn-panel tn-panel--actions" data-tool-actions aria-label="Execution actions">
          <button type="button" class="tn-btn tn-btn--primary" data-tool-action="run">Run</button>
          <button type="button" class="tn-btn tn-btn--secondary" data-tool-action="validate">Validate</button>
          <button type="button" class="tn-btn tn-btn--ghost" data-tool-action="cancel" hidden>Cancel</button>
          <button type="button" class="tn-btn tn-btn--ghost" data-tool-action="retry" hidden>Retry</button>
          <div class="tn-extension-slot" data-tool-extension-slot="actions"></div>
        </aside>

        <section class="tn-panel tn-panel--status" data-tool-status aria-live="polite" aria-atomic="true">
          <h2>Execution Status</h2>
          <div class="tn-status-line">
            <span data-tool-state-label>Idle</span>
            <span data-tool-elapsed-time>00:00</span>
          </div>
          <div class="tn-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-tool-progress></div>
          <div class="tn-policy-status" data-tool-policy-status aria-live="assertive"></div>
          <div class="tn-extension-slot" data-tool-extension-slot="status"></div>
        </section>

        <section class="tn-panel tn-panel--output" data-tool-output aria-labelledby="tn-output-title">
          <h2 id="tn-output-title">Output</h2>
          <div class="tn-stream" data-tool-output-stream aria-live="polite"></div>
          <div class="tn-result" data-tool-output-result></div>
          <div class="tn-diagnostics" data-tool-output-diagnostics hidden></div>
          <footer class="tn-result-actions" data-tool-followup>
            <button type="button" class="tn-btn tn-btn--secondary" data-tool-result-action="copy">Copy</button>
            <button type="button" class="tn-btn tn-btn--secondary" data-tool-result-action="download">Download</button>
            <button type="button" class="tn-btn tn-btn--secondary" data-tool-result-action="export">Export</button>
          </footer>
          <div class="tn-extension-slot" data-tool-extension-slot="output"></div>
        </section>
      </main>

      <footer class="tn-platform-footer" data-tool-runtime-meta>
        <span data-tool-run-id>Run: --</span>
        <span data-tool-timestamp>Last updated: --</span>
      </footer>
    </div>
  </body>
</html>
```

---

## SECTION 6 — Complete CSS Architecture

```css
:root {
  /* Typography */
  --tn-font-family-sans: Inter, "Segoe UI", Roboto, sans-serif;
  --tn-font-size-12: 0.75rem;
  --tn-font-size-14: 0.875rem;
  --tn-font-size-16: 1rem;
  --tn-font-size-20: 1.25rem;
  --tn-font-size-24: 1.5rem;
  --tn-line-height-tight: 1.2;
  --tn-line-height-normal: 1.5;

  /* Spacing */
  --tn-space-2: 0.125rem;
  --tn-space-4: 0.25rem;
  --tn-space-8: 0.5rem;
  --tn-space-12: 0.75rem;
  --tn-space-16: 1rem;
  --tn-space-20: 1.25rem;
  --tn-space-24: 1.5rem;
  --tn-space-32: 2rem;

  /* Radius and shadow */
  --tn-radius-sm: 0.375rem;
  --tn-radius-md: 0.625rem;
  --tn-radius-lg: 0.875rem;
  --tn-shadow-sm: 0 1px 2px rgb(16 24 40 / 0.08);
  --tn-shadow-md: 0 6px 16px rgb(16 24 40 / 0.12);

  /* Neutral colors */
  --tn-color-bg: #f7f8fa;
  --tn-color-surface: #ffffff;
  --tn-color-surface-alt: #f1f5f9;
  --tn-color-border: #d0d7e2;
  --tn-color-text: #111827;
  --tn-color-text-muted: #556070;

  /* Brand and actions */
  --tn-color-brand: #2246d2;
  --tn-color-brand-strong: #1a36a8;
  --tn-color-action-secondary: #e8edf8;

  /* Risk-aware system */
  --tn-color-risk-low: #0d8a4f;
  --tn-color-risk-moderate: #b7791f;
  --tn-color-risk-high: #c2410c;
  --tn-color-risk-privileged: #8b1a1a;

  /* State colors */
  --tn-color-info: #2563eb;
  --tn-color-success: #1a7f37;
  --tn-color-warning: #b45309;
  --tn-color-error: #b91c1c;
  --tn-color-policy-blocked: #7f1d1d;
}

*,
*::before,
*::after { box-sizing: border-box; }

body {
  margin: 0;
  font-family: var(--tn-font-family-sans);
  color: var(--tn-color-text);
  background: var(--tn-color-bg);
  line-height: var(--tn-line-height-normal);
}

.tn-app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
}

.tn-platform-header,
.tn-tool-context,
.tn-platform-footer {
  padding: var(--tn-space-16) var(--tn-space-24);
  background: var(--tn-color-surface);
  border-bottom: 1px solid var(--tn-color-border);
}

.tn-platform-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--tn-space-16);
}

.tn-brand {
  font-size: var(--tn-font-size-20);
  font-weight: 700;
  color: var(--tn-color-brand);
}

.tn-tool-identity h1 {
  margin: 0;
  font-size: var(--tn-font-size-20);
  line-height: var(--tn-line-height-tight);
}

.tn-tool-identity p {
  margin: var(--tn-space-4) 0 0;
  color: var(--tn-color-text-muted);
  font-size: var(--tn-font-size-14);
}

.tn-tool-context {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--tn-space-16);
  background: var(--tn-color-surface-alt);
}

.tn-capability-badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--tn-space-8);
  list-style: none;
  padding: 0;
  margin: 0;
}

.tn-badge {
  padding: var(--tn-space-4) var(--tn-space-8);
  border-radius: 999px;
  border: 1px solid var(--tn-color-border);
  background: var(--tn-color-surface);
  font-size: var(--tn-font-size-12);
  font-weight: 600;
}

.tn-badge--risk[data-capability-risk-tier="Low"] { color: var(--tn-color-risk-low); }
.tn-badge--risk[data-capability-risk-tier="Moderate"] { color: var(--tn-color-risk-moderate); }
.tn-badge--risk[data-capability-risk-tier="High"] { color: var(--tn-color-risk-high); }
.tn-badge--risk[data-capability-risk-tier="Privileged"] { color: var(--tn-color-risk-privileged); }

.tn-tool-workspace {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) 320px minmax(400px, 1.3fr);
  gap: var(--tn-space-16);
  padding: var(--tn-space-24);
}

.tn-panel {
  background: var(--tn-color-surface);
  border: 1px solid var(--tn-color-border);
  border-radius: var(--tn-radius-md);
  padding: var(--tn-space-16);
  box-shadow: var(--tn-shadow-sm);
}

.tn-panel--actions {
  display: flex;
  flex-direction: column;
  gap: var(--tn-space-8);
  align-self: start;
  position: sticky;
  top: var(--tn-space-16);
}

.tn-btn {
  appearance: none;
  border: 1px solid transparent;
  border-radius: var(--tn-radius-sm);
  padding: var(--tn-space-8) var(--tn-space-12);
  font-size: var(--tn-font-size-14);
  font-weight: 600;
  cursor: pointer;
}

.tn-btn:focus-visible {
  outline: 3px solid #93c5fd;
  outline-offset: 2px;
}

.tn-btn--primary {
  background: var(--tn-color-brand);
  color: #fff;
}

.tn-btn--primary:hover { background: var(--tn-color-brand-strong); }

.tn-btn--secondary {
  background: var(--tn-color-action-secondary);
  color: var(--tn-color-text);
  border-color: #c7d4ef;
}

.tn-btn--ghost {
  background: transparent;
  border-color: var(--tn-color-border);
  color: var(--tn-color-text-muted);
}

.tn-btn[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}

.tn-panel--input textarea {
  width: 100%;
  min-height: 240px;
  padding: var(--tn-space-12);
  border: 1px solid var(--tn-color-border);
  border-radius: var(--tn-radius-sm);
  font: inherit;
}

.tn-upload {
  margin-top: var(--tn-space-16);
  padding: var(--tn-space-12);
  border: 1px dashed var(--tn-color-border);
  border-radius: var(--tn-radius-sm);
  background: #fafcff;
}

.tn-panel--status .tn-status-line {
  display: flex;
  justify-content: space-between;
  font-size: var(--tn-font-size-14);
}

.tn-progress {
  margin-top: var(--tn-space-8);
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
  position: relative;
}

.tn-progress::after {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: calc(var(--tn-progress-value, 0) * 1%);
  background: var(--tn-color-info);
}

.tn-stream,
.tn-result,
.tn-diagnostics {
  margin-top: var(--tn-space-12);
  padding: var(--tn-space-12);
  border: 1px solid var(--tn-color-border);
  border-radius: var(--tn-radius-sm);
  background: #fbfdff;
}

.tn-stream {
  min-height: 120px;
  max-height: 280px;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--tn-font-size-12);
}

.tn-result-actions {
  margin-top: var(--tn-space-12);
  display: flex;
  gap: var(--tn-space-8);
  flex-wrap: wrap;
}

/* Universal state hooks */
.tn-app-shell[data-tool-state="validating"] .tn-panel--status { border-color: var(--tn-color-info); }
.tn-app-shell[data-tool-state="running"] .tn-panel--status { border-color: var(--tn-color-info); box-shadow: var(--tn-shadow-md); }
.tn-app-shell[data-tool-state="streaming"] .tn-stream { border-color: var(--tn-color-info); }
.tn-app-shell[data-tool-state="success"] .tn-panel--status { border-color: var(--tn-color-success); }
.tn-app-shell[data-tool-state="warning"] .tn-panel--status { border-color: var(--tn-color-warning); }
.tn-app-shell[data-tool-state="policy-blocked"] .tn-panel--status { border-color: var(--tn-color-policy-blocked); }
.tn-app-shell[data-tool-state="failed"] .tn-panel--status { border-color: var(--tn-color-error); }
.tn-app-shell[data-tool-state="canceled"] .tn-panel--status { border-color: #6b7280; }

/* Responsive behavior */
@media (max-width: 1200px) {
  .tn-tool-workspace {
    grid-template-columns: 1fr 280px;
    grid-template-areas:
      "input actions"
      "status status"
      "output output";
  }

  .tn-panel--input { grid-area: input; }
  .tn-panel--actions { grid-area: actions; }
  .tn-panel--status { grid-area: status; }
  .tn-panel--output { grid-area: output; }
}

@media (max-width: 860px) {
  .tn-platform-header,
  .tn-tool-context,
  .tn-platform-footer,
  .tn-tool-workspace {
    padding: var(--tn-space-16);
  }

  .tn-tool-workspace {
    display: flex;
    flex-direction: column;
  }

  .tn-panel--actions {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .tn-result-actions {
    position: sticky;
    bottom: var(--tn-space-8);
    background: var(--tn-color-surface);
    padding: var(--tn-space-8);
    border-radius: var(--tn-radius-sm);
  }
}
```

---

## SECTION 7 — Interaction States Model

Universal runtime state machine:

1. **idle**
2. **validating**
3. **running**
4. **streaming**
5. **success**
6. **warning**
7. **policy-blocked**
8. **failed**
9. **canceled**

### 7.1 State effects matrix

- **idle**
  - Buttons: Run/Validate enabled.
  - Input: editable.
  - Output: last result visible.
  - Feedback: neutral guidance.

- **validating**
  - Buttons: Validate busy, Run disabled.
  - Input: editable unless structural normalization is in progress.
  - Output: unchanged.
  - Feedback: validation progress + issue count.

- **running**
  - Buttons: Run disabled, Cancel enabled.
  - Input: locked for sync; policy-configured for async.
  - Output: pending placeholder.
  - Feedback: phase + elapsed timer.

- **streaming**
  - Buttons: Cancel enabled; Run disabled.
  - Input: locked.
  - Output: live chunks appended.
  - Feedback: streaming marker and throughput hint.

- **success**
  - Buttons: Run enabled, Retry hidden.
  - Input: editable.
  - Output: finalized result.
  - Feedback: success summary + follow-up actions.

- **warning**
  - Buttons: Run enabled; Retry optional.
  - Input: editable.
  - Output: partial/qualified output.
  - Feedback: warning summary and mitigation hint.

- **policy-blocked**
  - Buttons: Run disabled until policy changes.
  - Input: editable.
  - Output: no execution output.
  - Feedback: explicit denial reason code + next steps.

- **failed**
  - Buttons: Retry enabled when eligible.
  - Input: preserved and editable.
  - Output: error panel + diagnostics toggle.
  - Feedback: failure reason and recovery suggestions.

- **canceled**
  - Buttons: Run enabled, Cancel hidden.
  - Input: editable.
  - Output: canceled notice + partial data if available.
  - Feedback: cancellation acknowledgment.

---

## SECTION 8 — UI Enhancement & Improvement Plan

### 8.1 Current likely UX weaknesses
- Drift between tool-specific control semantics and platform semantics.
- Inconsistent visibility of policy decisions.
- Streaming output performance degradation on long sessions.
- Uneven accessibility support for state announcements.

### 8.2 Inconsistency risks
- Tool authors bypassing standard action bar.
- Risk badges not mapped to canonical tier labels.
- Async tools implementing custom status models instead of platform state machine.

### 8.3 Runtime-driven UX improvements
- Auto-generated action labels from capability metadata.
- Policy explanation templates keyed by reason code.
- Adaptive default layouts based on execution class.

### 8.4 Accessibility upgrades
- Add centralized live-region announcer service.
- Ensure every icon has text fallback.
- Increase minimum hit area for all action controls.
- Add reduced-motion mode for streaming/transition effects.

### 8.5 Performance-friendly rendering patterns
- Output virtualization for large logs.
- Chunk coalescing during high-frequency streams.
- Deferred rendering for diagnostic details.
- Memoized capability badge rendering by profile id.

### 8.6 Future enhancement roadmap
1. **Phase A:** enforce DOM contract linting and badge schema validation in CI.
2. **Phase B:** deploy unified state inspector panel for debugging and QA.
3. **Phase C:** add user-customizable, accessibility-safe workspace density options.
4. **Phase D:** integrate historical execution comparison view in follow-up panel.
5. **Phase E:** introduce policy simulation mode in pre-execution validation.

---

## SECTION 9 — Developer Implementation Guidance

### 9.1 What tool developers may customize
- Input control internals inside `data-tool-extension-slot="input"`.
- Output renderer internals inside `data-tool-extension-slot="output"`.
- Non-critical helper copy and examples.
- Additional follow-up actions when registered through platform action contract.

### 9.2 What must remain platform-controlled
- Shell layout hierarchy and landmark structure.
- Capability badge definitions and ordering.
- Universal state machine labels and transitions.
- Governance message container and denial/approval semantics.
- Primary action semantics and disable/enable logic.

### 9.3 Extension boundaries
- Extension slots cannot remove required anchors.
- Extension slots cannot mutate policy indicators directly.
- Extension slots cannot suppress status layer.
- Extensions must degrade gracefully in mobile stacked layout.

---

## SECTION 10 — FINAL DESIGN SUMMARY

### UNIFIED TOOLNEXUS UX/UI SYSTEM
This specification defines the final platform UX decision:
- One ToolShell architecture for every tool.
- One capability-driven behavior model connected to execution governance.
- One universal interaction grammar and state machine.
- One implementation-ready semantic HTML/CSS contract for frontend teams.

All frontend implementations must conform to this document as the source of truth for ToolNexus platform experience.

END.
