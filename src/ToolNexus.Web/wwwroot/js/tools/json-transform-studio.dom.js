const DOM_IDS = [
  'inputEditor',
  'outputEditor',
  'formatBtn',
  'minifyBtn',
  'flattenBtn',
  'extractKeysBtn',
  'filterPathsBtn',
  'clearBtn',
  'pathFilterInput',
  'diagnosticsOutput',
  'metricDuration',
  'metricInputSize',
  'metricOutputSize',
  'metricThroughput',
  'errorBox'
];

export function queryJsonTransformStudioDom(root) {
  return DOM_IDS.reduce((acc, id) => {
    acc[id] = root.querySelector(`#${id}`);
    return acc;
  }, { root });
}

export function renderError(dom, error) {
  if (!dom.errorBox) return;
  dom.errorBox.hidden = false;
  dom.errorBox.textContent = `${error.title}: ${error.message}`;
}

export function clearError(dom) {
  if (!dom.errorBox) return;
  dom.errorBox.hidden = true;
  dom.errorBox.textContent = '';
}

export function renderMetrics(dom, metrics) {
  dom.metricDuration.textContent = `${metrics.durationMs} ms`;
  dom.metricInputSize.textContent = `${metrics.inputChars.toLocaleString()} chars`;
  dom.metricOutputSize.textContent = `${metrics.outputChars.toLocaleString()} chars`;
  dom.metricThroughput.textContent = `${(metrics.throughputCharsPerMs ?? 0).toLocaleString()} chars/ms`;
}

export function renderDiagnostics(dom, diagnostics, isError = false) {
  if (!dom.diagnosticsOutput) return;

  if (isError) {
    dom.diagnosticsOutput.textContent = 'Execution failed. Inspect error region for details.';
    return;
  }

  dom.diagnosticsOutput.textContent = [
    `Action: ${diagnostics.action}`,
    `Timestamp: ${diagnostics.timestamp}`,
    diagnostics.notes
  ].join('\n');
}
