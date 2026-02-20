import { getKeyboardEventManager } from './keyboard-event-manager.js';
import { runCssMinifier, toUserErrorMessage } from './css-minifier.api.js';
import { getCssMinifierDom } from './css-minifier.dom.js';

const DOWNLOAD_FILE_NAME = 'styles.min.css';
const AUTO_MINIFY_DEBOUNCE_MS = 280;
const APP_INSTANCES = new WeakMap();

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getByteSize(value) {
  return new TextEncoder().encode(value).length;
}

class CssMinifierApp {
  constructor(root) {
    this.dom = getCssMinifierDom(root);
    this.disposeHandlers = [];
    this.disposeKeyboard = null;
    this.autoTimer = 0;

    if (!this.dom?.inputEditor || !this.dom?.outputEditor || !this.dom?.runBtn) return;
    this.initializeUi();
    this.bindEvents();
  }

  initializeUi() {
    if (this.dom.actionSelect) this.dom.actionSelect.value = this.dom.actionSelect.options[0]?.value ?? '';
    if (this.dom.shortcutHint) this.dom.shortcutHint.textContent = 'Shortcuts: Ctrl/Cmd + Enter to minify, Ctrl/Cmd + L to clear input';
    if (this.dom.outputHeading) this.dom.outputHeading.textContent = 'Minified CSS Output';
    if (this.dom.runBtn.querySelector('.tool-btn__label')) this.dom.runBtn.querySelector('.tool-btn__label').textContent = 'Minify';
    if (this.dom.copyBtn) this.dom.copyBtn.textContent = 'Copy Output';
    if (this.dom.downloadBtn) this.dom.downloadBtn.textContent = 'Download .min.css';
  }

  on(element, eventName, handler) {
    if (!element) return;
    element.addEventListener(eventName, handler);
    this.disposeHandlers.push(() => element.removeEventListener(eventName, handler));
  }

  renderStatus(message, level = 'info') {
    const status = this.dom.outputStatus;
    if (!status) return;

    status.textContent = message;
    status.classList.remove('result-indicator--idle', 'result-indicator--success', 'result-indicator--failure');
    if (level === 'success') status.classList.add('result-indicator--success');
    else if (level === 'error') status.classList.add('result-indicator--failure');
    else status.classList.add('result-indicator--idle');
  }

  updateMetrics(original, minified) {
    if (!this.dom.metrics) return;
    const originalSize = getByteSize(original);
    const minifiedSize = getByteSize(minified);
    const reduction = originalSize === 0 ? 0 : ((1 - (minifiedSize / originalSize)) * 100);

    this.dom.metrics.innerHTML = `<span>Original: ${formatBytes(originalSize)}</span><span>Minified: ${formatBytes(minifiedSize)}</span><span>Reduction: ${reduction.toFixed(1)}%</span>`;
  }

  clearInput() {
    this.dom.inputEditor.value = '';
    this.dom.outputEditor.value = '';
    if (this.dom.warnings) {
      this.dom.warnings.hidden = true;
      this.dom.warnings.innerHTML = '';
    }
    this.updateMetrics('', '');
    this.renderStatus('Cleared', 'info');
  }

  async run(action = 'minify', input = this.dom.inputEditor.value) {
    this.renderStatus('Processing…', 'info');

    try {
      const output = await runCssMinifier(action, input, {
        preserveImportantComments: Boolean(this.dom.preserveToggle?.checked)
      });
      this.dom.outputEditor.value = output;
      this.updateMetrics(input ?? '', output);
      this.renderStatus('Minified successfully', 'success');
      if (this.dom.warnings) {
        this.dom.warnings.hidden = true;
        this.dom.warnings.innerHTML = '';
      }
      return output;
    } catch (error) {
      if (this.dom.warnings) {
        this.dom.warnings.hidden = false;
        this.dom.warnings.innerHTML = `<strong>Minification Failed</strong><p>${toUserErrorMessage(error)}</p>`;
      }
      this.renderStatus('Minification failed', 'error');
      throw new Error(toUserErrorMessage(error));
    }
  }

  bindEvents() {
    this.on(this.dom.runBtn, 'click', () => { void this.run(); });
    this.on(this.dom.clearButton, 'click', () => this.clearInput());
    this.on(this.dom.inputEditor, 'keyup', () => {
      if (!this.dom.autoToggle?.checked) return;
      window.clearTimeout(this.autoTimer);
      this.autoTimer = window.setTimeout(() => {
        this.dom.runBtn.click();
      }, AUTO_MINIFY_DEBOUNCE_MS);
    });

    this.on(this.dom.downloadBtn, 'click', () => {
      const output = this.dom.outputEditor.value;
      if (!output.trim()) return;
      const blob = new Blob([output], { type: 'text/css' });
      const anchor = document.createElement('a');
      anchor.href = URL.createObjectURL(blob);
      anchor.download = DOWNLOAD_FILE_NAME;
      anchor.click();
      URL.revokeObjectURL(anchor.href);
    });

    this.disposeKeyboard = getKeyboardEventManager().register({
      root: this.dom.root,
      onKeydown: (event) => {
        if (!(event.ctrlKey || event.metaKey)) return;

        if (event.key.toLowerCase() === 'l') {
          event.preventDefault();
          this.clearInput();
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          void this.run();
        }
      }
    });
  }

  destroy() {
    this.disposeKeyboard?.();
    window.clearTimeout(this.autoTimer);
    while (this.disposeHandlers.length) this.disposeHandlers.pop()?.();
    if (this.dom.clearButtonCreated) this.dom.clearButton?.remove();
    if (this.dom.optionsCreated) this.dom.options?.remove();
    if (this.dom.metricsCreated) this.dom.metrics?.remove();
    if (this.dom.warningsCreated) this.dom.warnings?.remove();
    APP_INSTANCES.delete(this.dom.root);
  }
}

export function createCssMinifierApp(root) {
  if (!root) return null;
  if (APP_INSTANCES.has(root)) return APP_INSTANCES.get(root);

  const app = new CssMinifierApp(root);
  APP_INSTANCES.set(root, app);
  return app;
}
