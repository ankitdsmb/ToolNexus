import { FORMAT_MODE, JSON_FORMATTER_CONFIG } from './constants.js';
import { parseNormalizedJson } from './parser.js';
import { formatJson } from './formatter.js';
import { formatCountSummary, getContainerSizeLabel } from './utils.js';
import { JsonFormatterUi } from './ui.js';

class JsonFormatterApp {
  constructor() {
    this.ui = new JsonFormatterUi();
    this.autoFormatDebounce = null;
    this.isBusy = false;
  }

  async init() {
    await this.ui.initEditors();
    this.bindEvents();
    this.updateStats();
    this.runPipeline(FORMAT_MODE.PRETTY, { silent: true });
  }

  bindEvents() {
    this.ui.dom.formatBtn.addEventListener('click', () => this.runPipeline(FORMAT_MODE.PRETTY));
    this.ui.dom.minifyBtn.addEventListener('click', () => this.runPipeline(FORMAT_MODE.MINIFIED));
    this.ui.dom.validateBtn.addEventListener('click', () => this.runPipeline(FORMAT_MODE.VALIDATE));
    this.ui.dom.clearBtn.addEventListener('click', () => this.clearAll());
    this.ui.dom.copyBtn.addEventListener('click', () => this.copyOutput());
    this.ui.dom.downloadBtn.addEventListener('click', () => this.downloadOutput());
    this.ui.dom.wrapToggle.addEventListener('change', () => this.ui.updateWordWrap());

    this.ui.inputModel.onDidChangeContent(() => {
      this.updateStats();
      if (!this.ui.dom.autoFormatToggle.checked) {
        return;
      }

      clearTimeout(this.autoFormatDebounce);
      this.autoFormatDebounce = window.setTimeout(() => {
        this.runPipeline(FORMAT_MODE.PRETTY, { silent: true });
      }, JSON_FORMATTER_CONFIG.autoFormatDebounceMs);
    });

    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        this.runPipeline(FORMAT_MODE.PRETTY);
      }

      if (event.ctrlKey && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        this.clearAll();
      }
    });
  }

  runPipeline(mode, options = {}) {
    const started = performance.now();
    this.isBusy = true;
    this.ui.setBusy(true);
    this.ui.clearError();

    const rawInput = this.ui.inputModel.getValue();
    const isLargePayload = rawInput.length >= JSON_FORMATTER_CONFIG.slowPayloadChars;
    this.ui.setProcessingVisible(isLargePayload);

    const parsedResult = parseNormalizedJson(rawInput);

    if (!parsedResult.ok) {
      this.isBusy = false;
      this.ui.setBusy(false);
      this.ui.setProcessingVisible(false);
      this.ui.setValidationState(parsedResult.error.title === 'No input provided' ? 'Awaiting input' : 'Invalid JSON');
      this.ui.setModelMarkers(parsedResult.error.location, parsedResult.error.message);

      if (parsedResult.error.title !== 'No input provided') {
        this.ui.showError(parsedResult.error);
        this.ui.setResultStatus('Validation failed.');
      }

      this.ui.setTiming(performance.now() - started);
      this.updateButtonStates();
      return;
    }

    this.ui.setValidationState('Valid JSON');
    this.ui.setModelMarkers(null, '');

    if (mode === FORMAT_MODE.VALIDATE) {
      this.ui.outputModel.setValue('');
      this.ui.setResultStatus(`Valid JSON (${getContainerSizeLabel(parsedResult.parsed)}).`);
      if (!options.silent) {
        this.ui.showSuccess('Validation passed.');
      }
      this.finishExecution(started);
      return;
    }

    const indentSize = Number.parseInt(this.ui.dom.indentSizeSelect.value, 10) || 2;
    const sortKeys = this.ui.dom.sortKeysToggle.checked;

    const output = formatJson(parsedResult.parsed, { mode, indentSize, sortKeys });
    this.ui.outputModel.setValue(output);
    this.ui.outputEditor.revealLine(1);

    this.ui.setResultStatus(mode === FORMAT_MODE.MINIFIED ? 'Minified JSON ready.' : 'Formatted JSON ready.');
    if (!options.silent) {
      this.ui.showSuccess(mode === FORMAT_MODE.MINIFIED ? 'JSON minified.' : 'JSON formatted.');
    }

    this.finishExecution(started);
  }

  finishExecution(started) {
    this.isBusy = false;
    this.ui.setBusy(false);
    this.ui.setProcessingVisible(false);
    this.ui.setTiming(performance.now() - started);
    this.updateStats();
  }

  updateStats() {
    this.ui.setInputStats(formatCountSummary(this.ui.inputModel?.getValue() ?? ''));
    this.ui.setOutputStats(formatCountSummary(this.ui.outputModel?.getValue() ?? ''));
    this.updateButtonStates();
  }

  updateButtonStates() {
    const hasInput = (this.ui.inputModel?.getValue() ?? '').trim().length > 0;
    const hasOutput = (this.ui.outputModel?.getValue() ?? '').trim().length > 0;

    this.ui.dom.formatBtn.disabled = this.isBusy || !hasInput;
    this.ui.dom.minifyBtn.disabled = this.isBusy || !hasInput;
    this.ui.dom.validateBtn.disabled = this.isBusy || !hasInput;
    this.ui.dom.clearBtn.disabled = this.isBusy || !hasInput;
    this.ui.dom.copyBtn.disabled = this.isBusy || !hasOutput;
    this.ui.dom.downloadBtn.disabled = this.isBusy || !hasOutput;
  }

  clearAll() {
    this.ui.inputModel.setValue('');
    this.ui.outputModel.setValue('');
    this.ui.setModelMarkers(null, '');
    this.ui.clearError();
    this.ui.setValidationState('Awaiting input');
    this.ui.setResultStatus('Editors cleared.');
    this.updateStats();
    this.ui.showSuccess('Input and output cleared.');
  }

  async copyOutput() {
    const value = this.ui.outputModel.getValue();
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      this.ui.showSuccess('Output copied to clipboard.');
    } catch {
      this.ui.pushToast('Clipboard access is unavailable.', 'error');
    }
  }

  downloadOutput() {
    const value = this.ui.outputModel.getValue();
    if (!value) {
      return;
    }

    const blob = new Blob([value], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `toolnexus-json-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.ui.showSuccess('JSON file downloaded.');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const app = new JsonFormatterApp();
  await app.init();
  window.jsonFormatter = app;
});
