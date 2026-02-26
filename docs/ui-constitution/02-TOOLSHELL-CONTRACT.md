# ToolShell DOM Contract (Mandatory)

This document defines the **mandatory, immutable ToolShell DOM contract** for every execution-capability surface in ToolNexus.

This contract exists to preserve the platform's stable workspace DNA and execution lifecycle visibility while allowing tool-specific behavior only in controlled extension areas.

## 1) Contract scope

The ToolShell contract applies to all tool experiences rendered in the ToolNexus workspace.

It is aligned with the immutable global platform structure:

- Header
- Context strip
- Left input panel
- Right output panel
- Follow-up action bar

Tool content must map into this contract. Tools may change data and content **inside owned regions**, but may not mutate contract anchors.

## 2) Required anchors

The following DOM anchors are **required** and **must exist exactly once** in a ToolShell instance:

- `data-tool-shell`
- `data-tool-context`
- `data-tool-input`
- `data-tool-status`
- `data-tool-output`
- `data-tool-followup`

---

## 3) Anchor definitions

### 3.1 `data-tool-shell`

- **Purpose:** Root execution workspace container for a single tool surface; establishes stable structural boundary for all ToolShell regions.
- **Ownership:** **Platform**.
- **Mutation rules:**
  - Immutable anchor.
  - Must not be renamed, removed, duplicated, or reparented by tools.
  - Platform controls region ordering and structural composition under this root.

### 3.2 `data-tool-context`

- **Purpose:** Context strip region that surfaces runtime/governance capsules (for example runtime identity, policy, lifecycle, authority).
- **Ownership:** **Platform container and layout = Platform**; **context capsule values/content = Tool/runtime data through platform bindings**.
- **Mutation rules:**
  - Immutable anchor.
  - Tools must not replace or relocate the strip.
  - Data updates are allowed through approved bindings; structural/layout mutation is not allowed.

### 3.3 `data-tool-input`

- **Purpose:** Left panel configuration/input region for request setup and validation-ready inputs.
- **Ownership:** **Panel frame = Platform**; **input controls/content = Tool** (schema-driven preferred).
- **Mutation rules:**
  - Immutable anchor.
  - Tool may render/refresh form content inside approved input extension area.
  - Tool may not collapse/remove/reposition the input region during execution.

### 3.4 `data-tool-status`

- **Purpose:** Always-visible execution status surface (READY, QUEUED, RUNNING, SUCCESS, FAILED, POLICY_DENIED, NORMALIZED, etc.) tied to shared runtime state contract.
- **Ownership:** **Platform state presenter = Platform**; **status payload = Runtime/Execution pipeline**.
- **Mutation rules:**
  - Immutable anchor.
  - Tool must not hide, remove, or replace status structure.
  - Only status value/state and permitted status details may update.

### 3.5 `data-tool-output`

- **Purpose:** Right panel execution output surface for results, logs, conformance output, and adaptive renderers.
- **Ownership:** **Panel frame = Platform**; **rendered output payload = Tool/runtime adapters under platform contracts**.
- **Mutation rules:**
  - Immutable anchor.
  - Tool may render output content within output extension area.
  - Tool must not alter outer panel placement/order or move execution dynamics outside this region.

### 3.6 `data-tool-followup`

- **Purpose:** Follow-up action bar for capability-driven next actions (re-run, copy, export, compare, view logs, etc.).
- **Ownership:** **Action bar frame and action policy = Platform**; **tool-eligible actions = Tool capability metadata approved by platform**.
- **Mutation rules:**
  - Immutable anchor.
  - Tool may contribute actions only through platform action registration/metadata.
  - Tool must not inject arbitrary layout patterns or move follow-up actions outside this anchor.

---

## 4) Global mutation rules (mandatory)

1. **ToolShell anchors are immutable.**
   - No renaming, deletion, duplication, or structural relocation of required anchors.

2. **Extensions are allowed only inside extension slots.**
   - Tools may extend content only inside platform-owned extension containers within:
     - `data-tool-input`
     - `data-tool-output`
     - `data-tool-followup` (via approved action contribution contract)
   - Extensions must not alter platform-owned shell structure.

3. **Legacy tools must map into this structure.**
   - Existing/legacy tool UIs must be wrapped and normalized so their behavior is expressed through required ToolShell anchors.
   - Legacy custom layouts may exist only as internal content rendering inside extension slots, never as alternate outer layouts.

4. **Execution UI stability is required.**
   - Execution-time dynamics belong in status/output regions.
   - Input structure remains stable while execution state changes.

## 5) Minimal HTML structure example

```html
<section data-tool-shell>
  <div data-tool-context>
    <!-- Platform-managed context capsules -->
    <span>Runtime: Auto</span>
    <span>Policy: Admitted</span>
    <span>Authority: Unified</span>
  </div>

  <div class="tool-workspace">
    <aside data-tool-input>
      <!-- Input extension slot (tool-owned content inside platform frame) -->
      <div data-tool-input-slot>
        <label for="prompt">Prompt</label>
        <textarea id="prompt" name="prompt"></textarea>
      </div>
    </aside>

    <main>
      <div data-tool-status>
        <!-- Platform status presenter bound to runtime state contract -->
        <strong>READY</strong>
      </div>

      <section data-tool-output>
        <!-- Output extension slot -->
        <div data-tool-output-slot>
          <pre>{ "message": "Awaiting execution" }</pre>
        </div>
      </section>
    </main>
  </div>

  <footer data-tool-followup>
    <!-- Platform-governed follow-up actions -->
    <div data-tool-followup-slot>
      <button type="button">Re-run</button>
      <button type="button">Copy output</button>
    </div>
  </footer>
</section>
```

## 6) Conformance expectation

A tool experience is conformant only when all required anchors are present and unchanged, and all tool-specific customization is constrained to approved extension slots.
