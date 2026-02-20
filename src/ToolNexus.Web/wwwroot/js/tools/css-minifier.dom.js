const SELECTORS = Object.freeze({
  page: '.tool-page[data-slug="css-minifier"]',
  actionSelect: '#actionSelect',
  inputEditor: '#inputEditor',
  outputEditor: '#outputEditor',
  runBtn: '#runBtn',
  copyBtn: '#copyBtn',
  downloadBtn: '#downloadBtn',
  shortcutHint: '#editorShortcutHint',
  outputHeading: '#toolOutputHeading',
  outputStatus: '#resultStatus',
  toolbar: '.tool-toolbar__actions',
  outputPanel: '#outputField'
});

export function getCssMinifierDom(root) {
  if (!root?.matches?.(SELECTORS.page)) return null;

  const toolbar = root.querySelector(SELECTORS.toolbar);
  let clearButton = root.querySelector('#cssMinifierClearBtn');
  let clearButtonCreated = false;
  if (!clearButton && toolbar) {
    clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'tool-btn tool-btn--outline';
    clearButton.id = 'cssMinifierClearBtn';
    clearButton.textContent = 'Clear Input';
    toolbar.appendChild(clearButton);
    clearButtonCreated = true;
  }

  let options = root.querySelector('.css-minifier-options');
  let optionsCreated = false;
  if (!options && toolbar) {
    options = document.createElement('div');
    options.className = 'css-minifier-options';
    options.innerHTML = `
      <label><input id="cssAutoMinifyToggle" type="checkbox" /> Auto minify</label>
      <label><input id="cssPreserveCommentsToggle" type="checkbox" /> Preserve /*! comments */</label>
    `;
    toolbar.after(options);
    optionsCreated = true;
  }

  let metrics = root.querySelector('#cssMinifierMetrics');
  let metricsCreated = false;
  let warnings = root.querySelector('#cssMinifierWarnings');
  let warningsCreated = false;

  const outputPanel = root.querySelector(SELECTORS.outputPanel)?.parentElement;
  if (outputPanel && !metrics) {
    metrics = document.createElement('div');
    metrics.id = 'cssMinifierMetrics';
    metrics.className = 'css-minifier-metrics';
    metrics.innerHTML = '<span>Original: 0 B</span><span>Minified: 0 B</span><span>Reduction: 0%</span>';
    outputPanel.prepend(metrics);
    metricsCreated = true;
  }

  if (outputPanel && !warnings) {
    warnings = document.createElement('div');
    warnings.id = 'cssMinifierWarnings';
    warnings.className = 'tool-error';
    warnings.hidden = true;
    outputPanel.prepend(warnings);
    warningsCreated = true;
  }

  return {
    root,
    actionSelect: root.querySelector(SELECTORS.actionSelect),
    inputEditor: root.querySelector(SELECTORS.inputEditor),
    outputEditor: root.querySelector(SELECTORS.outputEditor),
    runBtn: root.querySelector(SELECTORS.runBtn),
    copyBtn: root.querySelector(SELECTORS.copyBtn),
    downloadBtn: root.querySelector(SELECTORS.downloadBtn),
    shortcutHint: root.querySelector(SELECTORS.shortcutHint),
    outputHeading: root.querySelector(SELECTORS.outputHeading),
    outputStatus: root.querySelector(SELECTORS.outputStatus),
    clearButton,
    options,
    metrics,
    warnings,
    autoToggle: root.querySelector('#cssAutoMinifyToggle'),
    preserveToggle: root.querySelector('#cssPreserveCommentsToggle'),
    clearButtonCreated,
    optionsCreated,
    metricsCreated,
    warningsCreated
  };
}
