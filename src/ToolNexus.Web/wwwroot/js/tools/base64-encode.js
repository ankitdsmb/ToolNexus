const LIMITS = {
  warningBytes: 5 * 1024 * 1024,
  maxBytes: 10 * 1024 * 1024,
  chunkBytes: 0x8000
};

const TEXT_MODE = 'text';
const FILE_MODE = 'file';

const encoder = new TextEncoder();

function normalizeTextInput(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function toBase64FromBytes(bytes) {
  const segments = [];
  for (let i = 0; i < bytes.length; i += LIMITS.chunkBytes) {
    const chunk = bytes.subarray(i, i + LIMITS.chunkBytes);
    segments.push(String.fromCharCode(...chunk));
  }

  return btoa(segments.join(''));
}

function toUrlSafeBase64(base64, removePadding) {
  const replaced = base64.replace(/\+/g, '-').replace(/\//g, '_');
  return removePadding ? replaced.replace(/=+$/, '') : replaced;
}

function encodeTextToBase64(text) {
  const bytes = encoder.encode(text);
  return {
    bytes,
    base64: toBase64FromBytes(bytes)
  };
}

function encodeBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  return {
    bytes,
    base64: toBase64FromBytes(bytes)
  };
}

function applyEncodingOptions(base64, options) {
  if (options.urlSafe) {
    return toUrlSafeBase64(base64, options.removePadding);
  }

  if (options.removePadding) {
    return base64.replace(/=+$/, '');
  }

  return base64;
}

function createError(title, message, action) {
  return { title, message, action };
}

class Base64EncodeApp {
  constructor() {
    this.dom = this.getDom();
    this.state = {
      mode: TEXT_MODE,
      currentFile: null,
      output: '',
      loading: false
    };

    if (!this.dom.inputEditor || !this.dom.outputEditor) {
      return;
    }

    this.bindEvents();
    this.updateUiState();
  }

  getDom() {
    return {
      textModeBtn: document.getElementById('textModeBtn'),
      fileModeBtn: document.getElementById('fileModeBtn'),
      dropZone: document.getElementById('dropZone'),
      fileInput: document.getElementById('fileInput'),
      inputEditor: document.getElementById('inputEditor'),
      outputEditor: document.getElementById('outputEditor'),
      urlSafeToggle: document.getElementById('urlSafeToggle'),
      removePaddingToggle: document.getElementById('removePaddingToggle'),
      autoEncodeToggle: document.getElementById('autoEncodeToggle'),
      encodeBtn: document.getElementById('encodeBtn'),
      clearBtn: document.getElementById('clearBtn'),
      copyBtn: document.getElementById('copyBtn'),
      downloadBtn: document.getElementById('downloadBtn'),
      loadingState: document.getElementById('loadingState'),
      warningBanner: document.getElementById('warningBanner'),
      errorBox: document.getElementById('errorBox'),
      errorTitle: document.getElementById('errorTitle'),
      errorMessage: document.getElementById('errorMessage'),
      errorAction: document.getElementById('errorAction'),
      statusText: document.getElementById('statusText'),
      inputMeta: document.getElementById('inputMeta')
    };
  }

  bindEvents() {
    this.dom.textModeBtn?.addEventListener('click', () => this.setMode(TEXT_MODE));
    this.dom.fileModeBtn?.addEventListener('click', () => this.setMode(FILE_MODE));
    this.dom.dropZone?.addEventListener('click', () => this.dom.fileInput?.click());
    this.dom.fileInput?.addEventListener('change', (event) => this.onFileSelected(event.target.files?.[0]));

    this.dom.dropZone?.addEventListener('dragover', (event) => {
      event.preventDefault();
      this.dom.dropZone.classList.add('is-dragover');
    });

    this.dom.dropZone?.addEventListener('dragleave', () => this.dom.dropZone.classList.remove('is-dragover'));
    this.dom.dropZone?.addEventListener('drop', (event) => {
      event.preventDefault();
      this.dom.dropZone.classList.remove('is-dragover');
      this.onFileSelected(event.dataTransfer?.files?.[0]);
    });

    this.dom.encodeBtn?.addEventListener('click', () => this.runEncode());
    this.dom.clearBtn?.addEventListener('click', () => this.clearAll());
    this.dom.copyBtn?.addEventListener('click', () => this.copyOutput());
    this.dom.downloadBtn?.addEventListener('click', () => this.downloadOutput());

    this.dom.inputEditor?.addEventListener('input', () => {
      this.updateUiState();
      if (this.dom.autoEncodeToggle?.checked) {
        void this.runEncode();
      }
    });

    this.dom.urlSafeToggle?.addEventListener('change', () => this.reencodeOutput());
    this.dom.removePaddingToggle?.addEventListener('change', () => this.reencodeOutput());

    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        void this.runEncode();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        this.clearAll();
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

    if (file.size > LIMITS.maxBytes) {
      this.showError(createError('File too large', `Selected file is ${formatBytes(file.size)}.`, `Use a file smaller than ${formatBytes(LIMITS.maxBytes)}.`));
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

        const textBytes = encoder.encode(normalized).length;
        if (textBytes > LIMITS.maxBytes) {
          throw createError('Input too large', `Text size is ${formatBytes(textBytes)}.`, `Reduce the text size below ${formatBytes(LIMITS.maxBytes)}.`);
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
    const textBytes = encoder.encode(this.dom.inputEditor.value || '').length;
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

    if (activeBytes > LIMITS.warningBytes) {
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
}

export async function runTool(action, input, options = {}) {
  if (action !== 'encode') {
    throw new Error(`Action '${action}' is not supported for client-side execution.`);
  }

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

document.addEventListener('DOMContentLoaded', () => {
  new Base64EncodeApp();
});
