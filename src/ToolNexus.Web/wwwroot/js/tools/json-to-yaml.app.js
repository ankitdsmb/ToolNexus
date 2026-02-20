import { copyText, downloadYaml } from './json-to-yaml/exporter.js';
import { toUserFacingError } from './json-to-yaml/errors.js';
import { getKeyboardEventManager } from './keyboard-event-manager.js';
import { getDefaultJsonToYamlOptions, runJsonToYaml } from './json-to-yaml.api.js';
import { getJsonToYamlDom } from './json-to-yaml.dom.js';

const APP_INSTANCES = new WeakMap();

class JsonToYamlApp {
  constructor(root) {
    this.dom = getJsonToYamlDom(root);
    this.disposeHandlers = [];
    this.disposeKeyboard = null;
    this.latestYaml = '';
    this.converting = false;

    if (!this.dom?.jsonInput || !this.dom?.yamlOutput || !this.dom?.convertBtn) {
      return;
    }

    this.bindEvents();
    this.syncActions();
  }

  on(el, ev, fn) {
    if (!el) return;
    el.addEventListener(ev, fn);
    this.disposeHandlers.push(() => el.removeEventListener(ev, fn));
  }

  readOptions() {
    const defaults = getDefaultJsonToYamlOptions();
    return {
      ...defaults,
      indentSize: Number.parseInt(this.dom.indentSelect?.value ?? String(defaults.indentSize), 10) || defaults.indentSize,
      compact: this.dom.compactToggle?.checked ?? defaults.compact,
      quoteAllStrings: this.dom.quoteAllToggle?.checked ?? defaults.quoteAllStrings,
      sortKeys: this.dom.sortKeysToggle?.checked ?? defaults.sortKeys,
      useMultilineBlock: this.dom.multilineToggle?.checked ?? defaults.useMultilineBlock,
      multilineStyle: this.dom.multilineStyle?.value ?? defaults.multilineStyle,
      pretty: this.dom.prettyToggle?.checked ?? defaults.pretty
    };
  }

  syncActions() {
    const hasOutput = this.latestYaml.length > 0;
    const hasInput = Boolean(this.dom.jsonInput.value.trim());
    this.dom.copyBtn.disabled = !hasOutput;
    this.dom.downloadBtn.disabled = !hasOutput;
    this.dom.convertBtn.disabled = this.converting || !hasInput;
    this.dom.clearBtn.disabled = !this.dom.jsonInput.value && !this.latestYaml;
  }

  setStatus(message) {
    if (this.dom.statusText) this.dom.statusText.textContent = message;
  }

  clearError() {
    if (!this.dom.errorBox) return;
    this.dom.errorBox.hidden = true;
    if (this.dom.errorTitle) this.dom.errorTitle.textContent = '';
    if (this.dom.errorDetail) this.dom.errorDetail.textContent = '';
  }

  showError(error) {
    const friendly = toUserFacingError(error);
    if (this.dom.errorTitle) this.dom.errorTitle.textContent = friendly.title;
    if (this.dom.errorDetail) this.dom.errorDetail.textContent = friendly.detail;
    if (this.dom.errorBox) this.dom.errorBox.hidden = false;
    this.setStatus('Fix input errors to continue');
  }

  async run(action = 'convert', input = this.dom.jsonInput.value) {
    if (this.converting) return this.latestYaml;

    this.clearError();
    this.converting = true;
    this.setStatus('Validating JSON…');
    this.syncActions();

    try {
      const { output, stats } = await runJsonToYaml(action, input, this.readOptions());
      this.latestYaml = output;
      this.dom.yamlOutput.value = output;
      if (this.dom.sizeText) {
        this.dom.sizeText.textContent = `${stats.objects.toLocaleString()} object(s) · ${stats.arrays.toLocaleString()} array(s) · ${stats.primitives.toLocaleString()} primitive(s)`;
      }
      this.setStatus('Conversion complete');
      return output;
    } catch (error) {
      this.latestYaml = '';
      this.dom.yamlOutput.value = '';
      if (this.dom.sizeText) this.dom.sizeText.textContent = '0 object(s) · 0 array(s) · 0 primitive(s)';
      this.showError(error);
      throw error;
    } finally {
      this.converting = false;
      this.syncActions();
    }
  }

  clear() {
    this.dom.jsonInput.value = '';
    this.dom.yamlOutput.value = '';
    this.latestYaml = '';
    this.clearError();
    if (this.dom.sizeText) this.dom.sizeText.textContent = '0 object(s) · 0 array(s) · 0 primitive(s)';
    this.setStatus('Cleared');
    this.syncActions();
  }

  bindEvents() {
    this.on(this.dom.convertBtn, 'click', () => { void this.run(); });
    this.on(this.dom.clearBtn, 'click', () => this.clear());
    this.on(this.dom.copyBtn, 'click', async () => {
      if (!this.latestYaml) return;
      await copyText(this.latestYaml);
      this.setStatus('YAML copied to clipboard');
    });
    this.on(this.dom.downloadBtn, 'click', () => {
      if (!this.latestYaml) return;
      downloadYaml(this.latestYaml);
      this.setStatus('YAML downloaded');
    });

    const maybeAutoConvert = () => {
      this.syncActions();
      if (this.dom.autoConvert?.checked && this.dom.jsonInput.value.trim()) {
        void this.run();
      }
    };

    this.on(this.dom.jsonInput, 'input', maybeAutoConvert);
    [this.dom.indentSelect, this.dom.compactToggle, this.dom.quoteAllToggle, this.dom.sortKeysToggle, this.dom.multilineToggle, this.dom.multilineStyle, this.dom.prettyToggle]
      .forEach((control) => this.on(control, 'change', maybeAutoConvert));

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

export function createJsonToYamlApp(root) {
  if (!root) return null;
  if (APP_INSTANCES.has(root)) return APP_INSTANCES.get(root);

  const app = new JsonToYamlApp(root);
  APP_INSTANCES.set(root, app);
  return app;
}
