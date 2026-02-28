import { queryDocumentConverterDom } from './document-converter.dom.js';
import { runTool } from './document-converter.api.js';

export const TOOL_ID = 'document-converter';

const STATUS_MESSAGES = {
  idle: 'Waiting for file…',
  uploading: 'Uploading file…',
  converting: 'Converting document…',
  success: 'Conversion complete.',
  failed: 'Conversion failed.'
};

export class DocumentConverterApp {
  constructor(root) {
    this.root = root;
    this.dom = queryDocumentConverterDom(root);
    this.eventController = new AbortController();
    this.currentDownloadUrl = null;
  }

  init() {
    if (!this.dom.convertBtn || !this.dom.fileInput || !this.dom.conversionMode) {
      return;
    }

    this.renderState('idle');
    this.bindEvents();
  }

  destroy() {
    this.eventController.abort();
    this.releaseDownload();
  }

  bindEvents() {
    const signal = this.eventController.signal;

    this.dom.convertBtn.addEventListener('click', () => {
      this.executeConversion();
    }, { signal });

    this.dom.fileInput.addEventListener('change', () => {
      this.clearError();
      this.releaseDownload();
      this.renderMetrics('', '');
      this.renderState('idle', this.dom.fileInput.files?.[0] ? 'File selected. Ready to convert.' : STATUS_MESSAGES.idle);
    }, { signal });
  }

  renderState(state, message = STATUS_MESSAGES[state]) {
    this.dom.conversionStatus.textContent = message;
    this.dom.convertBtn.disabled = state === 'uploading' || state === 'converting';
  }

  renderMetrics(executionTime, fileSize) {
    this.dom.executionTime.textContent = executionTime ? `Execution: ${executionTime}` : '';
    this.dom.fileSize.textContent = fileSize ? `Output: ${fileSize}` : '';
  }

  showError(message) {
    this.dom.errorBox.hidden = false;
    this.dom.errorBox.textContent = message;
  }

  clearError() {
    this.dom.errorBox.hidden = true;
    this.dom.errorBox.textContent = '';
  }

  releaseDownload() {
    if (this.currentDownloadUrl) {
      URL.revokeObjectURL(this.currentDownloadUrl);
      this.currentDownloadUrl = null;
    }

    this.dom.downloadLink.hidden = true;
    this.dom.downloadLink.removeAttribute('href');
    this.dom.downloadLink.removeAttribute('download');
  }

  async executeConversion() {
    const file = this.dom.fileInput.files?.[0];
    if (!file) {
      this.showError('Please choose a DOCX or PDF file first.');
      return;
    }

    this.clearError();
    this.releaseDownload();
    this.renderState('uploading');

    try {
      this.renderState('converting');
      const result = await runTool('convert', {
        file,
        mode: this.dom.conversionMode.value
      });

      this.currentDownloadUrl = URL.createObjectURL(result.blob);
      this.dom.downloadLink.href = this.currentDownloadUrl;
      this.dom.downloadLink.download = result.outputFileName;
      this.dom.downloadLink.hidden = false;

      const kb = (result.blob.size / 1024).toFixed(2);
      const duration = result.executionTimeMs > 0 ? `${result.executionTimeMs}ms` : 'n/a';
      this.renderMetrics(duration, `${kb} KB`);
      this.renderState('success');
    } catch (error) {
      this.renderState('failed');
      this.renderMetrics('', '');
      this.showError(error?.message || 'Unable to convert file.');
    }
  }
}

export function createDocumentConverterApp(root) {
  const app = new DocumentConverterApp(root);
  app.init();
  return app;
}
