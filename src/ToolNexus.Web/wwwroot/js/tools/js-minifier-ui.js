import { JS_MINIFIER_CONFIG, COMPRESSION_MODES } from './js-minifier-config.js';
import { byteSize, computeReduction, debounce, downloadTextFile, escapeHtml, formatBytes } from './js-minifier-utils.js';

const state = {
  autoMinify: false,
  preserveLicenseComments: true,
  compressionMode: COMPRESSION_MODES.basic,
  isProcessing: false,
  lastOutput: ''
};

function dom() {
  const page = document.querySelector(JS_MINIFIER_CONFIG.selectors.page);
  if (!page) return null;

  return {
    page,
    actionSelect: document.getElementById(JS_MINIFIER_CONFIG.ids.actionSelect),
    heading: document.getElementById(JS_MINIFIER_CONFIG.ids.heading),
    runBtn: document.getElementById(JS_MINIFIER_CONFIG.ids.runBtn),
    copyBtn: document.getElementById(JS_MINIFIER_CONFIG.ids.copyBtn),
    downloadBtn: document.getElementById(JS_MINIFIER_CONFIG.ids.downloadBtn),
    shareBtn: document.getElementById(JS_MINIFIER_CONFIG.ids.shareBtn),
    shortcutHint: document.getElementById(JS_MINIFIER_CONFIG.ids.shortcutHint),
    inputEditor: document.getElementById(JS_MINIFIER_CONFIG.ids.inputEditor),
    outputEditor: document.getElementById(JS_MINIFIER_CONFIG.ids.outputEditor),
    outputStatus: document.getElementById(JS_MINIFIER_CONFIG.ids.outputStatus),
    errorMessage: document.getElementById(JS_MINIFIER_CONFIG.ids.errorMessage),
    outputEmptyState: document.getElementById(JS_MINIFIER_CONFIG.ids.outputEmptyState),
    outputField: document.getElementById(JS_MINIFIER_CONFIG.ids.outputField)
  };
}

function readInput() {
  const model = window.monaco?.editor?.getModels?.()[0];
  return model ? model.getValue() : (document.getElementById(JS_MINIFIER_CONFIG.ids.inputEditor)?.value ?? '');
}

function readOutput() {
  const model = window.monaco?.editor?.getModels?.()[1];
  return model ? model.getValue() : (document.getElementById(JS_MINIFIER_CONFIG.ids.outputEditor)?.value ?? '');
}

function clearEditors() {
  const models = window.monaco?.editor?.getModels?.() ?? [];
  if (models[0]) models[0].setValue('');
  if (models[1]) models[1].setValue('');

  const input = document.getElementById(JS_MINIFIER_CONFIG.ids.inputEditor);
  const output = document.getElementById(JS_MINIFIER_CONFIG.ids.outputEditor);
  if (input) input.value = '';
  if (output) output.value = '';
}

export function ensureUi() {
  const refs = dom();
  if (!refs || refs.page.dataset.jsMinifierEnhanced === 'true') return;

  refs.page.dataset.jsMinifierEnhanced = 'true';

  if (refs.actionSelect) refs.actionSelect.value = refs.actionSelect.options[0]?.value ?? '';
  if (refs.heading) refs.heading.textContent = 'Minified JavaScript Output';
  if (refs.shortcutHint) refs.shortcutHint.textContent = 'Shortcuts: Ctrl/Cmd + Enter to minify, Ctrl/Cmd + L to clear input';
  refs.runBtn?.querySelector('.tool-btn__label')?.replaceChildren(document.createTextNode('Minify'));
  if (refs.copyBtn) refs.copyBtn.textContent = 'Copy Output';
  if (refs.downloadBtn) refs.downloadBtn.textContent = 'Download .min.js';
  refs.shareBtn?.setAttribute('hidden', 'hidden');

  const badge = document.createElement('p');
  badge.className = JS_MINIFIER_CONFIG.classes.badge;
  badge.textContent = 'Client-side processing only • input is never executed';

  refs.page.querySelector('.tool-page__heading > div')?.append(badge);

  const toolbar = refs.runBtn?.parentElement;
  if (toolbar) {
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'tool-btn tool-btn--outline';
    clearBtn.id = 'jsMinifierClearBtn';
    clearBtn.textContent = 'Clear Input';
    clearBtn.addEventListener('click', () => {
      clearEditors();
      updateMetrics('', '');
      updateStatus('Cleared', 'info');
      setButtonsEnabled();
    });

    toolbar.append(clearBtn);

    const options = document.createElement('div');
    options.className = JS_MINIFIER_CONFIG.classes.options;
    options.innerHTML = `
      <label><input id="jsAutoMinifyToggle" type="checkbox" /> Auto minify</label>
      <label><input id="jsPreserveLicenseToggle" type="checkbox" checked /> Preserve /*! ... */ comments</label>
      <label>Compression
        <select id="jsCompressionMode">
          <option value="${COMPRESSION_MODES.basic}">Basic</option>
          <option value="${COMPRESSION_MODES.aggressive}">Aggressive</option>
        </select>
      </label>
    `;

    toolbar.after(options);
  }

  if (refs.outputField?.parentElement) {
    const processing = document.createElement('p');
    processing.id = 'jsMinifierProcessing';
    processing.className = JS_MINIFIER_CONFIG.classes.processing;
    processing.hidden = true;

    const metrics = document.createElement('div');
    metrics.id = 'jsMinifierMetrics';
    metrics.className = JS_MINIFIER_CONFIG.classes.metrics;
    metrics.innerHTML = '<span>Original: 0 B</span><span>Minified: 0 B</span><span>Reduction: 0.0%</span>';

    refs.outputField.parentElement.prepend(metrics);
    refs.outputField.parentElement.prepend(processing);
  }

  bindUiEvents();
  setEditorLanguage();
  setButtonsEnabled();
}

function setEditorLanguage() {
  const monaco = window.monaco;
  if (!monaco?.editor?.getModels || !monaco.editor.setModelLanguage) return;

  const models = monaco.editor.getModels();
  if (models[0]) monaco.editor.setModelLanguage(models[0], 'javascript');
  if (models[1]) monaco.editor.setModelLanguage(models[1], 'javascript');
}

const triggerAutoRun = debounce(() => {
  if (!state.autoMinify || state.isProcessing || !readInput().trim()) return;
  if (typeof window.ToolNexusRun === 'function') window.ToolNexusRun();
}, JS_MINIFIER_CONFIG.debounceMs);

function bindUiEvents() {
  document.getElementById('jsAutoMinifyToggle')?.addEventListener('change', (event) => {
    state.autoMinify = event.target.checked;
  });

  document.getElementById('jsPreserveLicenseToggle')?.addEventListener('change', (event) => {
    state.preserveLicenseComments = event.target.checked;
  });

  document.getElementById('jsCompressionMode')?.addEventListener('change', (event) => {
    state.compressionMode = event.target.value;
  });

  const downloadBtn = document.getElementById(JS_MINIFIER_CONFIG.ids.downloadBtn);
  if (downloadBtn) {
    const replacement = downloadBtn.cloneNode(true);
    downloadBtn.replaceWith(replacement);
    replacement.addEventListener('click', () => {
      const output = readOutput();
      if (!output.trim()) return;
      downloadTextFile(output, JS_MINIFIER_CONFIG.fileName, 'text/javascript;charset=utf-8');
    });
  }

  const copyBtn = document.getElementById(JS_MINIFIER_CONFIG.ids.copyBtn);
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      copyBtn.textContent = 'Copied';
      window.setTimeout(() => {
        copyBtn.textContent = 'Copy Output';
      }, 1000);
    });
  }

  const inputTarget = document.getElementById('inputEditorSurface') ?? document.getElementById(JS_MINIFIER_CONFIG.ids.inputEditor);
  inputTarget?.addEventListener('keyup', () => {
    setButtonsEnabled();
    triggerAutoRun();
  });

  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;

    if (event.key.toLowerCase() === 'l') {
      event.preventDefault();
      document.getElementById('jsMinifierClearBtn')?.click();
    }
  });
}

export function setButtonsEnabled() {
  const hasInput = readInput().trim().length > 0;
  const runBtn = document.getElementById(JS_MINIFIER_CONFIG.ids.runBtn);
  const copyBtn = document.getElementById(JS_MINIFIER_CONFIG.ids.copyBtn);
  const downloadBtn = document.getElementById(JS_MINIFIER_CONFIG.ids.downloadBtn);

  if (runBtn) runBtn.disabled = !hasInput;
  if (copyBtn) copyBtn.disabled = !state.lastOutput.trim();
  if (downloadBtn) downloadBtn.disabled = !state.lastOutput.trim();
}

export function updateMetrics(original, minified) {
  const region = document.getElementById('jsMinifierMetrics');
  if (!region) return;

  const originalBytes = byteSize(original);
  const minifiedBytes = byteSize(minified);
  const reduction = computeReduction(originalBytes, minifiedBytes);

  region.innerHTML = `
    <span>Original: ${formatBytes(originalBytes)}</span>
    <span>Minified: ${formatBytes(minifiedBytes)}</span>
    <span>Reduction: ${reduction.toFixed(1)}%</span>
  `;
}

export function renderError(error) {
  const refs = dom();
  if (!refs?.errorMessage) return;

  refs.errorMessage.hidden = false;
  refs.errorMessage.innerHTML = `<strong>${escapeHtml(error.title)}</strong><p>${escapeHtml(error.message)}</p>`;
}

export function clearError() {
  const refs = dom();
  if (!refs?.errorMessage) return;

  refs.errorMessage.hidden = true;
  refs.errorMessage.innerHTML = '';
}

export function updateStatus(message, mode = 'info') {
  const indicator = document.getElementById(JS_MINIFIER_CONFIG.ids.outputStatus);
  if (!indicator) return;

  indicator.textContent = message;
  indicator.classList.remove('result-indicator--idle', 'result-indicator--success', 'result-indicator--failure');

  if (mode === 'success') indicator.classList.add('result-indicator--success');
  else if (mode === 'error') indicator.classList.add('result-indicator--failure');
  else indicator.classList.add('result-indicator--idle');
}

export function setProcessingState(isProcessing, bytes = 0) {
  state.isProcessing = isProcessing;
  const processing = document.getElementById('jsMinifierProcessing');
  if (processing) {
    processing.hidden = !isProcessing;
    processing.textContent = isProcessing
      ? `Processing ${formatBytes(bytes)}…`
      : '';
  }
}

export function getUiOptions() {
  return {
    preserveLicenseComments: state.preserveLicenseComments,
    compressionMode: state.compressionMode
  };
}

export function setLatestOutput(output) {
  state.lastOutput = output ?? '';
  setButtonsEnabled();
}

export function shouldYieldForLargeInput(input) {
  return byteSize(input) >= JS_MINIFIER_CONFIG.processingUiYieldBytes;
}

export function renderLargeFileHint(input) {
  const bytes = byteSize(input);
  if (bytes < JS_MINIFIER_CONFIG.largeFileThresholdBytes) return;
  updateStatus(`Large input detected (${formatBytes(bytes)}). Optimized processing enabled.`, 'info');
}
