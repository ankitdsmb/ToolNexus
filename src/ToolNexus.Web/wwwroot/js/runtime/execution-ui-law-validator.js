import { EXECUTION_UI_IMMUNITY, scoreFromViolations, severityForRule } from './execution-ui-immunity-constants.js';

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

function addViolation(list, ruleId, message) {
  list.push({ ruleId, severity: severityForRule(ruleId), message });
}

function countPrimaryActions(scope) {
  return scope.querySelectorAll('[data-tool-primary-action], .tn-btn--primary, .btn-primary, .tool-action--primary, [data-tool-action="execute"], [data-tool-execute], #executeBtn').length;
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
    addViolation(violations, 'RULE_3', `Runtime gap ${gap}px outside allowed range (${thresholds.minGapPx}-${thresholds.maxGapPx}px).`);
  }
}

function selectorTouchesShell(selectorText = '') {
  return EXECUTION_UI_IMMUNITY.shellSelectors.some((selector) => selectorText.includes(selector))
    || EXECUTION_UI_IMMUNITY.shellAnchors.some((anchor) => selectorText.includes(anchor));
}

function bodyTouchesShellLayout(styleText = '') {
  const normalized = styleText.replace(/\s+/gu, '').toLowerCase();
  return EXECUTION_UI_IMMUNITY.shellLayoutProperties.some((prop) => normalized.includes(prop.replace(/\s+/gu, '').toLowerCase()));
}

function collectCssRuleViolations(violations) {
  if (!globalThis.document?.styleSheets) return;

  for (const styleSheet of document.styleSheets) {
    let rules = [];
    try {
      rules = styleSheet.cssRules ?? [];
    } catch {
      continue;
    }

    for (const rule of rules) {
      if (!('selectorText' in rule) || !rule.selectorText) continue;
      const selector = String(rule.selectorText);
      if (!selectorTouchesShell(selector)) continue;

      const styleText = rule.style?.cssText ?? '';
      addViolation(violations, 'RULE_7', `Tool CSS targets shell or data-tool-* anchors: ${selector}`);
      if (bodyTouchesShellLayout(styleText)) {
        addViolation(violations, 'RULE_1', `Tool CSS controls shell layout via selector: ${selector}`);
        addViolation(violations, 'RULE_10', `Shell layout redefined by tool CSS: ${selector}`);
      }
    }
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
    addViolation(violations, 'RULE_2', 'Missing .tool-runtime-widget root.');
  }

  if (shell && widget && shell.contains(widget) === false) {
    addViolation(violations, 'RULE_2', 'Widget is mounted outside shell scope.');
  }

  const nested = scope.querySelectorAll?.('.tool-runtime-widget .tool-runtime-widget').length ?? 0;
  if (nested > 0) {
    addViolation(violations, 'RULE_6', 'Nested .tool-runtime-widget containers detected.');
  }

  const toolbar = widget?.querySelector?.('.tool-local-actions');
  if (!toolbar) {
    addViolation(violations, 'RULE_4', 'Missing .tool-local-actions toolbar.');
  } else {
    const primaryCount = countPrimaryActions(widget);
    if (primaryCount !== 1) {
      addViolation(violations, 'RULE_4', `Tool must have exactly one primary action, found ${primaryCount}.`);
    }

    const toolbarHeight = elementHeight(toolbar);
    if (Number.isFinite(toolbarHeight) && (toolbarHeight < thresholds.toolbarMinHeightPx || toolbarHeight > thresholds.toolbarMaxHeightPx)) {
      addViolation(violations, 'RULE_3', `Toolbar height ${toolbarHeight}px outside range (${thresholds.toolbarMinHeightPx}-${thresholds.toolbarMaxHeightPx}px).`);
    }
  }

  const editors = widget?.querySelectorAll?.('[data-editor-surface], .tool-local-surface, textarea, [contenteditable="true"]') ?? [];
  if (editors.length >= 2) {
    const first = elementHeight(editors[0]);
    const second = elementHeight(editors[1]);
    if (Number.isFinite(first) && Number.isFinite(second)) {
      const delta = Math.abs(first - second);
      if (delta > thresholds.editorHeightDeltaMaxPx) {
        addViolation(violations, 'RULE_5', `Dual editor height delta ${delta}px exceeds ${thresholds.editorHeightDeltaMaxPx}px.`);
      }
      for (const h of [first, second]) {
        if (h < thresholds.editorMinHeightPx || h > thresholds.editorMaxHeightPx) {
          addViolation(violations, 'RULE_5', `Editor height ${h}px outside allowed range (${thresholds.editorMinHeightPx}-${thresholds.editorMaxHeightPx}px).`);
        }
      }
    }
  }

  validateGaps(scope, thresholds, violations);

  const docs = widget?.querySelector?.('[data-tool-docs], .tool-local-docs, .tool-docs');
  if (docs && docs.className.match(/primary|hero|highlight/iu)) {
    addViolation(violations, 'RULE_8', 'Documentation region appears visually primary.');
  }

  if (!status || isHidden(status)) {
    addViolation(violations, 'RULE_9', 'Runtime status anchor is missing or hidden.');
  }

  collectCssRuleViolations(violations);

  const score = scoreFromViolations(violations);
  const passed = violations.length === 0;

  if (!passed && globalThis.console?.warn) {
    globalThis.console.warn('[ExecutionUiLaw] violations detected; tool load continues.', { violations, score });
  }

  return { passed, score, violations };
}
