import { getKeyboardEventManager } from './keyboard-event-manager.js';
import {
  applyEncodingOptions,
  createError,
  encodeBufferToBase64,
  encodeTextToBase64,
  formatBytes,
  getInputByteLength,
  getLimits,
  normalizeTextInput
} from './base64-encode.api.js';
import { getBase64EncodeDom } from './base64-encode.dom.js';

const TEXT_MODE = 'text';
const FILE_MODE = 'file';
const APP_INSTANCES = new WeakMap();

class Base64EncodeApp {
  constructor(root) {
    this.dom = getBase64EncodeDom(root);
    this.disposeHandlers = [];
    this.disposeKeyboardHandler = null;
    this.state = {
      mode: TEXT_MODE,
      currentFile: null,
      output: '',
      loading: false
    };

    if (!this.dom?.inputEditor || !this.dom?.outputEditor) {
      return;
    }

    this.bindEvents();
    this.updateUiState();
  }

  on(element, eventName, handler, options) {
    if (!element) {
      return;
    }

    element.addEventListener(eventName, handler, options);
    this.disposeHandlers.push(() => element.removeEventListener(eventName, handler, options));
  }

  bindEvents() {
    this.on(this.dom.textModeBtn, 'click', () => this.setMode(TEXT_MODE));
    this.on(this.dom.fileModeBtn, 'click', () => this.setMode(FILE_MODE));
    this.on(this.dom.dropZone, 'click', () => this.dom.fileInput?.click());
    this.on(this.dom.fileInput, 'change', (event) => this.onFileSelected(event.target.files?.[0]));

    this.on(this.dom.dropZone, 'dragover', (event) => {
      event.preventDefault();
      this.dom.dropZone.classList.add('is-dragover');
    });

    this.on(this.dom.dropZone, 'dragleave', () => this.dom.dropZone.classList.remove('is-dragover'));
    this.on(this.dom.dropZone, 'drop', (event) => {
      event.preventDefault();
      this.dom.dropZone.classList.remove('is-dragover');
      this.onFileSelected(event.dataTransfer?.files?.[0]);
    });

    this.on(this.dom.encodeBtn, 'click', () => this.runEncode());
    this.on(this.dom.clearBtn, 'click', () => this.clearAll());
    this.on(this.dom.copyBtn, 'click', () => this.copyOutput());
    this.on(this.dom.downloadBtn, 'click', () => this.downloadOutput());

    this.on(this.dom.inputEditor, 'input', () => {
      this.updateUiState();
      if (this.dom.autoEncodeToggle?.checked) {
        void this.runEncode();
      }
    });

    this.on(this.dom.urlSafeToggle, 'change', () => this.reencodeOutput());
    this.on(this.dom.removePaddingToggle, 'change', () => this.reencodeOutput());

    this.disposeKeyboardHandler = getKeyboardEventManager().register({
      root: this.dom.root,
      onKeydown: (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          void this.runEncode();
        }

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
          event.preventDefault();
          this.clearAll();
        }
      }
    });
  }

  setMode(mode) {
    this.state.mode = mode;
    this.state.currentFile = null;
    this.dom.fileInput.value = '';
    this.clearError();

    const isText = mode === TEXT_MODE;
    this.dom.textModeBtn.classList.toggle('is-active', isText);
    this.dom.fileModeBtn.classList.toggle('is-active', !isText);
    this.dom.textModeBtn.setAttribute('aria-checked', String(isText));
    this.dom.fileModeBtn.setAttribute('aria-checked', String(!isText));
    this.dom.dropZone.hidden = isText;
    this.dom.inputEditor.disabled = !isText;
    this.dom.inputEditor.placeholder = isText ? 'Paste or type content to encode' : 'File mode selected';

    this.updateUiState();
  }

  async onFileSelected(file) {
    if (!file) return;

    this.state.currentFile = null;
    this.clearError();

    const limits = getLimits();
    if (file.size > limits.maxBytes) {
      this.showError(createError('File too large', `Selected file is ${formatBytes(file.size)}.`, `Use a file smaller than ${formatBytes(limits.maxBytes)}.`));
      return;
    }

    this.state.currentFile = file;
    this.setStatus(`File loaded: ${file.name}`);
    this.updateUiState();

    if (this.dom.autoEncodeToggle?.checked) {
      await this.runEncode();
    }
  }

  getOptions() {
    return {
      urlSafe: Boolean(this.dom.urlSafeToggle?.checked),
      removePadding: Boolean(this.dom.removePaddingToggle?.checked)
    };
  }

  async runEncode() {
    if (this.state.loading) return;

    this.setLoading(true);
    this.clearError();

    try {
      const options = this.getOptions();
      let encodeResult;

      if (this.state.mode === TEXT_MODE) {
        const normalized = normalizeTextInput(this.dom.inputEditor.value);
        if (!normalized) {
          throw createError('Input required', 'Enter text to encode.', 'Provide text or switch to File mode and upload a file.');
        }

        const limits = getLimits();
        const textBytes = getInputByteLength(normalized);
        if (textBytes > limits.maxBytes) {
          throw createError('Input too large', `Text size is ${formatBytes(textBytes)}.`, `Reduce the text size below ${formatBytes(limits.maxBytes)}.`);
        }

        this.dom.inputEditor.value = normalized;
        encodeResult = encodeTextToBase64(normalized);
      } else {
        if (!this.state.currentFile) {
          throw createError('File required', 'No file selected.', 'Drop a file or click the upload area to select one.');
        }

        const buffer = await this.state.currentFile.arrayBuffer();
        encodeResult = encodeBufferToBase64(buffer);
      }

      this.state.output = applyEncodingOptions(encodeResult.base64, options);
      this.dom.outputEditor.value = this.state.output;
      this.setStatus(`Encoded ${formatBytes(encodeResult.bytes.length)} successfully`);
    } catch (error) {
      this.showError(this.normalizeError(error));
    } finally {
      this.setLoading(false);
      this.updateUiState();
    }
  }

  reencodeOutput() {
    if (!this.dom.autoEncodeToggle?.checked) {
      return;
    }

    void this.runEncode();
  }

  async copyOutput() {
    if (!this.state.output) return;

    try {
      await navigator.clipboard.writeText(this.state.output);
      this.setStatus('Output copied to clipboard');
    } catch {
      this.showError(createError('Copy failed', 'Could not write to clipboard.', 'Copy manually from the output area.'));
    }
  }

  downloadOutput() {
    if (!this.state.output) return;

    const blob = new Blob([this.state.output], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'base64-output.txt';
    link.click();
    URL.revokeObjectURL(link.href);
    this.setStatus('Download started');
  }

  clearAll() {
    this.dom.inputEditor.value = '';
    this.dom.outputEditor.value = '';
    this.dom.warningBanner.hidden = true;
    this.state.output = '';
    this.state.currentFile = null;
    if (this.dom.fileInput) {
      this.dom.fileInput.value = '';
    }

    this.clearError();
    this.setStatus('Ready');
    this.updateUiState();
  }

  updateUiState() {
    const textBytes = getInputByteLength(this.dom.inputEditor.value);
    const fileBytes = this.state.currentFile?.size ?? 0;
    const activeBytes = this.state.mode === TEXT_MODE ? textBytes : fileBytes;
    const modeLabel = this.state.mode === TEXT_MODE ? 'Text mode' : 'File mode';

    this.dom.inputMeta.textContent = `${modeLabel} · ${formatBytes(activeBytes)}`;

    const hasInput = this.state.mode === TEXT_MODE
      ? normalizeTextInput(this.dom.inputEditor.value).length > 0
      : Boolean(this.state.currentFile);

    this.dom.encodeBtn.disabled = !hasInput || this.state.loading;
    this.dom.clearBtn.disabled = !hasInput && !this.state.output;
    this.dom.copyBtn.disabled = !this.state.output;
    this.dom.downloadBtn.disabled = !this.state.output;

    const limits = getLimits();
    if (activeBytes > limits.warningBytes) {
      this.dom.warningBanner.hidden = false;
      this.dom.warningBanner.textContent = `Large input detected (${formatBytes(activeBytes)}). Auto-encode is disabled to protect responsiveness.`;
      if (this.dom.autoEncodeToggle.checked) {
        this.dom.autoEncodeToggle.checked = false;
      }
    } else {
      this.dom.warningBanner.hidden = true;
    }
  }

  setLoading(isLoading) {
    this.state.loading = isLoading;
    this.dom.loadingState.hidden = !isLoading;
    this.dom.encodeBtn.textContent = isLoading ? 'Encoding…' : 'Encode';
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

  normalizeError(error) {
    if (error?.title && error?.message && error?.action) {
      return error;
    }

    return createError('Encoding failed', 'The input could not be encoded.', 'Review your input and try again.');
  }

  destroy() {
    this.disposeKeyboardHandler?.();
    this.disposeKeyboardHandler = null;

    while (this.disposeHandlers.length > 0) {
      const dispose = this.disposeHandlers.pop();
      dispose?.();
    }

    APP_INSTANCES.delete(this.dom.root);
  }
}

export function createBase64EncodeApp(root) {
  if (!root) {
    return null;
  }

  if (APP_INSTANCES.has(root)) {
    return APP_INSTANCES.get(root);
  }

  const app = new Base64EncodeApp(root);
  APP_INSTANCES.set(root, app);
  return app;
}

export async function runClientBase64Encode(input, options = {}) {
  const normalized = normalizeTextInput(input);
  if (!normalized) {
    throw new Error('Input must not be empty.');
  }

  const { base64 } = encodeTextToBase64(normalized);
  return applyEncodingOptions(base64, {
    urlSafe: Boolean(options.urlSafe),
    removePadding: Boolean(options.removePadding)
  });
}
