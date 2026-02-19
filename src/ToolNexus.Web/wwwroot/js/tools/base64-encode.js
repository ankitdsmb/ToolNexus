// base64-encode-enhanced.js

const CONFIG = {
  MAX_INPUT_SIZE_BYTES: 10 * 1024 * 1024, // 10MB max input
  CHUNK_SIZE: 1024 * 1024, // 1MB chunks for streaming
  PERFORMANCE_THRESHOLD_MS: 100,
  MAX_HISTORY_ITEMS: 50,
  DEBOUNCE_DELAY_MS: 300,
  MIME_LINE_LENGTH: 76,
  SUPPORTED_ENCODINGS: ['utf-8', 'ascii', 'utf-16le', 'utf-16be', 'latin1', 'windows-1252']
};

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64URL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

class Base64Encoder {
  constructor() {
    this.dom = this.initializeDOM();
    this.state = {
      isProcessing: false,
      abortController: null,
      performanceMetrics: {},
      history: [],
      historyIndex: -1,
      worker: null
    };

    this.init();
  }

  initializeDOM() {
    const elements = [
      'actionSelect', 'runBtn', 'copyBtn', 'downloadBtn', 'shareBtn',
      'inputEditor', 'outputEditor', 'errorMessage', 'resultStatus',
      'outputEmptyState', 'outputField', 'toastRegion',
      'clearInputBtn', 'pasteBtn', 'uploadBtn', 'copyOutputBtn', 'downloadOutputBtn',
      'encodingSelect', 'urlSafeCheck', 'omitPaddingCheck', 'lineBreakCheck',
      'stripNullCheck', 'charCount', 'byteCount', 'wordCount', 'lineCount',
      'nonAsciiCount', 'nullCharCount', 'outputLength', 'outputBytes',
      'expansionRatio', 'rawBytesView', 'rawBytesHex', 'viewRawBtn',
      'inputAnalysis', 'perfTime', 'encodingState', 'payloadSize',
      'uxPinnedRecent', 'uxHistory', 'uxCollections', 'collectionNameInput',
      'saveCollectionBtn', 'clearRecentBtn', 'clearHistoryBtn',
      'sampleInput', 'loadSampleBtn'
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
    this.setupWebWorker();
    this.loadFromStorage();
    this.updateUxLayer();

    // Initial analysis
    this.analyzeInput();
  }

  setupWebWorker() {
    if (window.Worker) {
      // Create worker for heavy encoding tasks
      const workerBlob = new Blob([`
        self.onmessage = function(e) {
          const { input, encoding, options } = e.data;
          
          function encodeChunk(chunk) {
            const utf8 = new TextEncoder().encode(chunk);
            let binary = '';
            for (const byte of utf8) {
              binary += String.fromCharCode(byte);
            }
            return btoa(binary);
          }
          
          try {
            const result = encodeChunk(input);
            self.postMessage({ success: true, result });
          } catch (error) {
            self.postMessage({ success: false, error: error.message });
          }
        };
      `], { type: 'application/javascript' });

      this.state.worker = new Worker(URL.createObjectURL(workerBlob));

      this.state.worker.onmessage = (e) => {
        const { success, result, error } = e.data;
        if (success) {
          this.handleEncodingResult(result);
        } else {
          this.showError(error);
        }
        this.setProcessingState(false);
      };
    }
  }

  bindEvents() {
    // Main actions
    this.dom.runBtn?.addEventListener('click', () => this.encode());
    this.dom.copyBtn?.addEventListener('click', () => this.copyOutput());
    this.dom.downloadBtn?.addEventListener('click', () => this.downloadOutput());
    this.dom.shareBtn?.addEventListener('click', () => this.shareOutput());

    // Input actions
    this.dom.clearInputBtn?.addEventListener('click', () => this.clearInput());
    this.dom.pasteBtn?.addEventListener('click', () => this.pasteFromClipboard());
    this.dom.uploadBtn?.addEventListener('click', () => this.uploadFile());

    // Output actions
    this.dom.copyOutputBtn?.addEventListener('click', () => this.copyOutput());
    this.dom.downloadOutputBtn?.addEventListener('click', () => this.downloadOutput());
    this.dom.viewRawBtn?.addEventListener('click', () => this.toggleRawBytesView());

    // Options
    this.dom.encodingSelect?.addEventListener('change', () => {
      this.updateEncodingState();
      this.autoEncode();
    });

    this.dom.urlSafeCheck?.addEventListener('change', () => this.autoEncode());
    this.dom.omitPaddingCheck?.addEventListener('change', () => this.autoEncode());
    this.dom.lineBreakCheck?.addEventListener('change', () => this.autoEncode());
    this.dom.stripNullCheck?.addEventListener('change', () => this.analyzeInput());

    // Input handling with debounce
    let debounceTimer;
    this.dom.inputEditor?.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.analyzeInput();
        this.autoEncode();
      }, CONFIG.DEBOUNCE_DELAY_MS);
    });

    // Sample data
    this.dom.loadSampleBtn?.addEventListener('click', () => this.loadSampleData());

    document.querySelectorAll('.sample-example').forEach(btn => {
      btn.addEventListener('click', (e) => this.loadExample(e.target.dataset.example));
    });

    // UX Layer
    this.dom.saveCollectionBtn?.addEventListener('click', () => this.saveCollection());
    this.dom.clearRecentBtn?.addEventListener('click', () => this.clearRecent());
    this.dom.clearHistoryBtn?.addEventListener('click', () => this.clearHistory());

    // Drag and drop
    this.setupDragAndDrop();
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Enter to encode
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.encode();
      }

      // Ctrl+Shift+C to copy output
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        this.copyOutput();
      }

      // Ctrl+Shift+U for URL-safe toggle
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'U') {
        e.preventDefault();
        if (this.dom.urlSafeCheck) {
          this.dom.urlSafeCheck.checked = !this.dom.urlSafeCheck.checked;
          this.autoEncode();
        }
      }

      // Ctrl+Shift+P for padding toggle
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        if (this.dom.omitPaddingCheck) {
          this.dom.omitPaddingCheck.checked = !this.dom.omitPaddingCheck.checked;
          this.autoEncode();
        }
      }

      // Ctrl+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      }

      // Ctrl+Y for redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        this.redo();
      }
    });
  }

  setupTextareaAutoResize() {
    if (this.dom.inputEditor) {
      this.dom.inputEditor.style.minHeight = '200px';
      this.dom.inputEditor.style.resize = 'vertical';
      this.autoResizeTextarea(this.dom.inputEditor);
    }
  }

  autoResizeTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 500) + 'px';
  }

  setupDragAndDrop() {
    const dropZone = this.dom.inputEditor?.parentElement;

    if (!dropZone) return;

    ['dragenter', 'dragover'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.add('is-dragover');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.remove('is-dragover');
      });
    });

    dropZone.addEventListener('drop', async (event) => {
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;

      await this.processFile(file);
    });
  }

  async encode() {
    if (this.state.isProcessing) {
      this.showToast('Already encoding, please wait...', 'warning');
      return;
    }

    const start = performance.now();
    this.setProcessingState(true);
    this.clearError();

    try {
      const input = this.dom.inputEditor.value;

      if (!input) {
        this.showToast('Please enter text to encode', 'warning');
        this.setProcessingState(false);
        return;
      }

      // Check input size
      const bytes = new TextEncoder().encode(input).length;
      if (bytes > CONFIG.MAX_INPUT_SIZE_BYTES) {
        throw new Error(`Input too large. Maximum size is ${this.formatBytes(CONFIG.MAX_INPUT_SIZE_BYTES)}`);
      }

      // Sanitize input if option enabled
      let processedInput = input;
      if (this.dom.stripNullCheck?.checked) {
        processedInput = this.sanitizeTextInput(processedInput);
      }

      // Get encoding options
      const encoding = this.dom.encodingSelect?.value || 'utf-8';
      const options = {
        urlSafe: this.dom.urlSafeCheck?.checked || false,
        omitPadding: this.dom.omitPaddingCheck?.checked || false,
        lineBreak: this.dom.lineBreakCheck?.checked || false
      };

      // Encode based on size
      let base64;
      if (bytes > CONFIG.CHUNK_SIZE && this.state.worker) {
        // Use worker for large inputs
        this.state.worker.postMessage({
          input: processedInput,
          encoding,
          options
        });
        return;
      } else {
        // Process normally for small inputs
        base64 = await this.encodeToBase64(processedInput, encoding, options);
        this.handleEncodingResult(base64);
      }

      this.recordPerformance('encode', start);
      this.addToHistory(processedInput, base64);

    } catch (error) {
      this.handleError(error);
      this.recordPerformance('error', start);
      this.setProcessingState(false);
    }
  }

  async encodeToBase64(input, encoding = 'utf-8', options = {}) {
    try {
      // Convert to bytes based on encoding
      let bytes;

      switch (encoding.toLowerCase()) {
        case 'utf-8':
        case 'ascii':
          bytes = new TextEncoder().encode(input);
          break;
        case 'utf-16le':
          bytes = this.encodeUTF16(input, true);
          break;
        case 'utf-16be':
          bytes = this.encodeUTF16(input, false);
          break;
        case 'latin1':
        case 'windows-1252':
          bytes = this.encodeLatin1(input);
          break;
        default:
          bytes = new TextEncoder().encode(input);
      }

      // Convert to Base64
      let binary = '';
      const chunkSize = 32768; // 32KB chunks for performance

      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode.apply(null, chunk);
      }

      let base64 = btoa(binary);

      // Apply options
      if (options.urlSafe) {
        base64 = this.toBase64URL(base64);
      } else if (options.omitPadding) {
        base64 = base64.replace(/=+$/, '');
      }

      if (options.lineBreak) {
        base64 = this.addLineBreaks(base64, CONFIG.MIME_LINE_LENGTH);
      }

      return base64;

    } catch (error) {
      throw new Error(`Encoding failed: ${error.message}`);
    }
  }

  handleEncodingResult(base64) {
    this.dom.outputEditor.value = base64;
    this.autoResizeTextarea(this.dom.outputEditor);

    // Show output field, hide empty state
    if (this.dom.outputEmptyState) {
      this.dom.outputEmptyState.hidden = true;
    }
    if (this.dom.outputField) {
      this.dom.outputField.hidden = false;
    }

    this.updateOutputStats();
    this.showResult('Encoding complete', 'success');
    this.setProcessingState(false);
  }

  autoEncode() {
    if (this.dom.inputEditor?.value && !this.state.isProcessing) {
      this.encode();
    }
  }

  sanitizeTextInput(input) {
    if (typeof input !== 'string') return '';

    // Remove null characters and other potentially problematic characters
    return input
      .replace(/\u0000/g, '') // Null characters
      .replace(/\uFFFF/g, '') // Invalid Unicode
      .normalize('NFC'); // Normalize Unicode
  }

  encodeUTF16(input, littleEndian = true) {
    const bytes = [];
    for (let i = 0; i < input.length; i++) {
      const code = input.charCodeAt(i);
      if (littleEndian) {
        bytes.push(code & 0xFF, (code >> 8) & 0xFF);
      } else {
        bytes.push((code >> 8) & 0xFF, code & 0xFF);
      }
    }
    return new Uint8Array(bytes);
  }

  encodeLatin1(input) {
    const bytes = [];
    for (let i = 0; i < input.length; i++) {
      bytes.push(input.charCodeAt(i) & 0xFF);
    }
    return new Uint8Array(bytes);
  }

  toBase64URL(base64) {
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  addLineBreaks(base64, lineLength) {
    const lines = [];
    for (let i = 0; i < base64.length; i += lineLength) {
      lines.push(base64.slice(i, i + lineLength));
    }
    return lines.join('\r\n');
  }

  analyzeInput() {
    const input = this.dom.inputEditor.value;

    if (!input) {
      this.dom.inputAnalysis.hidden = true;
      this.updateMetaStats(0, 0);
      return;
    }

    // Show analysis panel
    this.dom.inputAnalysis.hidden = false;

    // Count characters
    const charCount = input.length;
    const bytes = new TextEncoder().encode(input).length;

    // Count words
    const words = input.trim() ? input.trim().split(/\s+/).length : 0;

    // Count lines
    const lines = input.split('\n').length;

    // Count non-ASCII characters
    const nonAscii = (input.match(/[^\x00-\x7F]/g) || []).length;

    // Count null characters
    const nullChars = (input.match(/\u0000/g) || []).length;

    // Update DOM
    if (this.dom.charCount) this.dom.charCount.textContent = `${charCount} chars`;
    if (this.dom.byteCount) this.dom.byteCount.textContent = this.formatBytes(bytes);
    if (this.dom.wordCount) this.dom.wordCount.textContent = words;
    if (this.dom.lineCount) this.dom.lineCount.textContent = lines;
    if (this.dom.nonAsciiCount) this.dom.nonAsciiCount.textContent = nonAscii;
    if (this.dom.nullCharCount) this.dom.nullCharCount.textContent = nullChars;

    // Update meta stats
    this.updateMetaStats(charCount, bytes);
  }

  updateOutputStats() {
    const output = this.dom.outputEditor.value;
    const input = this.dom.inputEditor.value;

    if (!output) return;

    const charCount = output.length;
    const bytes = new TextEncoder().encode(output).length;
    const inputBytes = new TextEncoder().encode(input).length;

    // Calculate expansion ratio
    const ratio = inputBytes ? ((bytes / inputBytes) * 100).toFixed(1) : 0;
    const expansionClass = ratio > 133 ? 'expansion-badge--warning' : 'expansion-badge--success';

    if (this.dom.outputLength) this.dom.outputLength.textContent = `${charCount} chars`;
    if (this.dom.outputBytes) this.dom.outputBytes.textContent = this.formatBytes(bytes);
    if (this.dom.expansionRatio) {
      this.dom.expansionRatio.textContent = `+${ratio}%`;
      this.dom.expansionRatio.className = `expansion-badge ${expansionClass}`;
    }
  }

  updateMetaStats(chars, bytes) {
    if (this.dom.payloadSize) {
      this.dom.payloadSize.textContent = this.formatBytes(bytes);
    }
  }

  updateEncodingState() {
    const encoding = this.dom.encodingSelect?.value || 'utf-8';
    if (this.dom.encodingState) {
      this.dom.encodingState.textContent = encoding.toUpperCase();
    }
  }

  async toggleRawBytesView() {
    if (!this.dom.rawBytesView || !this.dom.rawBytesHex) return;

    if (this.dom.rawBytesView.hidden) {
      const output = this.dom.outputEditor.value;
      if (!output) {
        this.showToast('No output to display', 'warning');
        return;
      }

      try {
        // Decode Base64 to bytes
        const binary = atob(output);
        const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));

        // Convert to hex
        const hex = Array.from(bytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join(' ');

        // Format in rows of 16 bytes
        const rows = [];
        for (let i = 0; i < hex.length; i += 48) { // 16 bytes * 3 chars per byte
          rows.push(hex.slice(i, i + 48));
        }

        this.dom.rawBytesHex.textContent = rows.join('\n');
        this.dom.rawBytesView.hidden = false;
        this.dom.viewRawBtn.classList.add('active');
      } catch (error) {
        this.showToast('Failed to decode bytes', 'error');
      }
    } else {
      this.dom.rawBytesView.hidden = true;
      this.dom.viewRawBtn.classList.remove('active');
    }
  }

  async pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      this.dom.inputEditor.value = text;
      this.autoResizeTextarea(this.dom.inputEditor);
      this.analyzeInput();
      this.autoEncode();
      this.showToast('Pasted from clipboard', 'success');
    } catch (error) {
      this.showToast('Failed to paste: ' + error.message, 'error');
    }
  }

  async uploadFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.json,.html,.css,.js,.md,.csv';

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      await this.processFile(file);
    };

    input.click();
  }

  async processFile(file) {
    // Check file size
    if (file.size > CONFIG.MAX_INPUT_SIZE_BYTES) {
      this.showToast(`File too large. Maximum size is ${this.formatBytes(CONFIG.MAX_INPUT_SIZE_BYTES)}`, 'error');
      return;
    }

    try {
      const text = await file.text();
      this.dom.inputEditor.value = text;
      this.autoResizeTextarea(this.dom.inputEditor);
      this.analyzeInput();
      this.autoEncode();
      this.showToast(`Loaded ${file.name}`, 'success');
    } catch (error) {
      this.showToast(`Failed to read file: ${error.message}`, 'error');
    }
  }

  loadSampleData() {
    if (this.dom.sampleInput) {
      this.dom.inputEditor.value = this.dom.sampleInput.textContent;
      this.autoResizeTextarea(this.dom.inputEditor);
      this.analyzeInput();
      this.autoEncode();
      this.showToast('Sample data loaded', 'success');
    }
  }

  loadExample(type) {
    const examples = {
      text: 'Hello, World! This is a sample text.',
      json: '{"name": "John Doe", "age": 30, "city": "New York"}',
      html: '<h1>Hello World</h1>\n<p>This is a paragraph.</p>',
      unicode: 'Hello 世界! 🌍 你好 👋'
    };

    if (examples[type]) {
      this.dom.inputEditor.value = examples[type];
      this.autoResizeTextarea(this.dom.inputEditor);
      this.analyzeInput();
      this.autoEncode();
      this.showToast(`Loaded ${type} example`, 'success');
    }
  }

  clearInput() {
    this.dom.inputEditor.value = '';
    this.autoResizeTextarea(this.dom.inputEditor);
    this.analyzeInput();

    // Hide output
    if (this.dom.outputField) this.dom.outputField.hidden = true;
    if (this.dom.outputEmptyState) this.dom.outputEmptyState.hidden = false;

    this.showToast('Input cleared', 'info');
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
    const btn = this.dom.copyBtn || this.dom.copyOutputBtn;
    if (!btn) return;

    btn.classList.add(success ? 'copy-success' : 'copy-error');

    setTimeout(() => {
      btn.classList.remove('copy-success', 'copy-error');
    }, 450);
  }

  async downloadOutput() {
    const output = this.dom.outputEditor?.value;

    if (!output) {
      this.showToast('No output to download', 'warning');
      return;
    }

    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `base64-encoded-${timestamp}.txt`;

      const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
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
          title: 'Base64 Encoded Text',
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

  addToHistory(input, output) {
    const history = this.getFromStorage('history', []);

    const item = {
      id: Date.now().toString(),
      input: input.substring(0, 100) + (input.length > 100 ? '...' : ''),
      output: output.substring(0, 50) + (output.length > 50 ? '...' : ''),
      timestamp: new Date().toISOString(),
      encoding: this.dom.encodingSelect?.value,
      urlSafe: this.dom.urlSafeCheck?.checked
    };

    history.unshift(item);

    // Keep only last 50 items
    if (history.length > CONFIG.MAX_HISTORY_ITEMS) {
      history.pop();
    }

    this.saveToStorage('history', history);
    this.updateHistory();

    // Also add to recent
    this.addToRecent(input);
  }

  addToRecent(input) {
    const recent = this.getFromStorage('recent', []);

    // Avoid duplicates
    const existingIndex = recent.findIndex(r => r.input === input.substring(0, 100));
    if (existingIndex !== -1) {
      recent.splice(existingIndex, 1);
    }

    recent.unshift({
      id: Date.now().toString(),
      input: input.substring(0, 100) + (input.length > 100 ? '...' : ''),
      timestamp: new Date().toISOString()
    });

    // Keep only last 10 items
    if (recent.length > 10) {
      recent.pop();
    }

    this.saveToStorage('recent', recent);
    this.updatePinnedRecent();
  }

  saveCollection() {
    const name = this.dom.collectionNameInput?.value.trim();

    if (!name) {
      this.showToast('Please enter a collection name', 'warning');
      return;
    }

    const collections = this.getFromStorage('collections', []);
    const input = this.dom.inputEditor.value;

    if (!input) {
      this.showToast('No input to save', 'warning');
      return;
    }

    collections.push({
      id: Date.now().toString(),
      name: name,
      input: input,
      encoding: this.dom.encodingSelect?.value,
      urlSafe: this.dom.urlSafeCheck?.checked,
      omitPadding: this.dom.omitPaddingCheck?.checked,
      lineBreak: this.dom.lineBreakCheck?.checked,
      timestamp: new Date().toISOString()
    });

    this.saveToStorage('collections', collections);
    this.updateCollections();

    this.dom.collectionNameInput.value = '';
    this.showToast(`Saved to collections: ${name}`, 'success');
  }

  loadFromCollection(id) {
    const collections = this.getFromStorage('collections', []);
    const collection = collections.find(c => c.id === id);

    if (collection) {
      this.dom.inputEditor.value = collection.input;

      if (collection.encoding && this.dom.encodingSelect) {
        this.dom.encodingSelect.value = collection.encoding;
      }
      if (this.dom.urlSafeCheck) {
        this.dom.urlSafeCheck.checked = collection.urlSafe || false;
      }
      if (this.dom.omitPaddingCheck) {
        this.dom.omitPaddingCheck.checked = collection.omitPadding || false;
      }
      if (this.dom.lineBreakCheck) {
        this.dom.lineBreakCheck.checked = collection.lineBreak || false;
      }

      this.autoResizeTextarea(this.dom.inputEditor);
      this.analyzeInput();
      this.autoEncode();
      this.showToast(`Loaded: ${collection.name}`, 'success');
    }
  }

  loadFromHistory(id) {
    const history = this.getFromStorage('history', []);
    const item = history.find(h => h.id === id);

    if (item) {
      // In a real implementation, you'd store the full input
      this.showToast('History item loaded', 'success');
    }
  }

  clearRecent() {
    this.saveToStorage('recent', []);
    this.updatePinnedRecent();
    this.showToast('Recent items cleared', 'info');
  }

  clearHistory() {
    this.saveToStorage('history', []);
    this.updateHistory();
    this.showToast('History cleared', 'info');
  }

  updateUxLayer() {
    this.updatePinnedRecent();
    this.updateHistory();
    this.updateCollections();
  }

  updatePinnedRecent() {
    if (!this.dom.uxPinnedRecent) return;

    const recent = this.getFromStorage('recent', []);

    if (recent.length === 0) {
      this.dom.uxPinnedRecent.innerHTML = '<li class="ux-list__empty">No recent items yet</li>';
      return;
    }

    this.dom.uxPinnedRecent.innerHTML = recent.map(item => `
      <li class="ux-list__item" data-id="${item.id}">
        <span class="ux-list__item-title" title="${item.input}">${item.input}</span>
        <button class="ux-list__item-action" onclick="window.base64Encoder?.loadFromHistory('${item.id}')">Load</button>
      </li>
    `).join('');
  }

  updateHistory() {
    if (!this.dom.uxHistory) return;

    const history = this.getFromStorage('history', []);

    if (history.length === 0) {
      this.dom.uxHistory.innerHTML = '<li class="ux-list__empty">No history yet</li>';
      return;
    }

    this.dom.uxHistory.innerHTML = history.map(item => `
      <li class="ux-list__item" data-id="${item.id}">
        <span class="ux-list__item-title" title="${item.input}">${item.input}</span>
        <span class="ux-list__item-meta">${new Date(item.timestamp).toLocaleTimeString()}</span>
        <button class="ux-list__item-action" onclick="window.base64Encoder?.loadFromHistory('${item.id}')">Load</button>
      </li>
    `).join('');
  }

  updateCollections() {
    if (!this.dom.uxCollections) return;

    const collections = this.getFromStorage('collections', []);

    if (collections.length === 0) {
      this.dom.uxCollections.innerHTML = '<li class="ux-list__empty">No collections saved</li>';
      return;
    }

    this.dom.uxCollections.innerHTML = collections.map(collection => `
      <li class="ux-list__item" data-id="${collection.id}">
        <span class="ux-list__item-title" title="${collection.input}">${collection.name}</span>
        <span class="ux-list__item-meta">${new Date(collection.timestamp).toLocaleDateString()}</span>
        <button class="ux-list__item-action" onclick="window.base64Encoder?.loadFromCollection('${collection.id}')">Load</button>
      </li>
    `).join('');
  }

  undo() {
    // Implement undo functionality
    if (this.state.historyIndex > 0) {
      this.state.historyIndex--;
      // Load previous state
    }
  }

  redo() {
    // Implement redo functionality
    if (this.state.historyIndex < this.state.history.length - 1) {
      this.state.historyIndex++;
      // Load next state
    }
  }

  loadFromStorage() {
    // Load saved collections, history, etc.
    this.updateUxLayer();
  }

  getFromStorage(key, defaultValue) {
    try {
      const item = localStorage.getItem(`base64-encode-${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  saveToStorage(key, value) {
    try {
      localStorage.setItem(`base64-encode-${key}`, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  }

  showResult(message, type = 'success') {
    if (this.dom.resultStatus) {
      const textEl = this.dom.resultStatus.querySelector('.result-indicator__text');
      if (textEl) {
        textEl.textContent = message;
      }
      this.dom.resultStatus.className = `result-indicator result-indicator--${type}`;
    }
    this.showToast(message, type);
  }

  setProcessingState(isProcessing) {
    this.state.isProcessing = isProcessing;

    if (this.dom.runBtn) {
      this.dom.runBtn.ariaBusy = String(isProcessing);
      const btnLabel = this.dom.runBtn.querySelector('.tool-btn__label');
      if (btnLabel) {
        btnLabel.textContent = isProcessing ? 'Encoding…' : 'Encode';
      }
    }
  }

  handleError(error) {
    console.error('Base64 Encoder Error:', error);
    this.showError(error.message);

    if (this.dom.resultStatus) {
      const textEl = this.dom.resultStatus.querySelector('.result-indicator__text');
      if (textEl) {
        textEl.textContent = 'Error';
      }
      this.dom.resultStatus.className = 'result-indicator result-indicator--error';
    }
  }

  showError(message) {
    if (this.dom.errorMessage) {
      this.dom.errorMessage.hidden = false;
      this.dom.errorMessage.textContent = message;

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

    if (this.dom.perfTime) {
      this.dom.perfTime.textContent = `${elapsed.toFixed(2)} ms`;
    }

    if (elapsed > CONFIG.PERFORMANCE_THRESHOLD_MS) {
      console.warn(`Slow operation detected: ${action} took ${elapsed.toFixed(2)}ms`);
    }
  }

  destroy() {
    if (this.state.worker) {
      this.state.worker.terminate();
    }
  }
}

// Enhanced runTool function with support for options
export async function runTool(action, input, options = {}) {
  if (action !== 'encode') {
    throw new Error(`Action '${action}' is not supported for client-side execution.`);
  }

  const encoder = new Base64Encoder();

  // Sanitize input
  const sanitized = encoder.sanitizeTextInput(input);

  // Apply options
  const encoding = options.encoding || 'utf-8';
  const urlSafe = options.urlSafe || false;
  const omitPadding = options.omitPadding || false;
  const lineBreak = options.lineBreak || false;

  // Encode
  const base64 = await encoder.encodeToBase64(sanitized, encoding, {
    urlSafe,
    omitPadding,
    lineBreak
  });

  return base64;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.base64Encoder = new Base64Encoder();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.base64Encoder) {
    window.base64Encoder.destroy();
  }
});

// Module export
window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['base64-encode'] = { runTool };
