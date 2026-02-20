import { getKeyboardEventManager } from './keyboard-event-manager.js';
import {
  createXmlFormatterError,
  getDefaultXmlFormatterOptions,
  getLargeDocumentThreshold,
  runXmlFormatter
} from './xml-formatter.api.js';
import { getXmlFormatterDom } from './xml-formatter.dom.js';

const APP_INSTANCES = new WeakMap();

function countMetrics(value) {
  const text = value ?? '';
  return {
    lines: text.length ? text.split('\n').length : 0,
    characters: text.length
  };
}

class XmlFormatterApp {
  constructor(root) {
    this.dom = getXmlFormatterDom(root);
    this.disposeHandlers = [];
    this.disposeKeyboardHandler = null;
    this.statusTimer = 0;
    this.state = {
      autoFormat: false,
      isProcessing: false,
      lastOutput: ''
    };

    if (!this.dom?.input || !this.dom?.output || !this.dom?.runButton) {
      return;
    }

    this.initializeUi();
    this.bindEvents();
    this.updateStats();
  }

  initializeUi() {
    if (this.dom.actionSelect) {
      this.dom.actionSelect.value = 'format';
      this.dom.actionSelect.disabled = true;
    }

    if (this.dom.downloadButton) {
      this.dom.downloadButton.textContent = 'Download XML';
    }

    if (this.dom.copyButton) {
      this.dom.copyButton.textContent = 'Copy output';
    }

    if (this.dom.shortcutHint) {
      this.dom.shortcutHint.textContent = 'Shortcuts: Ctrl/Cmd + Enter to format • Ctrl/Cmd + L to clear';
    }
  }

  on(element, eventName, handler) {
    if (!element) return;
    element.addEventListener(eventName, handler);
    this.disposeHandlers.push(() => element.removeEventListener(eventName, handler));
  }

  bindEvents() {
    this.on(this.dom.input, 'input', () => {
      this.updateStats();
      this.dom.runButton.disabled = !this.dom.input.value.trim();
      void this.triggerAutoFormat();
    });

    this.on(this.dom.runButton, 'click', async () => {
      const output = await this.execute('format', this.dom.input.value);
      if (output && output !== 'Valid XML') {
        this.setOutput(output);
      }
    });

    this.on(this.dom.clearButton, 'click', () => this.clearInput());

    this.on(this.dom.autoToggle, 'change', () => {
      this.state.autoFormat = Boolean(this.dom.autoToggle?.checked);
      if (this.state.autoFormat) {
        void this.triggerAutoFormat();
      }
    });

    for (const control of [this.dom.indentStyle, this.dom.prettyToggle, this.dom.compactToggle]) {
      this.on(control, 'change', () => {
        if (this.state.autoFormat) {
          void this.triggerAutoFormat();
        }
      });
    }

    this.disposeKeyboardHandler = getKeyboardEventManager().register({
      root: this.dom.root,
      onKeydown: (event) => {
        if (!(event.ctrlKey || event.metaKey)) {
          return;
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          void this.execute('format', this.dom.input.value).then((output) => {
            if (output && output !== 'Valid XML') {
              this.setOutput(output);
            }
          });
        }

        if (event.key.toLowerCase() === 'l') {
          event.preventDefault();
          this.clearInput();
        }
      }
    });

    this.dom.runButton.disabled = !this.dom.input.value.trim();
  }

  resolveOptions() {
    const indentStyle = this.dom.indentStyle?.value ?? 'spaces-2';
    const prettyPrint = this.dom.prettyToggle?.checked ?? true;
    const compactMode = this.dom.compactToggle?.checked ?? false;

    if (indentStyle === 'tabs') {
      return { ...getDefaultXmlFormatterOptions(), useTabs: true, prettyPrint, compactMode };
    }

    return {
      ...getDefaultXmlFormatterOptions(),
      useTabs: false,
      indentSize: indentStyle === 'spaces-4' ? 4 : 2,
      prettyPrint,
      compactMode
    };
  }

  updateStats(output = this.state.lastOutput) {
    if (!this.dom.stats) return;

    const inputMetrics = countMetrics(this.dom.input.value);
    const outputMetrics = countMetrics(output);

    this.dom.stats.textContent = `Input: ${inputMetrics.lines} lines / ${inputMetrics.characters} chars • Output: ${outputMetrics.lines} lines / ${outputMetrics.characters} chars`;

    if (this.dom.largeFileNotice) {
      this.dom.largeFileNotice.hidden = inputMetrics.characters < getLargeDocumentThreshold();
    }
  }

  setStatus(message, mode = 'idle') {
    if (!this.dom.resultStatus) return;

    this.dom.resultStatus.textContent = message;
    this.dom.resultStatus.classList.remove('result-indicator--idle', 'result-indicator--success', 'result-indicator--error');

    if (mode === 'success') {
      this.dom.resultStatus.classList.add('result-indicator--success');
    } else if (mode === 'error') {
      this.dom.resultStatus.classList.add('result-indicator--error');
    } else {
      this.dom.resultStatus.classList.add('result-indicator--idle');
    }
  }

  scheduleStatusReset() {
    window.clearTimeout(this.statusTimer);
    this.statusTimer = window.setTimeout(() => this.setStatus('Ready', 'idle'), 1800);
  }

  clearError() {
    if (!this.dom.errorMessage) return;
    this.dom.errorMessage.hidden = true;
    this.dom.errorMessage.textContent = '';
  }

  displayError(error) {
    if (!this.dom.errorMessage) return;

    const location = error?.location?.line
      ? ` (line ${error.location.line}${error.location.column ? `, column ${error.location.column}` : ''})`
      : '';

    this.dom.errorMessage.hidden = false;
    this.dom.errorMessage.textContent = `${error?.title ?? 'XML formatting failed'}: ${error?.message ?? 'Invalid input.'}${location}`;
    this.setStatus('Invalid XML', 'error');
  }

  setOutput(value) {
    this.dom.output.value = value;
    this.state.lastOutput = value;
    this.updateStats(value);
  }

  clearInput() {
    this.dom.input.value = '';
    this.setOutput('');
    this.clearError();
    this.setStatus('Input cleared', 'idle');
    this.dom.runButton.disabled = true;
    this.dom.input.focus();
  }

  async triggerAutoFormat() {
    if (!this.state.autoFormat || this.state.isProcessing || !this.dom.input.value.trim()) {
      return;
    }

    try {
      const output = await runXmlFormatter('format', this.dom.input.value, this.resolveOptions());
      this.setOutput(output);
      this.clearError();
      this.setStatus('Formatted', 'success');
      this.scheduleStatusReset();
    } catch (error) {
      this.displayError(error);
    }
  }

  async execute(action, input) {
    this.state.isProcessing = true;
    this.setStatus('Processing XML…', 'idle');

    try {
      this.clearError();
      const output = await runXmlFormatter(action, input, this.resolveOptions());
      if (output !== 'Valid XML') {
        this.setOutput(output);
        this.setStatus('Formatted', 'success');
      } else {
        this.setStatus('XML is valid', 'success');
      }

      this.scheduleStatusReset();
      return output;
    } catch (error) {
      const safeError = error?.title ? error : createXmlFormatterError('XML formatting failed', 'Please provide well-formed XML.');
      this.displayError(safeError);
      throw new Error(safeError.message);
    } finally {
      this.state.isProcessing = false;
    }
  }

  destroy() {
    this.disposeKeyboardHandler?.();
    this.disposeKeyboardHandler = null;

    while (this.disposeHandlers.length) {
      this.disposeHandlers.pop()?.();
    }

    window.clearTimeout(this.statusTimer);

    if (this.dom.controlsCreated) {
      this.dom.controls?.remove();
    }

    if (this.dom.badgeCreated) {
      this.dom.badge?.remove();
    }

    if (this.dom.toolbarNoteCreated) {
      this.dom.toolbarNote?.remove();
    }

    APP_INSTANCES.delete(this.dom.root);
  }
}

export function createXmlFormatterApp(root) {
  if (!root) {
    return null;
  }

  if (APP_INSTANCES.has(root)) {
    return APP_INSTANCES.get(root);
  }

  const app = new XmlFormatterApp(root);
  APP_INSTANCES.set(root, app);
  return app;
}
