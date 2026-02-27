import { getKeyboardEventManager } from './keyboard-event-manager.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';
import { assertRunToolExecutionOnly } from './tool-lifecycle-guard.js';

const BASE64_CONFIG = {
  DEBOUNCE_MS: 250,
  LARGE_INPUT_WARNING_BYTES: 1024 * 1024,
  MAX_INPUT_BYTES: 10 * 1024 * 1024,
  AUTO_DECODE_MIN_CHARS: 8
};

const ERROR_TITLES = {
  validation: 'Input validation failed',
  decode: 'Decoding failed',
  system: 'Unexpected error'
};

class Base64ToolError extends Error {
  constructor(title, message, code = 'UNKNOWN') {
    super(message);
    this.name = 'Base64ToolError';
    this.title = title;
    this.code = code;
  }
}

const Base64Validation = {
  sanitize(value) {
    return (value || '').replace(/\s+/g, '');
  },

  normalizeInput(input, allowUrlSafe) {
    const compact = this.sanitize(input);
    if (!compact) {
      throw new Base64ToolError(ERROR_TITLES.validation, 'Please enter a Base64 string to decode.', 'EMPTY_INPUT');
    }

    let normalized = compact;
    if (allowUrlSafe) {
      normalized = normalized.replace(/-/g, '+').replace(/_/g, '/');
    }

    const firstInvalidIndex = normalized.search(/[^A-Za-z0-9+/=]/);
    if (firstInvalidIndex >= 0) {
      throw new Base64ToolError(
        ERROR_TITLES.validation,
        `Invalid Base64 string. Unexpected character at position ${firstInvalidIndex + 1}.`,
        'INVALID_CHARACTER'
      );
    }

    const firstPaddingIndex = normalized.indexOf('=');
    if (firstPaddingIndex !== -1 && /[^=]/.test(normalized.slice(firstPaddingIndex))) {
      throw new Base64ToolError(
        ERROR_TITLES.validation,
        'Invalid Base64 padding. Padding characters must only appear at the end.',
        'INVALID_PADDING_ORDER'
      );
    }

    const missingPadding = normalized.length % 4;
    if (missingPadding) {
      normalized = normalized.padEnd(normalized.length + (4 - missingPadding), '=');
    }

    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
      throw new Base64ToolError(ERROR_TITLES.validation, 'Invalid Base64 structure. Verify the encoded input.', 'INVALID_STRUCTURE');
    }

    return normalized;
  }
};

const Base64Decoder = {
  decode(normalizedBase64) {
    let binary;
    try {
      binary = atob(normalizedBase64);
    } catch {
      throw new Base64ToolError(ERROR_TITLES.decode, 'Corrupted Base64 content could not be decoded.', 'CORRUPTED_INPUT');
    }

    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const textResult = this.tryDecodeText(bytes);

    if (textResult.success) {
      return {
        type: 'text',
        text: textResult.text,
        bytes,
        utf8: true,
        isJson: this.looksLikeJson(textResult.text)
      };
    }

    return {
      type: 'binary',
      bytes,
      byteLength: bytes.length
    };
  },

  tryDecodeText(bytes) {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (this.looksBinary(text)) {
        return { success: false };
      }
      return { success: true, text };
    } catch {
      return { success: false };
    }
  },

  looksBinary(text) {
    if (!text) return false;

    let controlCount = 0;
    for (let i = 0; i < text.length; i += 1) {
      const code = text.charCodeAt(i);
      const isControl = code < 32 && code !== 9 && code !== 10 && code !== 13;
      if (isControl) {
        controlCount += 1;
      }
    }

    return controlCount > Math.max(2, Math.floor(text.length * 0.01));
  },

  looksLikeJson(text) {
    const trimmed = text.trim();
    if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) {
      return false;
    }

    try {
      JSON.parse(trimmed);
      return true;
    } catch {
      return false;
    }
  },

  prettyJson(text) {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  }
};

class Base64DecodeController {
  constructor() {
    this.dom = this.getDom();
    this.state = {
      decoding: false,
      decoded: null,
      debounceTimer: null
    };
    this.disposeKeyboardHandler = () => {};
    this.bindEvents();
    this.refreshUi();
  }

  getDom() {
    return {
      inputEditor: document.getElementById('inputEditor'),
      outputEditor: document.getElementById('outputEditor'),
      runBtn: document.getElementById('runBtn'),
      clearInputBtn: document.getElementById('clearInputBtn'),
      copyBtn: document.getElementById('copyBtn') || document.getElementById('copyOutputBtn'),
      downloadBtn: document.getElementById('downloadBtn'),
      errorMessage: document.getElementById('errorMessage'),
      resultStatus: document.getElementById('resultStatus'),
      outputField: document.getElementById('outputField'),
      outputEmptyState: document.getElementById('outputEmptyState'),
      inputStats: document.getElementById('inputStats'),
      outputStats: document.getElementById('outputStats'),
      payloadSize: document.getElementById('payloadSize'),
      validationState: document.getElementById('validationState'),
      handleUrlSafeCheck: document.getElementById('handleUrlSafeCheck'),
      autoDecodeCheck: document.getElementById('autoDecodeCheck') || document.getElementById('autoDetectCheck'),
      prettyJsonCheck: document.getElementById('prettyJsonCheck'),
      loadSampleBtn: document.getElementById('loadSampleBtn'),
      sampleInput: document.getElementById('sampleInput')
    };
  }

  bindEvents() {
    this.dom.runBtn?.addEventListener('click', () => this.decodeFromInput());
    this.dom.clearInputBtn?.addEventListener('click', () => this.clearInput());
    this.dom.copyBtn?.addEventListener('click', () => this.copyOutput());
    this.dom.downloadBtn?.addEventListener('click', () => this.downloadDecodedFile());
    this.dom.prettyJsonCheck?.addEventListener('change', () => this.renderDecodedOutput());
    this.dom.loadSampleBtn?.addEventListener('click', () => this.loadSample());

    this.dom.inputEditor?.addEventListener('input', () => {
      this.refreshUi();
      if (this.dom.autoDecodeCheck?.checked && this.dom.inputEditor.value.length >= BASE64_CONFIG.AUTO_DECODE_MIN_CHARS) {
        clearTimeout(this.state.debounceTimer);
        this.state.debounceTimer = setTimeout(() => this.decodeFromInput(), BASE64_CONFIG.DEBOUNCE_MS);
      }
    });

    this.disposeKeyboardHandler = getKeyboardEventManager().register({
      root: document.querySelector('.tool-page') || document.body,
      onKeydown: (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        this.decodeFromInput();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        this.clearInput();
      }
      }
    });
  }

  destroy() {
    this.disposeKeyboardHandler();
    this.disposeKeyboardHandler = () => {};
    clearTimeout(this.state.debounceTimer);
  }

  decodeFromInput() {
    if (this.state.decoding) {
      return;
    }

    this.clearError();

    try {
      this.state.decoding = true;
      this.updateStatus('Decoding…', 'warning');

      const rawInput = this.dom.inputEditor?.value || '';
      if (new TextEncoder().encode(rawInput).length > BASE64_CONFIG.MAX_INPUT_BYTES) {
        throw new Base64ToolError(ERROR_TITLES.validation, 'Input exceeds 10 MB limit. Split the payload and decode in parts.', 'INPUT_TOO_LARGE');
      }

      const normalized = Base64Validation.normalizeInput(rawInput, Boolean(this.dom.handleUrlSafeCheck?.checked));
      const decoded = Base64Decoder.decode(normalized);

      this.state.decoded = decoded;
      this.renderDecodedOutput();
      this.updateStatus('Decoded successfully', 'success');
    } catch (error) {
      this.state.decoded = null;
      this.renderDecodedOutput();
      this.showError(this.normalizeError(error));
      this.updateStatus('Decode failed', 'error');
    } finally {
      this.state.decoding = false;
      this.refreshUi();
    }
  }

  renderDecodedOutput() {
    const decoded = this.state.decoded;

    if (!decoded) {
      this.dom.outputEditor.value = '';
      this.dom.outputField.hidden = true;
      this.dom.outputEmptyState.hidden = false;
      this.dom.downloadBtn.disabled = true;
      this.updateOutputStats('0 chars | 0 B');
      return;
    }

    this.dom.outputField.hidden = false;
    this.dom.outputEmptyState.hidden = true;

    if (decoded.type === 'binary') {
      this.dom.outputEditor.value = `Binary payload detected (${decoded.byteLength.toLocaleString()} bytes). Use Download to save the decoded file safely.`;
      this.dom.downloadBtn.disabled = false;
      this.updateOutputStats(`Binary | ${decoded.byteLength.toLocaleString()} B`);
      return;
    }

    const formatted = this.dom.prettyJsonCheck?.checked && decoded.isJson
      ? Base64Decoder.prettyJson(decoded.text)
      : decoded.text;

    this.dom.outputEditor.value = formatted;
    this.dom.downloadBtn.disabled = false;
    this.updateOutputStats(`${formatted.length.toLocaleString()} chars | ${decoded.bytes.length.toLocaleString()} B`);
  }

  clearInput() {
    if (!this.dom.inputEditor) {
      return;
    }

    this.dom.inputEditor.value = '';
    this.state.decoded = null;
    this.clearError();
    this.updateStatus('Ready', 'idle');
    this.refreshUi();
    this.renderDecodedOutput();
  }

  async copyOutput() {
    const value = this.dom.outputEditor?.value || '';
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      this.updateStatus('Copied output', 'success');
    } catch {
      this.showError({ title: ERROR_TITLES.system, message: 'Clipboard access failed. Copy manually from the output panel.' });
    }
  }

  downloadDecodedFile() {
    if (!this.state.decoded) {
      return;
    }

    const payload = this.state.decoded.type === 'binary'
      ? this.state.decoded.bytes
      : new TextEncoder().encode(this.dom.outputEditor.value);

    const extension = this.state.decoded.type === 'binary' ? 'bin' : 'txt';
    const blob = new Blob([payload], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `decoded-output.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  loadSample() {
    if (!this.dom.sampleInput || !this.dom.inputEditor) {
      return;
    }

    this.dom.inputEditor.value = this.dom.sampleInput.textContent?.trim() || '';
    this.refreshUi();
    this.decodeFromInput();
  }

  normalizeError(error) {
    if (error instanceof Base64ToolError) {
      return { title: error.title, message: error.message };
    }

    return { title: ERROR_TITLES.system, message: 'An unexpected issue occurred while decoding.' };
  }

  showError(error) {
    if (!this.dom.errorMessage) {
      return;
    }

    this.dom.errorMessage.hidden = false;
    this.dom.errorMessage.textContent = '';

    const title = document.createElement('strong');
    title.textContent = error.title;
    const message = document.createElement('p');
    message.textContent = error.message;

    this.dom.errorMessage.append(title, message);
  }

  clearError() {
    if (!this.dom.errorMessage) {
      return;
    }

    this.dom.errorMessage.hidden = true;
    this.dom.errorMessage.textContent = '';
  }

  refreshUi() {
    const input = this.dom.inputEditor?.value || '';
    const inputBytes = new TextEncoder().encode(input).length;
    const hasInput = input.length > 0;

    if (this.dom.inputStats) {
      this.dom.inputStats.textContent = `${input.length.toLocaleString()} chars | ${inputBytes.toLocaleString()} B`;
    }

    if (this.dom.payloadSize) {
      this.dom.payloadSize.textContent = `${inputBytes.toLocaleString()} B`;
    }

    if (this.dom.validationState) {
      this.dom.validationState.textContent = hasInput ? 'Input ready' : 'Waiting for input';
    }

    if (this.dom.runBtn) {
      this.dom.runBtn.disabled = !hasInput || this.state.decoding;
      this.dom.runBtn.setAttribute('aria-busy', String(this.state.decoding));
    }

    if (this.dom.downloadBtn && !this.state.decoded) {
      this.dom.downloadBtn.disabled = true;
    }

    if (inputBytes > BASE64_CONFIG.LARGE_INPUT_WARNING_BYTES) {
      this.showError({
        title: 'Large payload warning',
        message: 'Large input detected. Decoding may take longer. For very large payloads, decode in chunks to keep the UI responsive.'
      });
    }
  }

  updateOutputStats(text) {
    if (this.dom.outputStats) {
      this.dom.outputStats.textContent = text;
    }
  }

  updateStatus(message, state) {
    if (!this.dom.resultStatus) {
      return;
    }

    const cssState = state || 'idle';
    this.dom.resultStatus.className = `result-indicator result-indicator--${cssState}`;
    this.dom.resultStatus.textContent = message;
  }
}

export function runTool(action, input, options = {}) {
  assertRunToolExecutionOnly(TOOL_ID, action, input, options);
  if (action !== 'decode') {
    throw new Base64ToolError(ERROR_TITLES.validation, `Unsupported action: ${action}`, 'UNSUPPORTED_ACTION');
  }

  const normalized = Base64Validation.normalizeInput(input, options.urlSafe ?? true);
  return Base64Decoder.decode(normalized);
}

const TOOL_ID = 'base64-decode';

function resolveRoot(context) {
  const root = context?.root || context?.toolRoot || context;
  return root instanceof Element ? root : null;
}

function requireRuntimeRoot(context) {
  const root = resolveRoot(context);
  if (!root) {
    throw new Error(`[${TOOL_ID}] invalid lifecycle root`);
  }

  return root;
}

export function create(context) {
  const root = requireRuntimeRoot(context);
  if (!root) {
    return null;
  }

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => {
      const controller = new Base64DecodeController();
      window.base64DecodeController = controller;
      return controller;
    },
    destroy: (controller) => {
      controller?.destroy?.();
      if (window.base64DecodeController === controller) {
        delete window.base64DecodeController;
      }
    }
  });
}

export function init(context) {
  const root = requireRuntimeRoot(context);
  const handle = create(root);
  handle?.init();
  return handle;
}

export function destroy(context) {
  const root = requireRuntimeRoot(context);

  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}


