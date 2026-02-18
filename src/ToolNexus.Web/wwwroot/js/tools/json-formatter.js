const LARGE_FILE_THRESHOLD_BYTES = 1024 * 1024;
const MARKER_OWNER = 'json-validation';

const dom = {
  formatBtn: document.getElementById('formatBtn'),
  minifyBtn: document.getElementById('minifyBtn'),
  validateBtn: document.getElementById('validateBtn'),
  autofixBtn: document.getElementById('autofixBtn'),
  copyBtn: document.getElementById('copyBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  treeToggle: document.getElementById('treeToggle'),
  diffToggle: document.getElementById('diffToggle'),
  wrapToggle: document.getElementById('wrapToggle'),
  perfTime: document.getElementById('perfTime'),
  validationState: document.getElementById('validationState'),
  payloadStats: document.getElementById('payloadStats'),
  largeFileWarning: document.getElementById('largeFileWarning'),
  errorMessage: document.getElementById('errorMessage'),
  resultStatus: document.getElementById('resultStatus'),
  jsonEditor: document.getElementById('jsonEditor'),
  outputEditor: document.getElementById('outputEditor'),
  diffEditor: document.getElementById('diffEditor'),
  treeView: document.getElementById('treeView'),
  dropZone: document.getElementById('dropZone'),
  toastRegion: document.getElementById('toastRegion')
};

if (!dom.jsonEditor || !window.require) {
  throw new Error('Monaco editor loader is unavailable for json-formatter.');
}

window.require.config({
  paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs' }
});

window.require(['vs/editor/editor.main'], () => initialize(window.monaco));

function initialize(monaco) {
  const inputValue = window.ToolNexusConfig?.jsonExampleInput ?? '{\n  "hello": "world"\n}';
  const inputModel = monaco.editor.createModel(inputValue, 'json');
  const outputModel = monaco.editor.createModel('', 'json');

  const inputEditor = monaco.editor.create(dom.jsonEditor, {
    model: inputModel,
    theme: 'vs-dark',
    minimap: { enabled: false },
    automaticLayout: true,
    wordWrap: 'off'
  });

  const outputEditor = monaco.editor.create(dom.outputEditor, {
    model: outputModel,
    theme: 'vs-dark',
    minimap: { enabled: false },
    automaticLayout: true,
    readOnly: true,
    wordWrap: 'off'
  });

  const diffEditor = monaco.editor.createDiffEditor(dom.diffEditor, {
    theme: 'vs-dark',
    minimap: { enabled: false },
    automaticLayout: true,
    readOnly: true,
    originalEditable: false,
    renderSideBySide: true
  });
  diffEditor.setModel({ original: inputModel, modified: outputModel });

  bindEvents({ monaco, inputEditor, outputEditor, inputModel, outputModel, diffEditor });
  updatePayloadStats(inputModel.getValue());
  autoFormatIfValid({ monaco, inputModel, outputModel, outputEditor, silent: true });
}

function bindEvents(ctx) {
  const { monaco, inputEditor, outputEditor, inputModel, outputModel } = ctx;

  dom.formatBtn?.addEventListener('click', () => performAction('format', ctx));
  dom.minifyBtn?.addEventListener('click', () => performAction('minify', ctx));
  dom.validateBtn?.addEventListener('click', () => performAction('validate', ctx));
  dom.autofixBtn?.addEventListener('click', () => performAction('autofix', ctx));
  dom.copyBtn?.addEventListener('click', () => copyOutput(outputModel.getValue()));
  dom.downloadBtn?.addEventListener('click', () => downloadOutput(outputModel.getValue()));

  dom.wrapToggle?.addEventListener('change', () => {
    const wrapValue = dom.wrapToggle.checked ? 'on' : 'off';
    inputEditor.updateOptions({ wordWrap: wrapValue });
    outputEditor.updateOptions({ wordWrap: wrapValue });
  });

  dom.treeToggle?.addEventListener('change', () => {
    if (!dom.treeToggle.checked) {
      dom.treeView.hidden = true;
      return;
    }

    const rendered = renderTree(outputModel.getValue() || inputModel.getValue());
    if (!rendered) {
      showError('Tree view is available only for valid JSON.');
      dom.treeToggle.checked = false;
    } else {
      clearError();
      dom.treeView.hidden = false;
    }
  });

  dom.diffToggle?.addEventListener('change', () => {
    const enabled = dom.diffToggle.checked;
    dom.outputEditor.hidden = enabled;
    dom.diffEditor.hidden = !enabled;
  });

  inputModel.onDidChangeContent(() => {
    const value = inputModel.getValue();
    updatePayloadStats(value);
    validateJson({ monaco, model: inputModel, value, updateState: true });
  });

  inputEditor.onDidPaste(() => {
    autoFormatIfValid(ctx);
  });

  wireDragAndDrop(ctx);
}

function performAction(action, ctx) {
  const start = performance.now();
  const { monaco, inputModel, outputModel, outputEditor } = ctx;
  const raw = inputModel.getValue();

  try {
    clearError();
    if (action === 'autofix') {
      inputModel.setValue(autoFixCommonJsonIssues(raw));
      autoFormatIfValid(ctx);
      updatePerf(start);
      return;
    }

    const parsed = JSON.parse(raw);

    if (action === 'validate') {
      dom.validationState.textContent = 'Valid JSON';
      setMarkers(monaco, inputModel, []);
      showToast('JSON is valid.', 'success');
      updatePerf(start);
      return;
    }

    const output = action === 'minify' ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2);
    outputModel.setValue(output);
    outputEditor.revealLine(1);
    dom.resultStatus.textContent = action === 'minify' ? 'Minified output ready.' : 'Formatted output ready.';

    if (dom.treeToggle?.checked) {
      renderTree(output);
      dom.treeView.hidden = false;
    }

    dom.validationState.textContent = 'Valid JSON';
    setMarkers(monaco, inputModel, []);
    updatePerf(start);
  } catch (error) {
    handleJsonError({ monaco, inputModel, error, start });
  }
}

function autoFormatIfValid(ctx, options = {}) {
  const start = performance.now();
  const { monaco, inputModel, outputModel } = ctx;
  const raw = inputModel.getValue();

  try {
    const parsed = JSON.parse(raw);
    const formatted = JSON.stringify(parsed, null, 2);
    outputModel.setValue(formatted);
    setMarkers(monaco, inputModel, []);
    dom.validationState.textContent = 'Valid JSON';
    dom.resultStatus.textContent = 'Auto-formatted from paste/input.';
    if (!options.silent) showToast('Auto-formatted pasted JSON.', 'success');
    updatePerf(start);
  } catch (error) {
    validateJson({ monaco, model: inputModel, value: raw, updateState: true });
    if (!options.silent) {
      dom.resultStatus.textContent = 'Input changed. Fix errors to format.';
    }
  }
}

function validateJson({ monaco, model, value, updateState }) {
  try {
    JSON.parse(value);
    setMarkers(monaco, model, []);
    if (updateState) dom.validationState.textContent = 'Valid JSON';
    return true;
  } catch (error) {
    const marker = parseErrorToMarker(error);
    setMarkers(monaco, model, marker ? [marker] : []);
    if (updateState) dom.validationState.textContent = 'Invalid JSON';
    return false;
  }
}

function parseErrorToMarker(error) {
  const message = String(error?.message ?? 'Invalid JSON');
  const match = message.match(/position\s(\d+)/i);
  if (!match) {
    return {
      startLineNumber: 1,
      endLineNumber: 1,
      startColumn: 1,
      endColumn: 1,
      message,
      severity: 8
    };
  }

  const position = Number.parseInt(match[1], 10);
  return {
    startLineNumber: 1,
    endLineNumber: 1,
    startColumn: Math.max(1, position),
    endColumn: Math.max(2, position + 1),
    message,
    severity: 8
  };
}

function handleJsonError({ monaco, inputModel, error, start }) {
  const marker = parseErrorToMarker(error);
  setMarkers(monaco, inputModel, marker ? [marker] : []);
  dom.validationState.textContent = 'Invalid JSON';
  showError(error.message);
  dom.resultStatus.textContent = 'Validation error';
  updatePerf(start);
}

function setMarkers(monaco, model, markers) {
  monaco.editor.setModelMarkers(model, MARKER_OWNER, markers);
}

function autoFixCommonJsonIssues(raw) {
  return raw
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\/\/.*$/gm, '')
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/([\{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":')
    .replace(/:\s*'([^']*)'/g, ': "$1"')
    .trim();
}

function renderTree(input) {
  try {
    const parsed = JSON.parse(input);
    dom.treeView.innerHTML = '';
    dom.treeView.appendChild(buildTreeNode(parsed, 'root'));
    return true;
  } catch {
    return false;
  }
}

function buildTreeNode(value, key) {
  const row = document.createElement('details');
  row.open = key === 'root';

  const summary = document.createElement('summary');
  summary.textContent = `${key}: ${Array.isArray(value) ? `[${value.length}]` : typeof value}`;
  row.appendChild(summary);

  if (value !== null && typeof value === 'object') {
    Object.entries(value).forEach(([childKey, childValue]) => {
      row.appendChild(buildTreeNode(childValue, childKey));
    });
  } else {
    const leaf = document.createElement('div');
    leaf.textContent = String(value);
    row.appendChild(leaf);
  }

  return row;
}

async function copyOutput(value) {
  if (!value) {
    showToast('No output to copy.', 'error');
    return;
  }

  await navigator.clipboard.writeText(value);
  dom.copyBtn?.classList.add('copy-success');
  showToast('Copied to clipboard.', 'success');
  setTimeout(() => dom.copyBtn?.classList.remove('copy-success'), 450);
}

function downloadOutput(value) {
  if (!value) {
    showToast('No output to download.', 'error');
    return;
  }

  const blob = new Blob([value], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'toolnexus-json-output.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Downloaded JSON output.', 'success');
}

function wireDragAndDrop(ctx) {
  ['dragenter', 'dragover'].forEach((eventName) => {
    dom.dropZone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      dom.dropZone.classList.add('is-dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dom.dropZone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      dom.dropZone.classList.remove('is-dragover');
    });
  });

  dom.dropZone?.addEventListener('drop', async (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    const text = await file.text();
    ctx.inputModel.setValue(text);
    autoFormatIfValid(ctx);
  });
}

function updatePayloadStats(value) {
  const bytes = new TextEncoder().encode(value).length;
  dom.payloadStats.textContent = formatBytes(bytes);
  dom.largeFileWarning.hidden = bytes < LARGE_FILE_THRESHOLD_BYTES;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function updatePerf(start) {
  const elapsed = (performance.now() - start).toFixed(2);
  dom.perfTime.textContent = `${elapsed} ms`;
}

function showError(message) {
  dom.errorMessage.hidden = false;
  dom.errorMessage.textContent = message;
}

function clearError() {
  dom.errorMessage.hidden = true;
  dom.errorMessage.textContent = '';
}

function showToast(message, type = 'info') {
  if (!dom.toastRegion) return;
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  dom.toastRegion.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}
