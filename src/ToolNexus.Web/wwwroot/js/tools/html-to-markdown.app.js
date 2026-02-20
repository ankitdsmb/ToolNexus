import { getKeyboardEventManager } from './keyboard-event-manager.js';
import { getDefaultHtmlToMarkdownOptions, runHtmlToMarkdown } from './html-to-markdown.api.js';
import { getHtmlToMarkdownDom } from './html-to-markdown.dom.js';

const APP_INSTANCES = new WeakMap();

class HtmlToMarkdownApp {
  constructor(root) {
    this.dom = getHtmlToMarkdownDom(root);
    this.disposeHandlers = [];
    this.disposeKeyboard = null;
    this.autoRunTimer = 0;

    if (!this.dom?.input || !this.dom?.output || !this.dom?.runButton) return;

    this.bindEvents();
    this.updateDisabledState();
    this.updateMetrics();
  }

  on(element, eventName, handler) {
    if (!element) return;
    element.addEventListener(eventName, handler);
    this.disposeHandlers.push(() => element.removeEventListener(eventName, handler));
  }

  readOptions() {
    const defaults = getDefaultHtmlToMarkdownOptions();
    return {
      ...defaults,
      fencedCodeBlocks: Boolean(this.dom.root.querySelector('#htmlMdFenced')?.checked),
      keepLineBreaks: Boolean(this.dom.root.querySelector('#htmlMdBreaks')?.checked),
      preserveUnsupportedTags: Boolean(this.dom.root.querySelector('#htmlMdPreserve')?.checked),
      convertTables: Boolean(this.dom.root.querySelector('#htmlMdTables')?.checked),
      preservePreBlocks: Boolean(this.dom.root.querySelector('#htmlMdPre')?.checked),
      compactMode: (this.dom.root.querySelector('#htmlMdDensity')?.value ?? 'pretty') === 'compact'
    };
  }

  updateMetrics() {
    const metrics = this.dom.root.querySelector('#htmlMdMetrics');
    if (!metrics) return;

    const inLen = this.dom.input.value.length;
    const outLen = this.dom.output.value.length;
    metrics.textContent = `Input: ${inLen.toLocaleString()} chars · Output: ${outLen.toLocaleString()} chars`;
  }

  updateDisabledState() {
    this.dom.runButton.disabled = !this.dom.input.value.trim();
  }

  clear() {
    this.dom.input.value = '';
    this.dom.output.value = '';
    this.updateMetrics();
    this.updateDisabledState();
  }

  scheduleAutoRun() {
    window.clearTimeout(this.autoRunTimer);
    this.autoRunTimer = window.setTimeout(() => this.dom.runButton.click(), 180);
  }

  async run(action = 'convert', input = this.dom.input.value) {
    const { output, metrics } = await runHtmlToMarkdown(action, input, this.readOptions());
    this.dom.output.value = output;
    if (this.dom.resultStatus) {
      this.dom.resultStatus.textContent = `${metrics.chars.toLocaleString()} chars / ${metrics.lines} lines`;
    }
    this.updateMetrics();
    this.updateDisabledState();
    return output;
  }

  bindEvents() {
    this.on(this.dom.runButton, 'click', () => { void this.run(); });
    this.on(this.dom.input, 'input', () => {
      this.updateMetrics();
      this.updateDisabledState();
      if (this.dom.root.querySelector('#htmlMdAuto')?.checked) this.scheduleAutoRun();
    });

    this.on(this.dom.root.querySelector('#htmlMdClearInput'), 'click', () => this.clear());
    this.on(this.dom.root.querySelector('#htmlMdOptions'), 'change', () => {
      if (this.dom.root.querySelector('#htmlMdAuto')?.checked && this.dom.input.value.trim()) this.scheduleAutoRun();
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
    window.clearTimeout(this.autoRunTimer);
    while (this.disposeHandlers.length) this.disposeHandlers.pop()?.();
    if (this.dom.optionsCreated) this.dom.options?.remove();
    APP_INSTANCES.delete(this.dom.root);
  }
}

export function createHtmlToMarkdownApp(root) {
  if (!root) return null;
  if (APP_INSTANCES.has(root)) return APP_INSTANCES.get(root);

  const app = new HtmlToMarkdownApp(root);
  APP_INSTANCES.set(root, app);
  return app;
}
