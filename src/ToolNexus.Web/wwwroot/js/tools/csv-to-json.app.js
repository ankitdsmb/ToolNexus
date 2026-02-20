import { getKeyboardEventManager } from './keyboard-event-manager.js';
import {
  DEFAULT_PREVIEW_ROWS,
  convertCsvToJson,
  formatError,
  parseCustomHeaders
} from './csv-to-json.api.js';
import { queryCsvToJsonDom } from './csv-to-json.dom.js';

export const TOOL_ID = 'csv-to-json';

function debounce(callback, waitMs = 200) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), waitMs);
  };
}

export class CsvToJsonApp {
  constructor(root, doc = document) {
    this.root = root;
    this.doc = doc;
    this.dom = queryCsvToJsonDom(root);
    this.lastResult = '';
    this.eventController = new AbortController();
    this.disposeKeyboardHandler = () => {};
    this.autoConvertHandler = debounce(() => {
      this.setBusy(false, this.dom.csvInput.value.trim() ? 'Ready to convert.' : 'Input is empty.');
      if (this.dom.autoConvertToggle.checked) {
        this.runConversion();
      }
    }, 150);
  }

  init() {
    if (!this.dom.convertBtn) {
      return;
    }

    this.bindEvents();
    this.setBusy(false, 'Ready');
  }

  destroy() {
    this.eventController.abort();
    this.disposeKeyboardHandler();
  }

  setBusy(busy, status) {
    this.dom.convertBtn.disabled = busy || !this.dom.csvInput.value.trim();
    this.dom.clearBtn.disabled = busy;
    this.dom.copyBtn.disabled = busy || !this.lastResult;
    this.dom.downloadBtn.disabled = busy || !this.lastResult;
    this.dom.statusText.textContent = status;
  }

  clearError() {
    this.dom.errorBox.hidden = true;
    this.dom.errorBox.textContent = '';
  }

  showError(message) {
    this.dom.errorBox.hidden = false;
    this.dom.errorBox.textContent = message;
  }

  getConfig() {
    return {
      delimiter: this.dom.delimiterSelect.value === '\t' ? '\t' : this.dom.delimiterSelect.value,
      useHeaderRow: this.dom.useHeaderToggle.checked,
      customHeaders: parseCustomHeaders(this.dom.customHeadersInput.value),
      pretty: this.dom.prettyToggle.checked,
      indent: Number(this.dom.indentSelect.value),
      typeDetection: this.dom.typeDetectToggle.checked,
      emptyAsNull: this.dom.emptyAsNullToggle.checked,
      sanitizeFormulas: this.dom.sanitizeToggle.checked,
      previewRows: Number(this.dom.previewRowsInput.value || DEFAULT_PREVIEW_ROWS)
    };
  }

  updateMetrics(rowCount, charCount) {
    this.dom.rowCount.textContent = `Rows: ${rowCount}`;
    this.dom.charCount.textContent = `Chars: ${charCount}`;
  }

  async runConversion() {
    const input = this.dom.csvInput.value;

    if (!input.trim()) {
      this.dom.jsonOutput.value = '';
      this.lastResult = '';
      this.updateMetrics(0, 0);
      this.setBusy(false, 'Input is empty.');
      return;
    }

    this.setBusy(true, 'Processing CSV…');
    this.clearError();

    try {
      const result = await convertCsvToJson(input, this.getConfig());
      this.lastResult = result.json;
      this.dom.jsonOutput.value = result.json;
      this.updateMetrics(result.rowCount, result.json.length);
      const previewRows = Number(this.dom.previewRowsInput.value || DEFAULT_PREVIEW_ROWS);
      const previewSuffix = result.rowCount > previewRows ? ` (previewing first ${previewRows})` : '';
      this.setBusy(false, `Converted ${result.rowCount} rows${previewSuffix}.`);
    } catch (error) {
      this.lastResult = '';
      this.dom.jsonOutput.value = '';
      this.updateMetrics(0, 0);
      this.showError(formatError(error));
      this.setBusy(false, 'Conversion failed.');
    }
  }

  clearAll() {
    this.dom.csvInput.value = '';
    this.dom.jsonOutput.value = '';
    this.dom.customHeadersInput.value = '';
    this.lastResult = '';
    this.clearError();
    this.updateMetrics(0, 0);
    this.setBusy(false, 'Cleared.');
    this.dom.csvInput.focus();
  }

  bindEvents() {
    const signal = this.eventController.signal;

    this.dom.useHeaderToggle.addEventListener('change', () => {
      this.dom.customHeadersField.hidden = this.dom.useHeaderToggle.checked;
      if (this.dom.autoConvertToggle.checked) {
        this.runConversion();
      }
    }, { signal });

    this.dom.convertBtn.addEventListener('click', () => this.runConversion(), { signal });
    this.dom.clearBtn.addEventListener('click', () => this.clearAll(), { signal });

    this.dom.copyBtn.addEventListener('click', async () => {
      if (!this.lastResult) {
        return;
      }

      try {
        await navigator.clipboard.writeText(this.lastResult);
        this.setBusy(false, 'JSON copied to clipboard.');
      } catch {
        this.showError('Copy failed. Clipboard access was blocked by the browser.');
      }
    }, { signal });

    this.dom.downloadBtn.addEventListener('click', () => {
      if (!this.lastResult) {
        return;
      }

      const blob = new Blob([this.lastResult], { type: 'application/json;charset=utf-8' });
      const link = this.doc.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'converted.json';
      link.click();
      URL.revokeObjectURL(link.href);
      this.setBusy(false, 'Download started.');
    }, { signal });

    [
      this.dom.csvInput,
      this.dom.delimiterSelect,
      this.dom.customHeadersInput,
      this.dom.prettyToggle,
      this.dom.indentSelect,
      this.dom.typeDetectToggle,
      this.dom.emptyAsNullToggle,
      this.dom.sanitizeToggle,
      this.dom.previewRowsInput
    ].forEach((element) => {
      element.addEventListener('input', this.autoConvertHandler, { signal });
      element.addEventListener('change', this.autoConvertHandler, { signal });
    });

    this.disposeKeyboardHandler = getKeyboardEventManager().register({
      root: this.root,
      onKeydown: (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          this.runConversion();
        }

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
          event.preventDefault();
          this.clearAll();
        }
      }
    });
  }
}

export function createCsvToJsonApp(root) {
  const app = new CsvToJsonApp(root);
  app.init();
  return app;
}
