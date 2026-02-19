import { readEncodingConfig, resolveClientRunOptions } from './url-encode.config.js';
import { encodeUrlInput } from './url-encode.engine.js';
import { createToolError, normalizeToolError } from './url-encode.errors.js';
import { KEYBOARD, PROCESSING_LIMITS } from './url-encode.constants.js';
import { normalizeInput } from './url-encode.normalizer.js';
import { createInitialState } from './url-encode.state.js';
import { formatNumber, getByteCount, getCharacterCount, writeClipboard } from './url-encode.utils.js';

class UrlEncodeApp {
  constructor(root) {
    this.root = root;
    this.state = createInitialState();
    this.dom = this.resolveDom(root);

    if (!this.dom.inputEditor || !this.dom.outputEditor) {
      return;
    }

    this.bindEvents();
    this.render();
  }

  resolveDom(root) {
    return {
      inputEditor: root.querySelector('#inputEditor'),
      outputEditor: root.querySelector('#outputEditor'),
      modeSelect: root.querySelector('#modeSelect'),
      plusSpaceToggle: root.querySelector('#plusSpaceToggle'),
      autoEncodeToggle: root.querySelector('#autoEncodeToggle'),
      encodeBtn: root.querySelector('#encodeBtn'),
      clearBtn: root.querySelector('#clearBtn'),
      copyBtn: root.querySelector('#copyBtn'),
      statusText: root.querySelector('#statusText'),
      inputStats: root.querySelector('#inputStats'),
      outputStats: root.querySelector('#outputStats'),
      errorBox: root.querySelector('#errorBox'),
      errorTitle: root.querySelector('#errorTitle'),
      errorMessage: root.querySelector('#errorMessage'),
      errorAction: root.querySelector('#errorAction'),
      loadingState: root.querySelector('#loadingState')
    };
  }

  bindEvents() {
    this.dom.encodeBtn?.addEventListener('click', () => this.runEncode());
    this.dom.clearBtn?.addEventListener('click', () => this.clearAll());
    this.dom.copyBtn?.addEventListener('click', () => void this.copyOutput());
    this.dom.inputEditor?.addEventListener('input', () => this.onInputChanged());
    this.dom.modeSelect?.addEventListener('change', () => this.onConfigChanged());
    this.dom.plusSpaceToggle?.addEventListener('change', () => this.onConfigChanged());
    this.dom.autoEncodeToggle?.addEventListener('change', () => this.onConfigChanged());

    document.addEventListener('keydown', (event) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      if (event.key === KEYBOARD.ENTER) {
        event.preventDefault();
        this.runEncode();
      }

      if (event.key.toLowerCase() === KEYBOARD.KEY_L) {
        event.preventDefault();
        this.clearAll();
      }
    });
  }

  onInputChanged() {
    this.renderStats();

    if (this.shouldAutoEncode()) {
      this.runEncode();
      return;
    }

    this.updateButtons();
  }

  onConfigChanged() {
    if (this.shouldAutoEncode() && this.hasInput()) {
      this.runEncode();
      return;
    }

    this.updateButtons();
  }

  shouldAutoEncode() {
    return Boolean(this.dom.autoEncodeToggle?.checked);
  }

  hasInput() {
    return normalizeInput(this.dom.inputEditor.value).length > 0;
  }

  setProcessing(isProcessing) {
    this.state.isProcessing = isProcessing;
    this.dom.loadingState.hidden = !isProcessing;
    this.dom.encodeBtn.textContent = isProcessing ? 'Encoding…' : 'Encode';
    this.updateButtons();
  }

  runEncode() {
    if (this.state.isProcessing) {
      return;
    }

    const source = normalizeInput(this.dom.inputEditor.value);
    if (!source) {
      this.showError(createToolError('Input required', 'Enter a value to URL encode.', 'Provide text in the input panel and run encode again.'));
      this.state.output = '';
      this.dom.outputEditor.value = '';
      this.render();
      return;
    }

    this.clearError();
    this.setProcessing(true);

    try {
      const config = readEncodingConfig(this.dom);
      this.state.output = encodeUrlInput(source, config);
      this.dom.outputEditor.value = this.state.output;
      this.setStatus('Encoded successfully');
    } catch (error) {
      this.state.output = '';
      this.dom.outputEditor.value = '';
      this.showError(normalizeToolError(error));
    } finally {
      this.setProcessing(false);
      this.renderStats();
    }
  }

  clearAll() {
    this.dom.inputEditor.value = '';
    this.dom.outputEditor.value = '';
    this.state.output = '';
    this.clearError();
    this.setStatus('Cleared');
    this.render();
  }

  async copyOutput() {
    if (!this.state.output) {
      return;
    }

    try {
      await writeClipboard(this.state.output);
      this.setStatus('Copied output');
    } catch {
      this.showError(createToolError('Copy failed', 'Clipboard write was blocked by the browser.', 'Copy output manually from the output panel.'));
    }
  }

  updateButtons() {
    const hasInput = this.hasInput();
    const hasOutput = this.state.output.length > 0;
    const disabledForProcessing = this.state.isProcessing;

    this.dom.encodeBtn.disabled = !hasInput || disabledForProcessing;
    this.dom.clearBtn.disabled = !hasInput && !hasOutput;
    this.dom.copyBtn.disabled = !hasOutput || disabledForProcessing;
  }

  renderStats() {
    const inputValue = this.dom.inputEditor.value;
    const outputValue = this.state.output;

    const inputChars = getCharacterCount(inputValue);
    const inputBytes = getByteCount(inputValue);
    const outputChars = getCharacterCount(outputValue);

    this.dom.inputStats.textContent = `${formatNumber(inputChars)} chars · ${formatNumber(inputBytes)} bytes`;
    this.dom.outputStats.textContent = `${formatNumber(outputChars)} chars`;

    if (inputChars > PROCESSING_LIMITS.warningChars) {
      this.setStatus('Large input detected. Processing may take longer.');
    }
  }

  setStatus(message) {
    this.dom.statusText.textContent = message;
  }

  clearError() {
    this.dom.errorBox.hidden = true;
    this.dom.errorTitle.textContent = '';
    this.dom.errorMessage.textContent = '';
    this.dom.errorAction.textContent = '';
  }

  showError(error) {
    this.dom.errorBox.hidden = false;
    this.dom.errorTitle.textContent = error.title;
    this.dom.errorMessage.textContent = error.message;
    this.dom.errorAction.textContent = error.action;
    this.setStatus('Error');
  }

  render() {
    this.renderStats();
    this.updateButtons();
  }
}

export function createUrlEncoderApp(root) {
  return new UrlEncodeApp(root);
}

export function runClientUrlEncode(input, options = {}) {
  const normalized = normalizeInput(input);
  if (!normalized) {
    throw new Error('Input must not be empty.');
  }

  return encodeUrlInput(normalized, resolveClientRunOptions(options));
}
