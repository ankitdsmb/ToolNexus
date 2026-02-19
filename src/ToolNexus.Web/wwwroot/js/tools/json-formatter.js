import { ACTIONS, JSON_FORMATTER_CONFIG as CONFIG } from './json-formatter-constants.js';
import { applyAutoFix, escapeJsonText, toOutputByAction, unescapeJsonText } from './json-formatter-transformers.js';
import { computeByteSize, formatBytes, parseJsonWithTimeout, toUserFacingValidationError } from './json-formatter-validation.js';

class JsonFormatterApp {
  constructor() {
    this.dom = this.resolveDom();
    this.monaco = null;
    this.inputEditor = null;
    this.outputEditor = null;
    this.diffEditor = null;
    this.inputModel = null;
    this.outputModel = null;

    this.state = {
      isBusy: false,
      debounceHandle: null,
      latestPerformanceMs: 0,
      lastActionStatus: 'No output yet.'
    };
  }

  resolveDom() {
    const ids = [
      'formatBtn', 'minifyBtn', 'validateBtn', 'autofixBtn', 'sortBtn',
      'copyBtn', 'downloadBtn', 'clearBtn', 'escapeBtn', 'unescapeBtn',
      'wrapToggle', 'diffToggle', 'jsonEditor', 'outputEditor', 'diffEditor',
      'perfTime', 'validationState', 'payloadStats', 'resultStatus',
      'errorBox', 'errorTitle', 'errorDetail', 'errorLocation', 'largeFileWarning',
      'dropZone', 'toastRegion'
    ];

    return ids.reduce((elements, id) => {
      elements[id] = document.getElementById(id);
      return elements;
    }, {});
  }

  async init() {
    if (!this.dom.jsonEditor || !window.require) {
      throw new Error('JSON formatter cannot start: Monaco loader is unavailable.');
    }

    await this.loadMonaco();
    this.bindEvents();
    this.updatePayloadState('');
    this.syncUiState();
  }

  async loadMonaco() {
    window.require.config({
      paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs' }
    });

    await new Promise((resolve) => {
      window.require(['vs/editor/editor.main'], resolve);
    });

    this.monaco = window.monaco;
    this.createEditors();
  }

  createEditors() {
    const seedInput = window.ToolNexusConfig?.jsonExampleInput ?? '{\n  "hello": "world"\n}';

    this.inputModel = this.monaco.editor.createModel(seedInput, 'json');
    this.outputModel = this.monaco.editor.createModel('', 'json');

    const sharedEditorOptions = {
      theme: 'vs-dark',
      minimap: { enabled: false },
      automaticLayout: true,
      fontSize: 14,
      lineNumbers: 'on'
    };

    this.inputEditor = this.monaco.editor.create(this.dom.jsonEditor, {
      ...sharedEditorOptions,
      model: this.inputModel,
      readOnly: false,
      glyphMargin: true,
      bracketPairColorization: { enabled: true },
      formatOnPaste: true,
      formatOnType: true,
      wordWrap: 'off'
    });

    this.outputEditor = this.monaco.editor.create(this.dom.outputEditor, {
      ...sharedEditorOptions,
      model: this.outputModel,
      readOnly: true,
      wordWrap: 'off'
    });

    this.diffEditor = this.monaco.editor.createDiffEditor(this.dom.diffEditor, {
      ...sharedEditorOptions,
      readOnly: true,
      renderSideBySide: true
    });

    this.diffEditor.setModel({
      original: this.inputModel,
      modified: this.outputModel
    });

    this.inputModel.onDidChangeContent(() => this.handleInputChange());
    this.outputModel.onDidChangeContent(() => this.syncUiState());

    this.perform(ACTIONS.format, { silentSuccess: true }).catch(() => {});
  }

  bindEvents() {
    this.dom.formatBtn?.addEventListener('click', () => this.perform(ACTIONS.format));
    this.dom.minifyBtn?.addEventListener('click', () => this.perform(ACTIONS.minify));
    this.dom.validateBtn?.addEventListener('click', () => this.perform(ACTIONS.validate));
    this.dom.autofixBtn?.addEventListener('click', () => this.perform(ACTIONS.autofix));
    this.dom.sortBtn?.addEventListener('click', () => this.perform(ACTIONS.sort));
    this.dom.escapeBtn?.addEventListener('click', () => this.perform(ACTIONS.escape));
    this.dom.unescapeBtn?.addEventListener('click', () => this.perform(ACTIONS.unescape));
    this.dom.copyBtn?.addEventListener('click', () => this.copyOutput());
    this.dom.downloadBtn?.addEventListener('click', () => this.downloadOutput());
    this.dom.clearBtn?.addEventListener('click', () => this.clearAll());

    this.dom.wrapToggle?.addEventListener('change', () => {
      const wordWrap = this.dom.wrapToggle.checked ? 'on' : 'off';
      this.inputEditor.updateOptions({ wordWrap });
      this.outputEditor.updateOptions({ wordWrap });
    });

    this.dom.diffToggle?.addEventListener('change', () => {
      const showDiff = this.dom.diffToggle.checked;
      this.dom.outputEditor.hidden = showDiff;
      this.dom.diffEditor.hidden = !showDiff;
      this.syncUiState();
    });

    this.registerDragAndDrop();

    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        this.perform(ACTIONS.format);
      }
    });
  }

  registerDragAndDrop() {
    ['dragenter', 'dragover'].forEach((eventName) => {
      this.dom.dropZone?.addEventListener(eventName, (event) => {
        event.preventDefault();
        this.dom.dropZone.classList.add('is-dragover');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      this.dom.dropZone?.addEventListener(eventName, (event) => {
        event.preventDefault();
        this.dom.dropZone.classList.remove('is-dragover');
      });
    });

    this.dom.dropZone?.addEventListener('drop', async (event) => {
      const file = event.dataTransfer?.files?.[0];
      if (!file) {
        return;
      }

      if (file.size > CONFIG.maxImportBytes) {
        this.showToast('File is too large. Maximum supported size is 10MB.', 'error');
        return;
      }

      try {
        this.inputModel.setValue(await file.text());
        this.showToast(`Loaded ${file.name}`, 'success');
      } catch {
        this.showError({ title: 'Unable to load file', message: 'The dropped file could not be read. Try another file.' });
      }
    });
  }

  handleInputChange() {
    clearTimeout(this.state.debounceHandle);
    this.state.debounceHandle = setTimeout(() => {
      const raw = this.inputModel.getValue();
      this.updatePayloadState(raw);
      this.validateOnly(raw);
      this.syncUiState();
    }, CONFIG.debounceMs);
  }

  async perform(action, options = {}) {
    if (this.state.isBusy) {
      return;
    }

    const startedAt = performance.now();
    this.state.isBusy = true;
    this.setActionButtonsDisabled(true);
    this.clearError();

    try {
      const raw = this.inputModel.getValue();

      if (action === ACTIONS.autofix) {
        this.inputModel.setValue(applyAutoFix(raw));
        this.showToast('Common JSON issues were fixed where possible.', 'success');
        this.setResultStatus('Auto-fix applied. Review and run Format.');
        return;
      }

      if (action === ACTIONS.escape) {
        this.outputModel.setValue(escapeJsonText(raw));
        this.setResultStatus('Escaped text generated.');
        this.showToast('Escaped output generated.', 'success');
        return;
      }

      if (action === ACTIONS.unescape) {
        this.outputModel.setValue(unescapeJsonText(raw));
        this.setResultStatus('Unescaped text generated.');
        this.showToast('Unescaped output generated.', 'success');
        return;
      }

      const parsed = await parseJsonWithTimeout(raw, CONFIG.parseTimeoutMs);

      if (action === ACTIONS.validate) {
        this.markValid();
        this.setResultStatus('Validation passed.');
        if (!options.silentSuccess) {
          this.showToast('JSON is valid.', 'success');
        }
        return;
      }

      const output = toOutputByAction(action, parsed);
      this.outputModel.setValue(output);
      this.outputEditor.revealLine(1);
      this.markValid();
      this.setResultStatus(action === ACTIONS.minify ? 'Minified output ready.' : 'Formatted output ready.');

      if (!options.silentSuccess) {
        this.showToast('Transformation completed.', 'success');
      }
    } catch (error) {
      const uiError = toUserFacingValidationError(this.inputModel.getValue(), error);
      this.markInvalid(uiError);
    } finally {
      const elapsedMs = performance.now() - startedAt;
      this.state.latestPerformanceMs = elapsedMs;
      this.state.isBusy = false;
      this.setActionButtonsDisabled(false);
      this.dom.perfTime.textContent = `${elapsedMs.toFixed(2)} ms`;
      if (elapsedMs > CONFIG.slowOperationMs) {
        console.debug(`json-formatter slow operation: ${elapsedMs.toFixed(2)}ms`);
      }
      this.syncUiState();
    }
  }

  validateOnly(raw) {
    try {
      JSON.parse(raw);
      this.markValid();
      return true;
    } catch (error) {
      const uiError = toUserFacingValidationError(raw, error);
      this.markInvalid(uiError, { keepDetailsHidden: true });
      return false;
    }
  }

  markValid() {
    this.dom.validationState.textContent = 'Valid JSON';
    this.monaco.editor.setModelMarkers(this.inputModel, CONFIG.markerOwner, []);
    this.clearError();
  }

  markInvalid(uiError, options = {}) {
    this.dom.validationState.textContent = 'Invalid JSON';

    const line = uiError.location?.line ?? 1;
    const column = uiError.location?.column ?? 1;

    this.monaco.editor.setModelMarkers(this.inputModel, CONFIG.markerOwner, [{
      startLineNumber: line,
      endLineNumber: line,
      startColumn: column,
      endColumn: column + 1,
      message: uiError.message,
      severity: this.monaco.MarkerSeverity.Error
    }]);

    if (!options.keepDetailsHidden) {
      this.showError(uiError);
      this.setResultStatus('Validation error.');
    }
  }

  updatePayloadState(raw) {
    const bytes = computeByteSize(raw);
    this.dom.payloadStats.textContent = formatBytes(bytes);
    this.dom.largeFileWarning.hidden = bytes < CONFIG.largePayloadBytes;
  }

  setActionButtonsDisabled(disabled) {
    [
      this.dom.formatBtn,
      this.dom.minifyBtn,
      this.dom.validateBtn,
      this.dom.autofixBtn,
      this.dom.sortBtn,
      this.dom.escapeBtn,
      this.dom.unescapeBtn,
      this.dom.copyBtn,
      this.dom.downloadBtn,
      this.dom.clearBtn
    ].forEach((button) => {
      if (!button) {
        return;
      }
      button.disabled = disabled;
      button.setAttribute('aria-disabled', String(disabled));
    });
  }

  setResultStatus(value) {
    this.state.lastActionStatus = value;
    this.dom.resultStatus.textContent = value;
  }

  syncUiState() {
    const hasOutput = this.outputModel && this.outputModel.getValue().trim().length > 0;
    if (this.dom.copyBtn) {
      this.dom.copyBtn.disabled = !hasOutput || this.state.isBusy;
    }
    if (this.dom.downloadBtn) {
      this.dom.downloadBtn.disabled = !hasOutput || this.state.isBusy;
    }
  }

  showError(error) {
    this.dom.errorTitle.textContent = error.title;
    this.dom.errorDetail.textContent = error.message;

    if (error.location) {
      this.dom.errorLocation.hidden = false;
      this.dom.errorLocation.textContent = `Line ${error.location.line}, Column ${error.location.column}`;
    } else {
      this.dom.errorLocation.hidden = true;
      this.dom.errorLocation.textContent = '';
    }

    this.dom.errorBox.hidden = false;
  }

  clearError() {
    this.dom.errorBox.hidden = true;
    this.dom.errorTitle.textContent = '';
    this.dom.errorDetail.textContent = '';
    this.dom.errorLocation.textContent = '';
    this.dom.errorLocation.hidden = true;
  }

  async copyOutput() {
    const output = this.outputModel.getValue();
    if (!output) {
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      this.showToast('Copied output to clipboard.', 'success');
    } catch {
      this.showToast('Clipboard copy is not available in this browser context.', 'error');
    }
  }

  downloadOutput() {
    const output = this.outputModel.getValue();
    if (!output) {
      return;
    }

    const blob = new Blob([output], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${CONFIG.outputFilenamePrefix}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.showToast('Downloaded output as JSON file.', 'success');
  }

  clearAll() {
    this.inputModel.setValue('');
    this.outputModel.setValue('');
    this.setResultStatus('Editors cleared.');
    this.markValid();
    this.updatePayloadState('');
    this.syncUiState();
  }

  showToast(message, variant = 'info') {
    if (!this.dom.toastRegion) {
      return;
    }

    while (this.dom.toastRegion.children.length >= CONFIG.maxToasts) {
      this.dom.toastRegion.firstChild?.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${variant}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');

    this.dom.toastRegion.appendChild(toast);
    window.setTimeout(() => toast.remove(), CONFIG.statusResetMs);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const app = new JsonFormatterApp();
  await app.init();
  window.jsonFormatter = app;
});
