import { getKeyboardEventManager } from './keyboard-event-manager.js';
import { runSqlFormatter } from './sql-formatter.api.js';
import { getSqlFormatterDom } from './sql-formatter.dom.js';

const APP_INSTANCES = new WeakMap();

class SqlFormatterApp {
  constructor(root) {
    this.dom = getSqlFormatterDom(root);
    this.disposeHandlers = [];
    this.disposeKeyboard = null;

    if (!this.dom?.input || !this.dom?.output || !this.dom?.runButton) {
      return;
    }

    this.bindEvents();
    this.updateButtons();
  }

  on(element, eventName, handler) {
    if (!element) return;
    element.addEventListener(eventName, handler);
    this.disposeHandlers.push(() => element.removeEventListener(eventName, handler));
  }

  updateButtons() {
    const hasInput = Boolean(this.dom.input.value.trim());
    const hasOutput = Boolean(this.dom.output.value.trim());
    this.dom.runButton.disabled = !hasInput;
    if (this.dom.clearButton) this.dom.clearButton.disabled = !hasInput && !hasOutput;
    if (this.dom.copyButton) this.dom.copyButton.disabled = !hasOutput;
    if (this.dom.downloadButton) this.dom.downloadButton.disabled = !hasOutput;
  }

  async run(action = this.dom.actionSelect?.value || 'format', input = this.dom.input.value) {
    const output = await runSqlFormatter(action, input);
    this.dom.output.value = output;
    if (this.dom.resultStatus) this.dom.resultStatus.textContent = 'SQL formatted successfully.';
    this.updateButtons();
    return output;
  }

  clear() {
    this.dom.input.value = '';
    this.dom.output.value = '';
    if (this.dom.resultStatus) this.dom.resultStatus.textContent = 'Cleared.';
    this.updateButtons();
  }

  bindEvents() {
    this.on(this.dom.input, 'input', () => this.updateButtons());
    this.on(this.dom.runButton, 'click', () => { void this.run(); });
    this.on(this.dom.clearButton, 'click', () => this.clear());
    this.on(this.dom.copyButton, 'click', async () => {
      if (this.dom.output.value.trim()) await navigator.clipboard.writeText(this.dom.output.value);
    });

    this.on(this.dom.downloadButton, 'click', () => {
      if (!this.dom.output.value.trim()) return;
      const blob = new Blob([this.dom.output.value], { type: 'application/sql;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'toolnexus-sql.sql';
      anchor.click();
      URL.revokeObjectURL(url);
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
    this.disposeKeyboard = null;
    while (this.disposeHandlers.length) this.disposeHandlers.pop()?.();
    APP_INSTANCES.delete(this.dom.root);
  }
}

export function createSqlFormatterApp(root) {
  if (!root) return null;
  if (APP_INSTANCES.has(root)) return APP_INSTANCES.get(root);

  const app = new SqlFormatterApp(root);
  APP_INSTANCES.set(root, app);
  return app;
}
