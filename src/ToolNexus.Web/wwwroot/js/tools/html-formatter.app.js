import { getKeyboardEventManager } from './keyboard-event-manager.js';
import { getDefaultHtmlFormatterOptions, runHtmlFormatter } from './html-formatter.api.js';
import { getHtmlFormatterDom } from './html-formatter.dom.js';

const APP_INSTANCES = new WeakMap();

function createDownload(content, filename) {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

class HtmlFormatterApp {
  constructor(root) {
    this.dom = getHtmlFormatterDom(root);
    this.disposeHandlers = [];
    this.disposeKeyboard = null;

    if (!this.dom?.input || !this.dom?.output || !this.dom?.runButton) return;
    this.initializeUi();
    this.bindEvents();
    this.updateButtonStates();
  }

  initializeUi() {
    if (this.dom.shortcutHint) {
      this.dom.shortcutHint.textContent = 'Shortcuts: Ctrl/Cmd + Enter to format • Ctrl/Cmd + L to clear';
    }

    if (this.dom.actionSelect) {
      const minifyOption = this.dom.actionSelect.querySelector('option[value="minify"]');
      if (minifyOption) minifyOption.textContent = 'Compact';
    }
  }

  on(element, eventName, handler) {
    if (!element) return;
    element.addEventListener(eventName, handler);
    this.disposeHandlers.push(() => element.removeEventListener(eventName, handler));
  }

  readOptions() {
    const defaults = getDefaultHtmlFormatterOptions();
    return {
      ...defaults,
      compactMode: this.dom.actionSelect?.value === 'minify'
    };
  }

  async run(action = this.dom.actionSelect?.value || 'format', input = this.dom.input.value) {
    const result = await runHtmlFormatter(action, input, this.readOptions());
    this.dom.output.value = result.output;

    if (this.dom.resultStatus) {
      this.dom.resultStatus.textContent = `${result.metrics.characters} characters • ${result.metrics.lines} lines`;
    }

    if (this.dom.errorMessage) {
      if (result.warnings.length) {
        this.dom.errorMessage.hidden = false;
        this.dom.errorMessage.textContent = `Formatted with warnings. ${result.warnings[0].message}`;
      } else {
        this.dom.errorMessage.hidden = true;
        this.dom.errorMessage.textContent = '';
      }
    }

    this.updateButtonStates();
    return result.output;
  }

  clear() {
    this.dom.input.value = '';
    this.dom.output.value = '';
    if (this.dom.errorMessage) {
      this.dom.errorMessage.hidden = true;
      this.dom.errorMessage.textContent = '';
    }
    this.updateButtonStates();
  }

  updateButtonStates() {
    const hasInput = Boolean(this.dom.input.value.trim());
    const hasOutput = Boolean(this.dom.output.value.trim());
    this.dom.runButton.disabled = !hasInput;
    if (this.dom.clearButton) this.dom.clearButton.disabled = !hasInput;
    if (this.dom.copyButton) this.dom.copyButton.disabled = !hasOutput;
    if (this.dom.downloadButton) this.dom.downloadButton.disabled = !hasOutput;
  }

  bindEvents() {
    this.on(this.dom.runButton, 'click', () => { void this.run(); });
    this.on(this.dom.clearButton, 'click', () => this.clear());
    this.on(this.dom.input, 'input', () => this.updateButtonStates());
    this.on(this.dom.copyButton, 'click', async () => {
      if (this.dom.output.value.trim()) await navigator.clipboard.writeText(this.dom.output.value);
    });
    this.on(this.dom.downloadButton, 'click', () => {
      if (this.dom.output.value.trim()) createDownload(this.dom.output.value, 'formatted.html');
    });

    this.disposeKeyboard = getKeyboardEventManager().register({
      root: this.dom.root,
      onKeydown: (event) => {
        if (!(event.ctrlKey || event.metaKey)) return;
        if (event.key === 'Enter') {
          event.preventDefault();
          void this.run();
        }

        if (event.key.toLowerCase() === 'l') {
          event.preventDefault();
          this.clear();
        }
      }
    });
  }

  destroy() {
    this.disposeKeyboard?.();
    while (this.disposeHandlers.length) this.disposeHandlers.pop()?.();
    if (this.dom.clearButtonCreated) this.dom.clearButton?.remove();
    APP_INSTANCES.delete(this.dom.root);
  }
}

export function createHtmlFormatterApp(root) {
  if (!root) return null;
  if (APP_INSTANCES.has(root)) return APP_INSTANCES.get(root);

  const app = new HtmlFormatterApp(root);
  APP_INSTANCES.set(root, app);
  return app;
}
