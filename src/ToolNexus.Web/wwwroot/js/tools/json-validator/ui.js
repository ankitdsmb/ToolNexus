import { AUTO_VALIDATE_DEBOUNCE_MS, LARGE_PAYLOAD_CHAR_THRESHOLD, RESULT_STATE_CLASS } from './constants.js';
import { validateJsonDocument, analyzeStructure, formatJson } from './engine.js';
import { normalizeInput } from './normalization.js';
import { createState } from './state.js';
import { formatBytes, lineCount } from './utils.js';
import { validateWithSchema } from './schema.js';
import { buildTreeView } from './tree.js';
import { getKeyboardEventManager } from '../keyboard-event-manager.js';

const APP_INSTANCES = new WeakMap();

class JsonValidatorApp {
  constructor(root) {
    this.root = root;
    this.state = createState();
    this.dom = selectDom(root);
    this.abortController = new AbortController();
    this.disposeKeyboardHandler = null;

    bindEvents(this.dom, this.state, {
      signal: this.abortController.signal,
      root,
      registerKeyboardHandler: (config) => getKeyboardEventManager().register(config),
      setKeyboardDisposer: (dispose) => {
        this.disposeKeyboardHandler = dispose;
      }
    });
    refreshMetrics(this.dom, '');
    updateActionAvailability(this.dom);
  }

  destroy() {
    window.clearTimeout(this.state.autoValidateTimer);
    this.disposeKeyboardHandler?.();
    this.disposeKeyboardHandler = null;
    this.abortController.abort();
    APP_INSTANCES.delete(this.root);
  }
}

export function createJsonValidatorApp(root) {
  if (!root) {
    return null;
  }

  if (APP_INSTANCES.has(root)) {
    return APP_INSTANCES.get(root);
  }

  const app = new JsonValidatorApp(root);
  APP_INSTANCES.set(root, app);
  return app;
}

function selectDom(root) {
  return {
    input: root.querySelector('#jsonInput'),
    schemaInput: root.querySelector('#schemaInput'),
    schemaLabel: root.querySelector('#schemaLabel'),
    validateBtn: root.querySelector('#validateBtn'),
    formatBtn: root.querySelector('#formatBtn'),
    copyBtn: root.querySelector('#copyBtn'),
    downloadBtn: root.querySelector('#downloadBtn'),
    clearBtn: root.querySelector('#clearBtn'),
    autoValidateToggle: root.querySelector('#autoValidateToggle'),
    strictModeToggle: root.querySelector('#strictModeToggle'),
    schemaModeToggle: root.querySelector('#schemaModeToggle'),
    treeViewToggle: root.querySelector('#treeViewToggle'),
    processingIndicator: root.querySelector('#processingIndicator'),
    resultBadge: root.querySelector('#resultBadge'),
    successBox: root.querySelector('#successBox'),
    successDetail: root.querySelector('#successDetail'),
    errorBox: root.querySelector('#errorBox'),
    errorTitle: root.querySelector('#errorTitle'),
    errorDescription: root.querySelector('#errorDescription'),
    errorLocation: root.querySelector('#errorLocation'),
    metricTopLevel: root.querySelector('#metricTopLevel'),
    metricKeyCount: root.querySelector('#metricKeyCount'),
    metricArrayLength: root.querySelector('#metricArrayLength'),
    metricDepth: root.querySelector('#metricDepth'),
    metricCharacters: root.querySelector('#metricCharacters'),
    metricLines: root.querySelector('#metricLines'),
    metricPayloadSize: root.querySelector('#metricPayloadSize'),
    treeViewPanel: root.querySelector('#treeViewPanel'),
    treeViewContent: root.querySelector('#treeViewContent')
  };
}

function bindEvents(dom, state, runtime) {
  const listenerOptions = { signal: runtime.signal };

  dom.validateBtn?.addEventListener('click', () => runValidation(dom, state), listenerOptions);
  dom.formatBtn?.addEventListener('click', () => handleFormat(dom, state), listenerOptions);
  dom.copyBtn?.addEventListener('click', () => navigator.clipboard.writeText(dom.input.value ?? ''), listenerOptions);
  dom.downloadBtn?.addEventListener('click', () => downloadValidatedJson(state.lastValidJson), listenerOptions);
  dom.clearBtn?.addEventListener('click', () => clearAll(dom, state), listenerOptions);

  dom.autoValidateToggle?.addEventListener('change', () => {
    state.autoValidateEnabled = dom.autoValidateToggle.checked;
  }, listenerOptions);

  dom.strictModeToggle?.addEventListener('change', () => {
    state.strictModeEnabled = dom.strictModeToggle.checked;
  }, listenerOptions);

  dom.schemaModeToggle?.addEventListener('change', () => {
    state.schemaModeEnabled = dom.schemaModeToggle.checked;
    dom.schemaInput.hidden = !state.schemaModeEnabled;
    dom.schemaLabel.hidden = !state.schemaModeEnabled;
  }, listenerOptions);

  dom.treeViewToggle?.addEventListener('change', () => {
    state.treeViewEnabled = dom.treeViewToggle.checked;
    if (!state.treeViewEnabled) {
      dom.treeViewPanel.hidden = true;
    }
  }, listenerOptions);

  dom.input?.addEventListener('input', () => {
    const rawInput = dom.input.value ?? '';
    refreshMetrics(dom, rawInput);
    updateActionAvailability(dom);

    if (!state.autoValidateEnabled) {
      return;
    }

    window.clearTimeout(state.autoValidateTimer);
    state.autoValidateTimer = window.setTimeout(() => runValidation(dom, state), AUTO_VALIDATE_DEBOUNCE_MS);
  }, listenerOptions);

  dom.schemaInput?.addEventListener('input', () => {
    if (state.autoValidateEnabled && state.schemaModeEnabled) {
      window.clearTimeout(state.autoValidateTimer);
      state.autoValidateTimer = window.setTimeout(() => runValidation(dom, state), AUTO_VALIDATE_DEBOUNCE_MS);
    }
  }, listenerOptions);

  const disposeKeyboardHandler = runtime.registerKeyboardHandler({
    root: runtime.root,
    onKeydown: (event) => {
    if (!(event.ctrlKey || event.metaKey)) {
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      runValidation(dom, state);
      return;
    }

    if (event.key.toLowerCase() === 'l') {
      event.preventDefault();
      clearAll(dom, state);
    }
    }
  });

  runtime.setKeyboardDisposer(disposeKeyboardHandler);
}

async function runValidation(dom, state) {
  const normalizedInput = normalizeInput(dom.input.value ?? '');
  if (!normalizedInput.trim()) {
    setIdleState(dom);
    state.lastValidJson = '';
    return;
  }

  const isLargePayload = normalizedInput.length >= LARGE_PAYLOAD_CHAR_THRESHOLD;
  dom.processingIndicator.hidden = !isLargePayload;

  if (isLargePayload) {
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
  }

  const validationResult = validateJsonDocument(normalizedInput, { strictMode: state.strictModeEnabled });
  dom.processingIndicator.hidden = true;

  if (!validationResult.ok) {
    renderError(dom, validationResult.diagnostics);
    highlightApproximatePosition(dom.input, validationResult.diagnostics.position);
    state.lastValidJson = '';
    return;
  }

  if (state.schemaModeEnabled && (dom.schemaInput.value ?? '').trim()) {
    const schemaResult = validateJsonDocument(normalizeInput(dom.schemaInput.value), { strictMode: false });
    if (!schemaResult.ok) {
      renderError(dom, {
        title: 'Invalid schema JSON',
        explanation: schemaResult.diagnostics.explanation,
        line: schemaResult.diagnostics.line,
        column: schemaResult.diagnostics.column,
        position: 0
      });
      return;
    }

    const schemaIssues = validateWithSchema(validationResult.value, schemaResult.value);
    if (schemaIssues.length > 0) {
      renderError(dom, {
        title: 'Schema validation failed',
        explanation: schemaIssues[0],
        line: 1,
        column: 1,
        position: 0
      });
      return;
    }
  }

  const stats = analyzeStructure(validationResult.value, normalizedInput);
  renderSuccess(dom, stats);
  if (state.treeViewEnabled) {
    dom.treeViewPanel.hidden = false;
    dom.treeViewContent.innerHTML = buildTreeView(validationResult.value);
  }

  state.lastValidJson = normalizedInput;
}

function renderSuccess(dom, stats) {
  setResultBadge(dom.resultBadge, 'success', 'Valid JSON');
  dom.successDetail.textContent = `Valid JSON near ${stats.lineCount} lines with depth ${stats.depth}.`;
  dom.successBox.hidden = false;
  dom.errorBox.hidden = true;

  dom.metricTopLevel.textContent = stats.topLevelType;
  dom.metricKeyCount.textContent = String(stats.keyCount);
  dom.metricArrayLength.textContent = String(stats.arrayLength);
  dom.metricDepth.textContent = String(stats.depth);
  dom.metricCharacters.textContent = String(stats.characterCount);
  dom.metricLines.textContent = String(stats.lineCount);
}

function renderError(dom, diagnostics) {
  setResultBadge(dom.resultBadge, 'error', 'Invalid JSON');
  dom.errorTitle.textContent = diagnostics.title;
  dom.errorDescription.textContent = diagnostics.explanation;
  dom.errorLocation.textContent = `Invalid JSON near line ${diagnostics.line}, column ${diagnostics.column}.`;
  dom.errorBox.hidden = false;
  dom.successBox.hidden = true;
  dom.treeViewPanel.hidden = true;
}

function setIdleState(dom) {
  setResultBadge(dom.resultBadge, 'idle', 'Awaiting validation');
  dom.successBox.hidden = true;
  dom.errorBox.hidden = true;
  dom.treeViewPanel.hidden = true;
}

function setResultBadge(resultBadge, state, text) {
  resultBadge.classList.remove(RESULT_STATE_CLASS.idle, RESULT_STATE_CLASS.success, RESULT_STATE_CLASS.error);
  resultBadge.classList.add(RESULT_STATE_CLASS[state]);
  resultBadge.textContent = text;
}

function refreshMetrics(dom, inputValue) {
  dom.metricCharacters.textContent = String(inputValue.length);
  dom.metricLines.textContent = String(lineCount(inputValue));
  dom.metricPayloadSize.textContent = formatBytes(new Blob([inputValue]).size);
}

function updateActionAvailability(dom) {
  const hasInput = Boolean((dom.input.value ?? '').trim());
  dom.validateBtn.disabled = !hasInput;
  dom.formatBtn.disabled = !hasInput;
  dom.copyBtn.disabled = !hasInput;
}

function clearAll(dom, state) {
  dom.input.value = '';
  dom.schemaInput.value = '';
  state.lastValidJson = '';
  refreshMetrics(dom, '');
  setIdleState(dom);
  updateActionAvailability(dom);
}

function highlightApproximatePosition(input, position) {
  const offset = Math.max(0, Math.min(position, input.value.length));
  input.focus();
  input.setSelectionRange(offset, offset + 1);
}

function handleFormat(dom, state) {
  const normalizedInput = normalizeInput(dom.input.value ?? '');
  const validationResult = validateJsonDocument(normalizedInput, { strictMode: state.strictModeEnabled });

  if (!validationResult.ok) {
    renderError(dom, validationResult.diagnostics);
    return;
  }

  dom.input.value = formatJson(validationResult.value);
  refreshMetrics(dom, dom.input.value);
  runValidation(dom, state);
}

function downloadValidatedJson(value) {
  if (!value) {
    return;
  }

  const blob = new Blob([value], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `validated-json-${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
