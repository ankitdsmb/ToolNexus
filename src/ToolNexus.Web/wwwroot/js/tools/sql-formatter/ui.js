import { countSummary } from './utils.js';

export class SqlFormatterUi {
  constructor() {
    this.dom = {
      formatBtn: document.getElementById('formatBtn'),
      clearBtn: document.getElementById('clearBtn'),
      copyBtn: document.getElementById('copyBtn'),
      downloadBtn: document.getElementById('downloadBtn'),
      autoFormatToggle: document.getElementById('autoFormatToggle'),
      commentToggle: document.getElementById('commentToggle'),
      blankLineToggle: document.getElementById('blankLineToggle'),
      dialectSelect: document.getElementById('dialectSelect'),
      keywordCaseSelect: document.getElementById('keywordCaseSelect'),
      indentSizeSelect: document.getElementById('indentSizeSelect'),
      indentTypeSelect: document.getElementById('indentTypeSelect'),
      commaStyleSelect: document.getElementById('commaStyleSelect'),
      modeSelect: document.getElementById('modeSelect'),
      input: document.getElementById('sqlInput'),
      output: document.getElementById('sqlOutput'),
      errorBox: document.getElementById('errorBox'),
      errorTitle: document.getElementById('errorTitle'),
      errorDetail: document.getElementById('errorDetail'),
      errorLocation: document.getElementById('errorLocation'),
      resultStatus: document.getElementById('resultStatus'),
      inputStats: document.getElementById('inputStats'),
      outputStats: document.getElementById('outputStats'),
      perfTime: document.getElementById('perfTime'),
      charCount: document.getElementById('charCount'),
      processingIndicator: document.getElementById('processingIndicator'),
      toastRegion: document.getElementById('toastRegion')
    };
  }

  updateStats() {
    this.dom.inputStats.textContent = countSummary(this.dom.input.value);
    this.dom.outputStats.textContent = countSummary(this.dom.output.value);
    this.dom.charCount.textContent = `${this.dom.input.value.length} chars`;
  }

  showError(error) {
    this.dom.errorBox.hidden = false;
    this.dom.errorTitle.textContent = error.title;
    this.dom.errorDetail.textContent = error.message;
    if (error.location) {
      this.dom.errorLocation.hidden = false;
      this.dom.errorLocation.textContent = `Approximate location: line ${error.location.line}, column ${error.location.column}`;
    } else {
      this.dom.errorLocation.hidden = true;
      this.dom.errorLocation.textContent = '';
    }
  }

  clearError() {
    this.dom.errorBox.hidden = true;
  }

  setBusy(isBusy) {
    this.dom.formatBtn.disabled = isBusy || this.dom.input.value.trim().length === 0;
    this.dom.clearBtn.disabled = isBusy || this.dom.input.value.length === 0;
    this.dom.copyBtn.disabled = isBusy || this.dom.output.value.length === 0;
    this.dom.downloadBtn.disabled = isBusy || this.dom.output.value.length === 0;
  }

  setResultStatus(value) {
    this.dom.resultStatus.textContent = value;
  }

  setExecutionMs(ms) {
    this.dom.perfTime.textContent = `${ms.toFixed(1)} ms`;
  }

  setProcessingVisible(visible) {
    this.dom.processingIndicator.hidden = !visible;
  }

  toast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    this.dom.toastRegion.appendChild(toast);
    window.setTimeout(() => toast.remove(), 1800);
  }
}
