const DEFAULT_COMPLEXITY_WEIGHTS = Object.freeze({
  editor: 2,
  action: 1,
  workflowBonus: 2,
  heavyPanelBonus: 2,
  payloadBonus: 2
});

function countEditors(root) {
  return root.querySelectorAll('textarea, [contenteditable="true"], [data-tool-editor], .monaco-editor, .CodeMirror').length;
}

function countActions(root) {
  return root.querySelectorAll('[data-tool-actions] button, .tool-local-actions button, .tn-unified-tool-control__actions button, button[data-action]').length;
}

function detectWidgetType(editorCount, actionCount) {
  if (editorCount >= 2 && actionCount >= 3) {
    return 'workflow';
  }

  if (editorCount >= 2) {
    return 'editor-heavy';
  }

  return 'simple';
}

function estimatePayloadSize(root) {
  const inputs = root.querySelectorAll('textarea, input[type="text"], input[type="search"], [contenteditable="true"]');
  let total = 0;

  for (const input of inputs) {
    const value = input.value ?? input.textContent ?? '';
    total += String(value).length;
  }

  return total;
}

export function profileExecutionContext(root, options = {}) {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return {
      editorCount: 0,
      actionCount: 0,
      complexityScore: 0,
      widgetType: 'simple',
      isEditingIntensive: false,
      estimatedPayloadSize: 0
    };
  }

  const weights = { ...DEFAULT_COMPLEXITY_WEIGHTS, ...(options.weights ?? {}) };
  const editorCount = countEditors(root);
  const actionCount = countActions(root);
  const widgetType = detectWidgetType(editorCount, actionCount);
  const estimatedPayloadSize = estimatePayloadSize(root);

  const isEditingIntensive = editorCount >= 3;
  const hasHeavyPanels = root.querySelectorAll('[data-tool-input], [data-tool-output], .tool-local-surface').length >= 3;
  const complexityScore = (
    (editorCount * weights.editor)
    + (actionCount * weights.action)
    + (widgetType === 'workflow' ? weights.workflowBonus : 0)
    + (hasHeavyPanels ? weights.heavyPanelBonus : 0)
    + (estimatedPayloadSize >= 8000 ? weights.payloadBonus : 0)
  );

  return {
    editorCount,
    actionCount,
    complexityScore,
    widgetType,
    isEditingIntensive,
    estimatedPayloadSize
  };
}
