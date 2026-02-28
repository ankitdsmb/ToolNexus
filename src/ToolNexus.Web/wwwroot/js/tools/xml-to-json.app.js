import { getKeyboardEventManager } from './keyboard-event-manager.js';
import { getDefaultXmlToJsonConfig, transformXmlToJson, XmlJsonError } from './xml-to-json.api.js';
import { getXmlToJsonDom } from './xml-to-json.dom.js';

const APP_INSTANCES = new WeakMap();

class XmlToJsonApp {
  constructor(root) {
    this.dom = getXmlToJsonDom(root);
    this.disposeHandlers = [];
    this.disposeKeyboard = null;
    this.autoTimer = 0;
    this.state = { autoConvert: false, isProcessing: false, lastNodeCount: 0 };

    if (!this.dom?.input || !this.dom?.runButton) {
      return;
    }

    this.initializeUi();
    this.bindEvents();
    this.toggleConvertAvailability();
  }

  initializeUi() {
    this.dom.root.classList.add('xml-json-tool');
    if (this.dom.description) {
      this.dom.description.textContent = 'Reliable XML to JSON conversion with secure, deterministic client-side parsing.';
    }

    const runLabel = this.dom.root.querySelector('#runBtn .tool-btn__label');
    if (runLabel) runLabel.textContent = 'Convert';

    if (this.dom.shortcutHint) {
      this.dom.shortcutHint.textContent = 'Shortcuts: Ctrl/Cmd + Enter convert, Ctrl/Cmd + L clear input.';
    }
  }

  on(element, eventName, handler) {
    if (!element) return;
    element.addEventListener(eventName, handler);
    this.disposeHandlers.push(() => element.removeEventListener(eventName, handler));
  }

  readUiConfig() {
    const defaults = getDefaultXmlToJsonConfig();
    const valueMode = this.dom.root.querySelector('#xmlJsonValueMode')?.value ?? 'strings';
    const outputMode = this.dom.root.querySelector('#xmlJsonOutputMode')?.value ?? 'pretty';
    const indentSize = Number.parseInt(this.dom.root.querySelector('#xmlJsonIndentSize')?.value ?? '2', 10);

    return {
      attributeKey: this.dom.root.querySelector('#xmlJsonAttributeKey')?.value?.trim() || defaults.attributeKey,
      textKey: this.dom.root.querySelector('#xmlJsonTextKey')?.value?.trim() || defaults.textKey,
      cdataKey: this.dom.root.querySelector('#xmlJsonCdataKey')?.value?.trim() || defaults.cdataKey,
      commentKey: this.dom.root.querySelector('#xmlJsonCommentKey')?.value?.trim() || defaults.commentKey,
      includeAttributes: this.dom.root.querySelector('#xmlJsonIncludeAttributes')?.checked ?? defaults.includeAttributes,
      keepStrings: valueMode === 'strings',
      detectTypes: valueMode === 'detect',
      preserveRawText: valueMode === 'raw',
      prettyPrint: outputMode === 'pretty',
      indentSize: indentSize === 4 ? 4 : 2,
      sortKeys: this.dom.root.querySelector('#xmlJsonSortKeys')?.checked ?? defaults.sortKeys
    };
  }

  updateMetrics(text) {
    if (this.dom.metrics) {
      this.dom.metrics.textContent = text;
    }
  }

  clearInput() {
    this.dom.input.value = '';
    this.dom.input.dispatchEvent(new Event('input', { bubbles: true }));
    this.updateMetrics('Input cleared.');
  }

  toggleConvertAvailability() {
    this.dom.runButton.disabled = !this.dom.input.value.trim() || this.state.isProcessing;
  }

  scheduleAutoConvert() {
    window.clearTimeout(this.autoTimer);
    this.autoTimer = window.setTimeout(() => {
      if (!this.state.autoConvert || this.state.isProcessing) return;
      this.dom.runButton.click();
    }, 300);
  }

  bindEvents() {
    this.on(this.dom.clearButton, 'click', () => this.clearInput());

    this.on(this.dom.input, 'input', () => {
      this.toggleConvertAvailability();
      if (this.state.autoConvert) this.scheduleAutoConvert();
    });

    this.on(this.dom.autoConvert, 'change', () => {
      this.state.autoConvert = Boolean(this.dom.autoConvert?.checked);
      if (this.state.autoConvert) this.scheduleAutoConvert();
    });

    this.on(this.dom.controls, 'input', () => {
      if (this.state.autoConvert) this.scheduleAutoConvert();
    });

    this.disposeKeyboard = getKeyboardEventManager().register({
      root: this.dom.root,
      onKeydown: (event) => {
        if (!(event.ctrlKey || event.metaKey)) return;
        if (event.key === 'Enter') {
          event.preventDefault();
          this.dom.runButton.click();
        }

        if (event.key.toLowerCase() === 'l') {
          event.preventDefault();
          this.clearInput();
        }
      }
    });
  }

  async run(action, input) {
    if (String(action ?? '').trim().toLowerCase() !== 'convert') {
      throw new XmlJsonError('Unsupported action', 'XML to JSON supports only the convert action.');
    }

    this.state.isProcessing = true;
    this.toggleConvertAvailability();
    this.updateMetrics('Processing XML…');

    try {
      const { output, nodeCount } = await transformXmlToJson(input, this.readUiConfig());
      this.state.lastNodeCount = nodeCount;
      this.updateMetrics(`Converted ${nodeCount.toLocaleString()} nodes successfully.`);
      return output;
    } catch (error) {
      const message = error instanceof XmlJsonError
        ? `${error.title}: ${error.message}`
        : 'Conversion failed. Please verify the XML input and try again.';

      this.updateMetrics(message);
      throw new Error(message);
    } finally {
      this.state.isProcessing = false;
      this.toggleConvertAvailability();
    }
  }

  destroy() {
    if (!this.dom) {
      return;
    }

    this.disposeKeyboard?.();
    this.disposeKeyboard = null;
    window.clearTimeout(this.autoTimer);

    while (this.disposeHandlers.length) {
      this.disposeHandlers.pop()?.();
    }

    if (this.dom.controlsCreated) this.dom.controls?.remove();
    if (this.dom.clearButtonCreated) this.dom.clearButton?.remove();
    if (this.dom.badgeCreated) this.dom.badge?.remove();

    APP_INSTANCES.delete(this.dom.root);
  }
}

export function createXmlToJsonApp(root) {
  if (!root) return null;
  if (APP_INSTANCES.has(root)) return APP_INSTANCES.get(root);

  const app = new XmlToJsonApp(root);
  APP_INSTANCES.set(root, app);
  return app;
}
