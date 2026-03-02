import { loadMonaco } from '/js/runtime/monaco-loader.js';
import { JSON_FORMATTER_CONFIG } from './constants.js';

export class JsonFormatterUi {
  constructor() {
    this.dom = this.resolveDom();
    this.monaco = null;
    this.inputModel = null;
    this.outputModel = null;
    this.inputEditor = null;
    this.outputEditor = null;
  }

  resolveDom() {
    const ids = [
      'formatBtn', 'minifyBtn', 'validateBtn', 'clearBtn', 'copyBtn', 'downloadBtn',
      'indentSizeSelect', 'sortKeysToggle', 'autoFormatToggle', 'wrapToggle',
      'jsonEditor', 'outputEditor', 'resultStatus', 'validationState', 'perfTime',
      'payloadStats', 'outputStats', 'processingIndicator', 'errorBox', 'errorTitle',
      'errorDetail', 'errorLocation', 'toastRegion'
    ];

    return ids.reduce((acc, id) => {
      acc[id] = document.getElementById(id);
      return acc;
    }, {});
  }

  async initEditors() {
    this.monaco = await loadMonaco();

    if (!this.monaco?.editor) {
      console.warn('[json-formatter] Monaco unavailable → fallback editor');
      return false;
    }

    this.inputModel = this.monaco.editor.createModel(window.ToolNexusConfig?.jsonExampleInput ?? '', 'json');
    this.outputModel = this.monaco.editor.createModel('', 'json');

    const shared = {
      theme: JSON_FORMATTER_CONFIG.monacoTheme,
      minimap: { enabled: false },
      automaticLayout: true,
      fontSize: 14,
      fontFamily: 'var(--font-family-mono)',
      lineNumbers: 'on',
      wordWrap: 'off'
    };

    this.inputEditor = this.monaco.editor.create(this.dom.jsonEditor, {
      ...shared,
      model: this.inputModel,
      readOnly: false,
      glyphMargin: true
    });

    this.outputEditor = this.monaco.editor.create(this.dom.outputEditor, {
      ...shared,
      model: this.outputModel,
      readOnly: true
    });

    return true;
  }

  setBusy(isBusy) {
    [
      this.dom.formatBtn,
      this.dom.minifyBtn,
      this.dom.validateBtn,
      this.dom.clearBtn,
      this.dom.copyBtn,
      this.dom.downloadBtn
    ].forEach((button) => {
      if (button) {
        button.disabled = isBusy;
      }
    });
  }

  setProcessingVisible(visible) {
    this.dom.processingIndicator.hidden = !visible;
  }

  showSuccess(message) {
    this.pushToast(message, 'success');
  }

  showError(error) {
    this.dom.errorTitle.textContent = error.title;
    this.dom.errorDetail.textContent = `${error.message} ${error.details}`.trim();

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
  }

  setValidationState(text) {
    this.dom.validationState.textContent = text;
  }

  setResultStatus(text) {
    this.dom.resultStatus.textContent = text;
  }

  setTiming(ms) {
    this.dom.perfTime.textContent = `${ms.toFixed(2)} ms`;
  }

  setInputStats(text) {
    this.dom.payloadStats.textContent = text;
  }

  setOutputStats(text) {
    this.dom.outputStats.textContent = text;
  }

  setModelMarkers(location, message) {
    const markers = location
      ? [{
        startLineNumber: location.line,
        endLineNumber: location.line,
        startColumn: location.column,
        endColumn: location.column + 1,
        message,
        severity: this.monaco.MarkerSeverity.Error
      }]
      : [];

    this.monaco.editor.setModelMarkers(this.inputModel, JSON_FORMATTER_CONFIG.markerOwner, markers);
  }

  updateWordWrap() {
    const wordWrap = this.dom.wrapToggle.checked ? 'on' : 'off';
    this.inputEditor.updateOptions({ wordWrap });
    this.outputEditor.updateOptions({ wordWrap });
  }

  pushToast(message, variant) {
    while (this.dom.toastRegion.children.length >= JSON_FORMATTER_CONFIG.maxToasts) {
      this.dom.toastRegion.firstChild?.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${variant}`;
    toast.textContent = message;
    this.dom.toastRegion.appendChild(toast);

    window.setTimeout(() => toast.remove(), JSON_FORMATTER_CONFIG.toastDurationMs);
  }
}
