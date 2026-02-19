// base64-decode.js - Enhanced Base64 Decoder

const CONFIG = {
  MAX_INPUT_SIZE_BYTES: 10 * 1024 * 1024, // 10MB max input
  PERFORMANCE_THRESHOLD_MS: 100,
  DEBOUNCE_DELAY_MS: 300,
  SUPPORTED_ACTIONS: ['decode', 'encode', 'validate']
};

const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]*$/;

class Base64Decoder {
  constructor() {
    this.dom = this.initializeDOM();
    this.state = {
      isProcessing: false,
      abortController: null,
      performanceMetrics: {}
    };

    this.init();
  }

  initializeDOM() {
    const elements = [
      'actionSelect', 'runBtn', 'copyBtn', 'downloadBtn', 'shareBtn',
      'inputEditor', 'outputEditor', 'errorMessage', 'resultStatus',
      'outputEmptyState', 'outputField', 'toastRegion'
    ];

    return elements.reduce((acc, id) => {
      acc[id] = document.getElementById(id);
      return acc;
    }, {});
  }

  init() {
    if (!this.dom.inputEditor || !this.dom.outputEditor) {
      console.error('Required DOM elements not found');
      return;
    }

    this.bindEvents();
    this.setupKeyboardShortcuts();
    this.setupTextareaAutoResize();
    this.updateUxLayer();

    // Initial validation
    this.validateInput();
  }

  bindEvents() {
    // Run button
    this.dom.runBtn?.addEventListener('click', () => this.runAction());

    // Copy button
    this.dom.copyBtn?.addEventListener('click', () => this.copyOutput());

    // Download button
    this.dom.downloadBtn?.addEventListener('click', () => this.downloadOutput());

    // Share button
    this.dom.shareBtn?.addEventListener('click', () => this.shareOutput());

    // Input handling with debounce
    let debounceTimer;
    this.dom.inputEditor?.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.validateInput();
        this.autoResizeTextarea(this.dom.inputEditor);
      }, CONFIG.DEBOUNCE_DELAY_MS);
    });

    // Action change
    this.dom.actionSelect?.addEventListener('change', () => {
      this.updateRunButtonLabel();
      this.validateInput();
    });

    // Sample data click
    const sampleInput = document.getElementById('sampleInput');
    if (sampleInput) {
      sampleInput.addEventListener('click', () => {
        this.dom.inputEditor.value = sampleInput.textContent;
        this.validateInput();
        this.showToast('Sample data loaded', 'info');
      });
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Enter or Cmd+Enter to run
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.runAction();
      }

      // Ctrl+Shift+C to copy output
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        this.copyOutput();
      }

      // Ctrl+Shift+D to download
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.downloadOutput();
      }
    });
  }

  setupTextareaAutoResize() {
    if (this.dom.inputEditor) {
      this.dom.inputEditor.style.minHeight = '200px';
      this.dom.inputEditor.style.resize = 'vertical';
      this.autoResizeTextarea(this.dom.inputEditor);
    }

    if (this.dom.outputEditor) {
      this.dom.outputEditor.style.minHeight = '200px';
      this.dom.outputEditor.style.resize = 'vertical';
    }
  }

  autoResizeTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 500) + 'px';
  }

  async runAction() {
    if (this.state.isProcessing) {
      this.showToast('Already processing, please wait...', 'warning');
      return;
    }

    const start = performance.now();
    const action = this.dom.actionSelect?.value;

    if (!CONFIG.SUPPORTED_ACTIONS.includes(action)) {
      this.showError(`Action '${action}' is not supported.`);
      return;
    }

    this.setProcessingState(true);
    this.clearError();

    try {
      const input = this.dom.inputEditor.value;

      if (!input) {
        this.showToast('Please enter some text to process', 'warning');
        this.setProcessingState(false);
        return;
      }

      // Check input size
      if (input.length > CONFIG.MAX_INPUT_SIZE_BYTES) {
        throw new Error(`Input too large. Maximum size is ${this.formatBytes(CONFIG.MAX_INPUT_SIZE_BYTES)}`);
      }

      let output;

      if (action === 'decode') {
        output = await this.decodeBase64(input);
        this.showResult(`Decoded ${this.formatBytes(input.length)} successfully`);
      } else if (action === 'encode') {
        output = await this.encodeBase64(input);
        this.showResult(`Encoded ${this.formatBytes(input.length)} successfully`);
      } else if (action === 'validate') {
        const isValid = this.validateBase64(input);
        if (isValid) {
          this.showResult('✓ Valid Base64 string', 'success');
        } else {
          throw new Error('Invalid Base64 format');
        }
        this.setProcessingState(false);
        this.recordPerformance(action, start);
        return;
      }

      // Display output
      this.displayOutput(output);

      // Record performance
      this.recordPerformance(action, start);

      // Update UX layer
      this.addToHistory({ action, input, output });

    } catch (error) {
      this.handleError(error);
      this.recordPerformance('error', start);
    } finally {
      this.setProcessingState(false);
    }
  }

  async decodeBase64(input) {
    try {
      // Sanitize input
      const sanitized = this.sanitizeBase64Input(input);

      // Validate
      if (!this.isValidBase64(sanitized)) {
        throw new Error('Invalid Base64 input format');
      }

      // Decode
      const binary = atob(sanitized);
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));

      // Try UTF-8 decoding first
      try {
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch {
        // Fall back to Latin-1 if UTF-8 fails
        return this.decodeLatin1(bytes);
      }

    } catch (error) {
      throw new Error(`Decoding failed: ${error.message}`);
    }
  }

  async encodeBase64(input) {
    try {
      // Convert to bytes
      const bytes = new TextEncoder().encode(input);

      // Convert to Base64 in chunks for large inputs
      let binary = '';
      const chunkSize = 1024 * 1024; // 1MB chunks

      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);

        // Show progress for large files
        if (bytes.length > chunkSize) {
          const percent = i / bytes.length;
          this.updateRunButtonProgress(percent);
        }
      }

      return btoa(binary);

    } catch (error) {
      throw new Error(`Encoding failed: ${error.message}`);
    }
  }

  validateBase64(input) {
    const sanitized = this.sanitizeBase64Input(input);
    return this.isValidBase64(sanitized);
  }

  validateInput() {
    const input = this.dom.inputEditor.value;
    const action = this.dom.actionSelect?.value;

    if (!input) {
      this.updateValidationState('idle', 'No input');
      return;
    }

    if (action === 'validate' || action === 'decode') {
      const isValid = this.isValidBase64(this.sanitizeBase64Input(input));
      this.updateValidationState(
        isValid ? 'success' : 'error',
        isValid ? '✓ Valid Base64' : '✗ Invalid Base64'
      );
    } else {
      this.updateValidationState('idle', 'Ready to encode');
    }
  }

  isValidBase64(input) {
    const sanitized = this.sanitizeBase64Input(input);

    if (sanitized.length === 0) return false;

    // Check length is multiple of 4 (optional, some implementations are lenient)
    // if (sanitized.length % 4 !== 0) return false;

    // Check pattern
    if (!BASE64_PATTERN.test(sanitized)) return false;

    // Validate padding
    const padding = sanitized.match(/=+$/);
    if (padding) {
      const paddingLength = padding[0].length;
      if (paddingLength > 2) return false;
    }

    return true;
  }

  sanitizeBase64Input(input) {
    if (typeof input !== 'string') return '';

    // Remove whitespace and line breaks
    let sanitized = input.replace(/\s+/g, '');

    // Check if it might be Base64URL
    if (BASE64URL_PATTERN.test(sanitized) && !sanitized.includes('/') && !sanitized.includes('+')) {
      sanitized = this.fromBase64URL(sanitized);
    }

    return sanitized;
  }

  fromBase64URL(base64url) {
    let base64 = base64url
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }

    return base64;
  }

  decodeLatin1(bytes) {
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
      result += String.fromCharCode(bytes[i]);
    }
    return result;
  }

  displayOutput(output) {
    if (!this.dom.outputEditor) return;

    this.dom.outputEditor.value = output;
    this.autoResizeTextarea(this.dom.outputEditor);

    // Show output field, hide empty state
    if (this.dom.outputEmptyState) {
      this.dom.outputEmptyState.hidden = true;
    }
    if (this.dom.outputField) {
      this.dom.outputField.hidden = false;
    }

    // Update result status
    if (this.dom.resultStatus) {
      this.dom.resultStatus.textContent = 'Output ready';
      this.dom.resultStatus.className = 'result-indicator result-indicator--success';
    }
  }

  showResult(message, type = 'success') {
    if (this.dom.resultStatus) {
      this.dom.resultStatus.textContent = message;
      this.dom.resultStatus.className = `result-indicator result-indicator--${type}`;
    }
    this.showToast(message, type);
  }

  updateValidationState(state, message) {
    if (!this.dom.resultStatus) return;

    const stateClasses = {
      idle: 'result-indicator--idle',
      success: 'result-indicator--success',
      error: 'result-indicator--error',
      warning: 'result-indicator--warning'
    };

    this.dom.resultStatus.textContent = message;
    this.dom.resultStatus.className = `result-indicator ${stateClasses[state] || stateClasses.idle}`;
  }

  updateRunButtonLabel() {
    if (!this.dom.runBtn) return;
    const action = this.dom.actionSelect?.value;
    const label = action.charAt(0).toUpperCase() + action.slice(1);
    const btnLabel = this.dom.runBtn.querySelector('.tool-btn__label');
    if (btnLabel) {
      btnLabel.dataset.defaultLabel = label;
      btnLabel.textContent = this.state.isProcessing ? 'Running…' : label;
    }
  }

  updateRunButtonProgress(percent) {
    if (!this.dom.runBtn) return;
    const progress = Math.round(percent * 100);
    this.dom.runBtn.style.background = `linear-gradient(90deg, var(--primary-color) ${progress}%, transparent ${progress}%)`;
  }

  setProcessingState(isProcessing) {
    this.state.isProcessing = isProcessing;

    if (this.dom.runBtn) {
      this.dom.runBtn.ariaBusy = String(isProcessing);
      const btnLabel = this.dom.runBtn.querySelector('.tool-btn__label');
      if (btnLabel) {
        btnLabel.textContent = isProcessing ? 'Running…' : this.dom.actionSelect?.value;
      }
    }

    // Disable other buttons while processing
    if (this.dom.copyBtn) this.dom.copyBtn.disabled = isProcessing;
    if (this.dom.downloadBtn) this.dom.downloadBtn.disabled = isProcessing;
    if (this.dom.shareBtn) this.dom.shareBtn.disabled = isProcessing;
  }

  async copyOutput() {
    const output = this.dom.outputEditor?.value;

    if (!output) {
      this.showToast('No output to copy', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      this.showCopyFeedback(true);
      this.showToast('Copied to clipboard!', 'success');
    } catch (error) {
      this.showCopyFeedback(false);
      this.showToast('Failed to copy: ' + error.message, 'error');
    }
  }

  showCopyFeedback(success) {
    if (!this.dom.copyBtn) return;

    this.dom.copyBtn.classList.add(success ? 'copy-success' : 'copy-error');

    setTimeout(() => {
      this.dom.copyBtn.classList.remove('copy-success', 'copy-error');
    }, 450);
  }

  async downloadOutput() {
    const output = this.dom.outputEditor?.value;

    if (!output) {
      this.showToast('No output to download', 'warning');
      return;
    }

    try {
      const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const action = this.dom.actionSelect?.value || 'decode';
      a.download = `base64-${action}-${timestamp}.txt`;
      a.href = url;
      a.click();

      URL.revokeObjectURL(url);
      this.showToast('Download started', 'success');
    } catch (error) {
      this.showToast('Download failed: ' + error.message, 'error');
    }
  }

  async shareOutput() {
    const output = this.dom.outputEditor?.value;

    if (!output) {
      this.showToast('No output to share', 'warning');
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Base64 Decoder Output',
          text: output
        });
        this.showToast('Shared successfully', 'success');
      } catch (error) {
        if (error.name !== 'AbortError') {
          this.showToast('Share failed: ' + error.message, 'error');
        }
      }
    } else {
      // Fallback: copy to clipboard
      this.copyOutput();
    }
  }

  updateUxLayer() {
    this.updatePinnedRecent();
    this.updateHistory();
    this.updateCollections();
  }

  updatePinnedRecent() {
    const container = document.getElementById('uxPinnedRecent');
    if (!container) return;

    const recent = this.getFromStorage('recent', []);
    const pinned = this.getFromStorage('pinned', []);

    const items = [...pinned, ...recent.slice(0, 5 - pinned.length)];

    container.innerHTML = items.map(item => `
      <li class="ux-list__item" data-id="${item.id}">
        <span class="ux-list__item-title">${item.title}</span>
        <button class="ux-list__item-action" onclick="base64Decoder.loadItem('${item.id}')">Load</button>
      </li>
    `).join('');
  }

  updateHistory() {
    const container = document.getElementById('uxHistory');
    if (!container) return;

    const history = this.getFromStorage('history', []);

    container.innerHTML = history.slice(0, 10).map(item => `
      <li class="ux-list__item" data-id="${item.id}">
        <span class="ux-list__item-title">${item.action}: ${item.input.substring(0, 30)}...</span>
        <button class="ux-list__item-action" onclick="base64Decoder.loadHistoryItem('${item.id}')">Restore</button>
      </li>
    `).join('');
  }

  updateCollections() {
    const container = document.getElementById('uxCollections');
    if (!container) return;

    const collections = this.getFromStorage('collections', []);

    container.innerHTML = collections.map(collection => `
      <li class="ux-list__item">
        <span class="ux-list__item-title">${collection.name}</span>
        <button class="ux-list__item-action" onclick="base64Decoder.loadCollection('${collection.id}')">Load</button>
      </li>
    `).join('');

    // Collection save button
    const saveBtn = document.getElementById('saveCollectionBtn');
    const collectionInput = document.getElementById('collectionNameInput');

    if (saveBtn && collectionInput) {
      saveBtn.onclick = () => this.saveCollection(collectionInput.value);
    }
  }

  addToHistory({ action, input, output }) {
    const history = this.getFromStorage('history', []);

    const item = {
      id: Date.now().toString(),
      action,
      input,
      output,
      timestamp: new Date().toISOString()
    };

    history.unshift(item);

    // Keep only last 50 items
    if (history.length > 50) {
      history.pop();
    }

    this.saveToStorage('history', history);
    this.updateHistory();
  }

  saveCollection(name) {
    if (!name.trim()) {
      this.showToast('Please enter a collection name', 'warning');
      return;
    }

    const collections = this.getFromStorage('collections', []);
    const currentConfig = {
      action: this.dom.actionSelect?.value,
      input: this.dom.inputEditor?.value
    };

    collections.push({
      id: Date.now().toString(),
      name: name.trim(),
      config: currentConfig,
      timestamp: new Date().toISOString()
    });

    this.saveToStorage('collections', collections);
    this.updateCollections();
    this.showToast(`Saved to collection: ${name}`, 'success');

    // Clear input
    document.getElementById('collectionNameInput').value = '';
  }

  loadItem(id) {
    // Implement loading pinned/recent items
    this.showToast('Loading item...', 'info');
  }

  loadHistoryItem(id) {
    const history = this.getFromStorage('history', []);
    const item = history.find(h => h.id === id);

    if (item) {
      this.dom.inputEditor.value = item.input;
      if (this.dom.actionSelect) {
        this.dom.actionSelect.value = item.action;
      }
      this.validateInput();
      this.showToast('History item loaded', 'success');
    }
  }

  loadCollection(id) {
    const collections = this.getFromStorage('collections', []);
    const collection = collections.find(c => c.id === id);

    if (collection?.config) {
      if (this.dom.actionSelect && collection.config.action) {
        this.dom.actionSelect.value = collection.config.action;
      }
      if (collection.config.input) {
        this.dom.inputEditor.value = collection.config.input;
      }
      this.validateInput();
      this.showToast(`Loaded collection: ${collection.name}`, 'success');
    }
  }

  getFromStorage(key, defaultValue) {
    try {
      const item = localStorage.getItem(`base64-${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  saveToStorage(key, value) {
    try {
      localStorage.setItem(`base64-${key}`, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  }

  handleError(error) {
    console.error('Base64 Decoder Error:', error);
    this.showError(error.message);

    if (this.dom.resultStatus) {
      this.dom.resultStatus.textContent = 'Error';
      this.dom.resultStatus.className = 'result-indicator result-indicator--error';
    }
  }

  showError(message) {
    if (this.dom.errorMessage) {
      this.dom.errorMessage.hidden = false;
      this.dom.errorMessage.textContent = message;

      // Auto-hide after 5 seconds
      setTimeout(() => {
        if (this.dom.errorMessage && this.dom.errorMessage.textContent === message) {
          this.dom.errorMessage.hidden = true;
        }
      }, 5000);
    }
  }

  clearError() {
    if (this.dom.errorMessage) {
      this.dom.errorMessage.hidden = true;
      this.dom.errorMessage.textContent = '';
    }
  }

  showToast(message, type = 'info') {
    if (!this.dom.toastRegion) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'alert');
    toast.textContent = message;

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.onclick = () => toast.remove();
    toast.appendChild(closeBtn);

    this.dom.toastRegion.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 3000);
  }

  formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  recordPerformance(action, start) {
    const elapsed = performance.now() - start;
    this.state.performanceMetrics[action] = elapsed;

    if (elapsed > CONFIG.PERFORMANCE_THRESHOLD_MS) {
      console.warn(`Slow operation detected: ${action} took ${elapsed.toFixed(2)}ms`);
    }
  }
}

// Export for module usage
export async function runTool(action, input) {
  const decoder = new Base64Decoder();

  if (action === 'decode') {
    return decoder.decodeBase64(input);
  } else if (action === 'encode') {
    return decoder.encodeBase64(input);
  } else if (action === 'validate') {
    return decoder.validateBase64(input);
  }

  throw new Error(`Action '${action}' is not supported`);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.base64Decoder = new Base64Decoder();
});

// Module export
window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['base64-decode'] = { runTool };
