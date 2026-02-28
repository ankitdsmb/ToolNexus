import { getKeyboardEventManager } from './keyboard-event-manager.js';
import {
  buildXml,
  calculateStructureStats,
  getDefaultJsonToXmlOptions,
  JsonXmlError,
  parseJson,
  sanitizeTagName
} from './json-to-xml.api.js';
import { getJsonToXmlDom } from './json-to-xml.dom.js';

const APP_INSTANCES = new WeakMap();

class JsonToXmlApp {
  constructor(root) {
    this.dom = getJsonToXmlDom(root);
    this.disposeHandlers = [];
    this.disposeKeyboard = null;
    this.autoTimer = 0;
    this.state = { autoConvert: false };

    if (!this.dom?.runButton || !this.dom?.input) {
      return;
    }

    this.initializeUi();
    this.bindEvents();
  }

  initializeUi() {
    if (this.dom.headingText) {
      this.dom.headingText.textContent = 'Professional JSON to XML conversion with deterministic, client-side serialization.';
    }

    if (this.dom.runButtonLabel) {
      this.dom.runButtonLabel.textContent = 'Convert';
    }

    if (this.dom.shortcutHint) {
      this.dom.shortcutHint.textContent = 'Shortcuts: Ctrl/Cmd + Enter convert, Ctrl/Cmd + L clear input.';
    }
  }

  on(element, eventName, handler) {
    if (!element) return;
    element.addEventListener(eventName, handler);
    this.disposeHandlers.push(() => element.removeEventListener(eventName, handler));
  }

  clearInput() {
    this.dom.input.value = '';
    if (this.dom.errorMessage) {
      this.dom.errorMessage.hidden = true;
      this.dom.errorMessage.textContent = '';
    }
  }

  readOptions() {
    const defaults = getDefaultJsonToXmlOptions();
    const indentSize = Number.parseInt(this.dom.indentSize?.value ?? String(defaults.indentSize), 10);

    return {
      rootName: sanitizeTagName(this.dom.rootName?.value ?? defaults.rootName),
      prettyPrint: this.dom.prettyPrint?.checked ?? defaults.prettyPrint,
      indentSize: indentSize === 4 ? 4 : 2,
      autoRoot: this.dom.autoRoot?.checked ?? defaults.autoRoot,
      attributeMode: this.dom.attributeMode?.checked ?? defaults.attributeMode,
      nullMode: this.dom.nullMode?.value === 'empty' ? 'empty' : 'self-closing'
    };
  }

  scheduleAutoConvert() {
    window.clearTimeout(this.autoTimer);
    this.autoTimer = window.setTimeout(() => {
      if (!this.state.autoConvert) return;
      this.dom.runButton.click();
    }, 250);
  }

  bindEvents() {
    this.on(this.dom.clearButton, 'click', () => this.clearInput());

    this.on(this.dom.autoConvert, 'change', () => {
      this.state.autoConvert = Boolean(this.dom.autoConvert?.checked);
      if (this.state.autoConvert && this.dom.input.value.trim()) {
        this.dom.runButton.click();
      }
    });

    this.on(this.dom.input, 'input', () => {
      if (this.state.autoConvert) {
        this.scheduleAutoConvert();
      }
    });

    this.disposeKeyboard = getKeyboardEventManager().register({
      root: this.dom.root,
      onKeydown: (event) => {
        if (!(event.ctrlKey || event.metaKey)) return;

        if (event.key.toLowerCase() === 'l') {
          event.preventDefault();
          this.clearInput();
          return;
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          this.dom.runButton.click();
        }
      }
    });
  }

  run(action, input) {
    if (String(action ?? '').trim().toLowerCase() !== 'convert') {
      throw new JsonXmlError('Unsupported action', 'Only convert action is supported.');
    }

    const startedAt = performance.now();
    const parsed = parseJson(input);
    const xml = buildXml(parsed, this.readOptions());
    const metrics = calculateStructureStats(parsed);

    if (this.dom.resultStatus) {
      const elapsed = Math.max(1, Math.round(performance.now() - startedAt));
      this.dom.resultStatus.textContent = `Converted locally • ${metrics.objectCount} objects • ${metrics.arrayCount} arrays • ${elapsed}ms`;
    }

    return xml;
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

export function createJsonToXmlApp(root) {
  if (!root) return null;
  if (APP_INSTANCES.has(root)) return APP_INSTANCES.get(root);

  const app = new JsonToXmlApp(root);
  APP_INSTANCES.set(root, app);
  return app;
}
