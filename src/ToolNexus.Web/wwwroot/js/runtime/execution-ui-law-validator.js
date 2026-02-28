const DEFAULT_THRESHOLDS = Object.freeze({
  toolbarMinHeightPx: 36,
  toolbarMaxHeightPx: 72,
  editorMinHeightPx: 240,
  editorMaxHeightPx: 720,
  editorHeightDeltaMaxPx: 40,
  minGapPx: 4,
  maxGapPx: 20
});

function px(value) {
  if (!value) return Number.NaN;
  const parsed = Number.parseFloat(String(value).replace('px', '').trim());
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function addViolation(list, ruleId, severity, message) {
  list.push({ ruleId, severity, message });
}

function countPrimaryActions(scope) {
  return scope.querySelectorAll('.tn-btn--primary, .btn-primary, .tool-action--primary, [data-tool-action="execute"], [data-tool-execute], #executeBtn').length;
}

function elementHeight(el) {
  if (!el) return Number.NaN;
  const inline = px(el.style?.height || el.style?.minHeight);
  if (Number.isFinite(inline)) return inline;
  const computed = globalThis.getComputedStyle ? globalThis.getComputedStyle(el) : null;
  const candidate = px(computed?.height || computed?.minHeight);
  return candidate;
}

function isHidden(el) {
  if (!el) return true;
  if (el.hidden) return true;
  const computed = globalThis.getComputedStyle ? globalThis.getComputedStyle(el) : null;
  return computed?.display === 'none' || computed?.visibility === 'hidden' || computed?.opacity === '0';
}

function validateGaps(scope, thresholds, violations) {
  const runtimeWidget = scope.querySelector('.tool-runtime-widget');
  if (!runtimeWidget) return;

  const computed = globalThis.getComputedStyle ? globalThis.getComputedStyle(runtimeWidget) : null;
  const gap = px(computed?.gap || runtimeWidget.style?.gap);
  if (Number.isFinite(gap) && (gap < thresholds.minGapPx || gap > thresholds.maxGapPx)) {
    addViolation(violations, 'RULE_3', 'medium', `Runtime gap ${gap}px outside allowed range (${thresholds.minGapPx}-${thresholds.maxGapPx}px).`);
  }
}

export function validateExecutionUiLaw(root, options = {}) {
  const scope = root ?? document;
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(options.thresholds ?? {}) };
  const violations = [];

  const shell = scope.matches?.('[data-tool-shell]') ? scope : scope.querySelector?.('[data-tool-shell]');
  const status = shell?.querySelector?.('[data-tool-status]') ?? scope.querySelector?.('[data-tool-status]');
  const widget = scope.querySelector?.('.tool-runtime-widget');

  if (!widget) {
    addViolation(violations, 'RULE_2', 'critical', 'Missing .tool-runtime-widget root.');
  }

  if (shell && widget && shell.contains(widget) === false) {
    addViolation(violations, 'RULE_2', 'critical', 'Widget is mounted outside shell scope.');
  }

  const nested = scope.querySelectorAll?.('.tool-runtime-widget .tool-runtime-widget').length ?? 0;
  if (nested > 0) {
    addViolation(violations, 'RULE_6', 'critical', 'Nested .tool-runtime-widget containers detected.');
  }

  const toolbar = widget?.querySelector?.('.tool-local-actions');
  if (!toolbar) {
    addViolation(violations, 'RULE_4', 'high', 'Missing .tool-local-actions toolbar.');
  } else {
    const primaryCount = countPrimaryActions(toolbar);
    if (primaryCount !== 1) {
      addViolation(violations, 'RULE_4', 'high', `Toolbar must have exactly one primary action, found ${primaryCount}.`);
    }

    const toolbarHeight = elementHeight(toolbar);
    if (Number.isFinite(toolbarHeight) && (toolbarHeight < thresholds.toolbarMinHeightPx || toolbarHeight > thresholds.toolbarMaxHeightPx)) {
      addViolation(violations, 'RULE_3', 'medium', `Toolbar height ${toolbarHeight}px outside range (${thresholds.toolbarMinHeightPx}-${thresholds.toolbarMaxHeightPx}px).`);
    }
  }

  const editors = widget?.querySelectorAll?.('[data-editor-surface], .tool-local-surface, textarea, [contenteditable="true"]') ?? [];
  if (editors.length >= 2) {
    const first = elementHeight(editors[0]);
    const second = elementHeight(editors[1]);
    if (Number.isFinite(first) && Number.isFinite(second)) {
      const delta = Math.abs(first - second);
      if (delta > thresholds.editorHeightDeltaMaxPx) {
        addViolation(violations, 'RULE_5', 'medium', `Dual editor height delta ${delta}px exceeds ${thresholds.editorHeightDeltaMaxPx}px.`);
      }
      for (const h of [first, second]) {
        if (h < thresholds.editorMinHeightPx || h > thresholds.editorMaxHeightPx) {
          addViolation(violations, 'RULE_5', 'medium', `Editor height ${h}px outside allowed range (${thresholds.editorMinHeightPx}-${thresholds.editorMaxHeightPx}px).`);
        }
      }
    }
  }

  validateGaps(scope, thresholds, violations);

  const docs = widget?.querySelector?.('[data-tool-docs], .tool-local-docs, .tool-docs');
  if (docs && docs.className.match(/primary|hero|highlight/iu)) {
    addViolation(violations, 'RULE_8', 'medium', 'Documentation region appears visually primary.');
  }

  if (!status || isHidden(status)) {
    addViolation(violations, 'RULE_9', 'high', 'Runtime status anchor is missing or hidden.');
  }

  const score = Math.max(0, 100 - violations.reduce((sum, v) => sum + (v.severity === 'critical' ? 12 : v.severity === 'high' ? 7 : 3), 0));
  const passed = violations.length === 0;

  if (!passed && globalThis.console?.warn) {
    globalThis.console.warn('[ExecutionUiLaw] violations detected; tool load continues.', { violations, score });
  }

  return { passed, score, violations };
}
