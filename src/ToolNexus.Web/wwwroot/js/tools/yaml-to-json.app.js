import { getKeyboardEventManager } from './keyboard-event-manager.js';
import { getDefaultYamlToJsonOptions, runYamlToJson } from './yaml-to-json.api.js';
import { getYamlToJsonDom } from './yaml-to-json.dom.js';

const APP_INSTANCES = new WeakMap();

class YamlToJsonApp {
  constructor(root) {
    this.dom = getYamlToJsonDom(root);
    this.disposeHandlers = [];
    this.disposeKeyboard = null;

    if (!this.dom?.yamlInput || !this.dom?.jsonOutput || !this.dom?.convertBtn) return;

    this.bindEvents();
    this.updateButtons();
  }

  on(el, ev, fn) {
    if (!el) return;
    el.addEventListener(ev, fn);
    this.disposeHandlers.push(() => el.removeEventListener(ev, fn));
  }

  readOptions() {
    const defaults = getDefaultYamlToJsonOptions();
    return {
      ...defaults,
      pretty: this.dom.prettyToggle?.checked ?? defaults.pretty,
      indent: Number.parseInt(this.dom.indentSelect?.value ?? String(defaults.indent), 10) || defaults.indent,
      sortKeys: this.dom.sortKeysToggle?.checked ?? defaults.sortKeys,
      autoTypes: this.dom.autoTypesToggle?.checked ?? defaults.autoTypes,
      strictStrings: this.dom.strictStringsToggle?.checked ?? defaults.strictStrings,
      parseDates: this.dom.parseDatesToggle?.checked ?? defaults.parseDates
    };
  }

  updateButtons() {
    const hasInput = Boolean(this.dom.yamlInput.value.trim());
    const hasOutput = Boolean(this.dom.jsonOutput.value.trim());
    this.dom.convertBtn.disabled = !hasInput;
    if (this.dom.clearBtn) this.dom.clearBtn.disabled = !hasInput && !hasOutput;
    if (this.dom.copyBtn) this.dom.copyBtn.disabled = !hasOutput;
    if (this.dom.downloadBtn) this.dom.downloadBtn.disabled = !hasOutput;
  }

  setStatus(text) {
    if (this.dom.statusText) this.dom.statusText.textContent = text;
  }

  async run(action = 'convert', input = this.dom.yamlInput.value) {
    const output = await runYamlToJson(action, input, this.readOptions());
    this.dom.jsonOutput.value = output;
    this.setStatus('Conversion complete');
    this.updateButtons();
    return output;
  }

  clear() {
    this.dom.yamlInput.value = '';
    this.dom.jsonOutput.value = '';
    this.setStatus('Cleared');
    this.updateButtons();
  }

  bindEvents() {
    this.on(this.dom.convertBtn, 'click', () => { void this.run(); });
    this.on(this.dom.clearBtn, 'click', () => this.clear());
    this.on(this.dom.copyBtn, 'click', async () => {
      if (this.dom.jsonOutput.value.trim()) await navigator.clipboard.writeText(this.dom.jsonOutput.value);
    });
    this.on(this.dom.downloadBtn, 'click', () => {
      if (!this.dom.jsonOutput.value.trim()) return;
      const blob = new Blob([this.dom.jsonOutput.value], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'output.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    const maybeAuto = () => {
      this.updateButtons();
      if (this.dom.autoConvertToggle?.checked && this.dom.yamlInput.value.trim()) {
        void this.run();
      }
    };

    this.on(this.dom.yamlInput, 'input', maybeAuto);
    [this.dom.prettyToggle, this.dom.indentSelect, this.dom.sortKeysToggle, this.dom.autoTypesToggle, this.dom.strictStringsToggle, this.dom.parseDatesToggle]
      .forEach((control) => this.on(control, 'change', maybeAuto));

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

export function createYamlToJsonApp(root) {
  if (!root) return null;
  if (APP_INSTANCES.has(root)) return APP_INSTANCES.get(root);

  const app = new YamlToJsonApp(root);
  APP_INSTANCES.set(root, app);
  return app;
}
