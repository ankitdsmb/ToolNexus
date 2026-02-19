// json-formatter-enhanced.js

const CONFIG = {
  LARGE_FILE_THRESHOLD_BYTES: 1024 * 1024, // 1MB
  PERFORMANCE_THRESHOLD_MS: 100,
  MARKER_OWNER: 'json-validation',
  DEBOUNCE_DELAY_MS: 300,
  MAX_TOASTS: 3,
  TREE_MAX_DEPTH: 20,
  TREE_MAX_NODES: 1000,
  HISTORY_LIMIT: 50
};

class JSONFormatter {
  constructor() {
    this.dom = this.initializeDOM();
    this.state = {
      history: [],
      historyIndex: -1,
      isProcessing: false,
      performanceMetrics: {},
      abortController: null
    };

    this.init();
  }

  initializeDOM() {
    const elements = [
      'formatBtn', 'minifyBtn', 'validateBtn', 'autofixBtn',
      'copyBtn', 'downloadBtn', 'treeToggle', 'diffToggle',
      'wrapToggle', 'perfTime', 'validationState', 'payloadStats',
      'largeFileWarning', 'errorMessage', 'resultStatus',
      'jsonEditor', 'outputEditor', 'diffEditor', 'treeView',
      'dropZone', 'toastRegion', 'compressBtn', 'escapeBtn',
      'unescapeBtn', 'sortBtn', 'statsBtn'
    ];

    return elements.reduce((acc, id) => {
      acc[id] = document.getElementById(id);
      return acc;
    }, {});
  }

  async init() {
    if (!this.dom.jsonEditor || !window.require) {
      throw new Error('Monaco editor loader is unavailable for json-formatter.');
    }

    await this.loadMonaco();
    this.bindEvents();
    this.setupKeyboardShortcuts();
    this.setupPerformanceObserver();
  }

  async loadMonaco() {
    window.require.config({
      paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs' }
    });

    return new Promise((resolve) => {
      window.require(['vs/editor/editor.main'], () => {
        this.monaco = window.monaco;
        this.createEditors();
        resolve();
      });
    });
  }

  createEditors() {
    const inputValue = window.ToolNexusConfig?.jsonExampleInput ?? '{\n  "hello": "world"\n}';

    this.inputModel = this.monaco.editor.createModel(inputValue, 'json');
    this.outputModel = this.monaco.editor.createModel('', 'json');

    // Configure JSON language features
    this.monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemas: [],
      enableSchemaRequest: false
    });

    this.inputEditor = this.monaco.editor.create(this.dom.jsonEditor, {
      model: this.inputModel,
      theme: 'vs-dark',
      minimap: { enabled: false },
      automaticLayout: true,
      wordWrap: 'off',
      fontSize: 14,
      lineNumbers: 'on',
      glyphMargin: true,
      folding: true,
      bracketPairColorization: { enabled: true },
      autoClosingBrackets: 'always',
      formatOnPaste: true,
      formatOnType: true,
      tabSize: 2,
      detectIndentation: true
    });

    this.outputEditor = this.monaco.editor.create(this.dom.outputEditor, {
      model: this.outputModel,
      theme: 'vs-dark',
      minimap: { enabled: false },
      automaticLayout: true,
      readOnly: true,
      wordWrap: 'off',
      fontSize: 14,
      lineNumbers: 'on',
      folding: true
    });

    this.diffEditor = this.monaco.editor.createDiffEditor(this.dom.diffEditor, {
      theme: 'vs-dark',
      minimap: { enabled: false },
      automaticLayout: true,
      readOnly: true,
      originalEditable: false,
      renderSideBySide: true,
      fontSize: 14
    });

    this.diffEditor.setModel({
      original: this.inputModel,
      modified: this.outputModel
    });

    this.setupEditorListeners();
    this.updatePayloadStats(this.inputModel.getValue());
    this.autoFormatIfValid({ silent: true });
  }

  setupEditorListeners() {
    // Debounced input handling
    let debounceTimer;
    this.inputModel.onDidChangeContent(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const value = this.inputModel.getValue();
        this.updatePayloadStats(value);
        this.validateJson({ value, updateState: true });
        this.addToHistory(value);
      }, CONFIG.DEBOUNCE_DELAY_MS);
    });

    // Handle paste events
    this.inputEditor.onDidPaste(() => {
      this.autoFormatIfValid();
    });

    // Handle keyboard shortcuts
    this.inputEditor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KeyS, () => {
      this.performAction('format');
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Enter for format
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        this.performAction('format');
      }

      // Ctrl+Shift+M for minify
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        this.performAction('minify');
      }

      // Ctrl+Shift+V for validate
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        this.performAction('validate');
      }

      // Ctrl+Z for undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      }

      // Ctrl+Y for redo
      if (e.ctrlKey && e.key === 'y' || (e.ctrlKey && e.shiftKey && e.key === 'Z')) {
        e.preventDefault();
        this.redo();
      }
    });
  }

  bindEvents() {
    // Main actions
    this.dom.formatBtn?.addEventListener('click', () => this.performAction('format'));
    this.dom.minifyBtn?.addEventListener('click', () => this.performAction('minify'));
    this.dom.validateBtn?.addEventListener('click', () => this.performAction('validate'));
    this.dom.autofixBtn?.addEventListener('click', () => this.performAction('autofix'));
    this.dom.copyBtn?.addEventListener('click', () => this.copyOutput());
    this.dom.downloadBtn?.addEventListener('click', () => this.downloadOutput());

    // New actions
    this.dom.compressBtn?.addEventListener('click', () => this.compressJSON());
    this.dom.escapeBtn?.addEventListener('click', () => this.escapeJSON());
    this.dom.unescapeBtn?.addEventListener('click', () => this.unescapeJSON());
    this.dom.sortBtn?.addEventListener('click', () => this.sortJSON());
    this.dom.statsBtn?.addEventListener('click', () => this.showStats());

    // Toggles
    this.dom.wrapToggle?.addEventListener('change', () => this.toggleWordWrap());
    this.dom.treeToggle?.addEventListener('change', () => this.toggleTreeView());
    this.dom.diffToggle?.addEventListener('change', () => this.toggleDiffView());

    // Drag and drop
    this.setupDragAndDrop();
  }

  setupDragAndDrop() {
    ['dragenter', 'dragover'].forEach((eventName) => {
      this.dom.dropZone?.addEventListener(eventName, (event) => {
        event.preventDefault();
        this.dom.dropZone.classList.add('is-dragover');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      this.dom.dropZone?.addEventListener(eventName, (event) => {
        event.preventDefault();
        this.dom.dropZone.classList.remove('is-dragover');
      });
    });

    this.dom.dropZone?.addEventListener('drop', async (event) => {
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;

      // Check file size
      if (file.size > CONFIG.LARGE_FILE_THRESHOLD_BYTES * 10) {
        this.showToast('File too large. Maximum size is 10MB.', 'error');
        return;
      }

      try {
        const text = await file.text();
        this.inputModel.setValue(text);
        this.autoFormatIfValid();
        this.showToast(`Loaded ${file.name}`, 'success');
      } catch (error) {
        this.showError('Failed to read file: ' + error.message);
      }
    });
  }

  async performAction(action) {
    if (this.state.isProcessing) {
      this.showToast('Already processing, please wait...', 'warning');
      return;
    }

    const start = performance.now();
    this.state.isProcessing = true;

    try {
      this.clearError();
      const raw = this.inputModel.getValue();

      // Cancel any ongoing operation
      if (this.state.abortController) {
        this.state.abortController.abort();
      }
      this.state.abortController = new AbortController();

      if (action === 'autofix') {
        const fixed = this.autoFixCommonJsonIssues(raw);
        this.inputModel.setValue(fixed);
        this.autoFormatIfValid();
        this.recordPerformance(action, start);
        return;
      }

      // Parse with error handling for large files
      const parsed = await this.parseJSONAsync(raw, this.state.abortController.signal);

      if (action === 'validate') {
        this.handleValidationSuccess();
        this.recordPerformance(action, start);
        return;
      }

      // Generate output based on action
      let output;
      switch (action) {
        case 'minify':
          output = JSON.stringify(parsed);
          break;
        case 'format':
          output = JSON.stringify(parsed, null, 2);
          break;
        case 'compress':
          output = this.compressJSONString(parsed);
          break;
        case 'sort':
          output = JSON.stringify(this.sortObject(parsed), null, 2);
          break;
        default:
          output = JSON.stringify(parsed, null, 2);
      }

      this.outputModel.setValue(output);
      this.outputEditor.revealLine(1);

      // Update UI
      this.dom.resultStatus.textContent = this.getResultStatus(action);
      this.handleValidationSuccess();

      // Update tree view if enabled
      if (this.dom.treeToggle?.checked) {
        this.renderTree(output);
      }

      this.recordPerformance(action, start);
    } catch (error) {
      if (error.name === 'AbortError') {
        this.showToast('Operation cancelled', 'info');
      } else {
        this.handleJsonError(error, start);
      }
    } finally {
      this.state.isProcessing = false;
      this.state.abortController = null;
    }
  }

  async parseJSONAsync(jsonString, signal) {
    // For large JSON, use streaming parser
    if (jsonString.length > CONFIG.LARGE_FILE_THRESHOLD_BYTES) {
      return this.parseLargeJSON(jsonString, signal);
    }

    // For small JSON, use regular parser with timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Parsing timeout'));
      }, 5000);

      try {
        const result = JSON.parse(jsonString);
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  parseLargeJSON(jsonString, signal) {
    // Use a more efficient parser for large JSON
    // This is a simplified version - in production, consider using a streaming parser
    return new Promise((resolve, reject) => {
      try {
        // Check for abort signal
        if (signal?.aborted) {
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }

        const result = JSON.parse(jsonString);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  compressJSON() {
    this.performAction('compress');
  }

  compressJSONString(obj) {
    // Remove whitespace and compress
    return JSON.stringify(obj);
  }

  escapeJSON() {
    try {
      const raw = this.inputModel.getValue();
      const escaped = raw
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      this.outputModel.setValue(escaped);
      this.showToast('JSON escaped', 'success');
    } catch (error) {
      this.showError('Failed to escape JSON: ' + error.message);
    }
  }

  unescapeJSON() {
    try {
      const raw = this.inputModel.getValue();
      const unescaped = raw
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\');
      this.outputModel.setValue(unescaped);
      this.showToast('JSON unescaped', 'success');
    } catch (error) {
      this.showError('Failed to unescape JSON: ' + error.message);
    }
  }

  sortObject(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObject(item));
    }

    return Object.keys(obj)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = this.sortObject(obj[key]);
        return sorted;
      }, {});
  }

  sortJSON() {
    this.performAction('sort');
  }

  showStats() {
    try {
      const raw = this.inputModel.getValue();
      const parsed = JSON.parse(raw);

      const stats = this.calculateJSONStats(parsed, raw);

      // Display stats in a modal or panel
      const statsHtml = `
        <div class="stats-panel">
          <h3>JSON Statistics</h3>
          <table>
            <tr><td>Total size:</td><td>${this.formatBytes(raw.length)}</td></tr>
            <tr><td>Number of keys:</td><td>${stats.keyCount}</td></tr>
            <tr><td>Array count:</td><td>${stats.arrayCount}</td></tr>
            <tr><td>Object count:</td><td>${stats.objectCount}</td></tr>
            <tr><td>String count:</td><td>${stats.stringCount}</td></tr>
            <tr><td>Number count:</td><td>${stats.numberCount}</td></tr>
            <tr><td>Boolean count:</td><td>${stats.booleanCount}</td></tr>
            <tr><td>Null count:</td><td>${stats.nullCount}</td></tr>
            <tr><td>Max depth:</td><td>${stats.maxDepth}</td></tr>
          </table>
        </div>
      `;

      // Show stats in a modal or tooltip
      this.showToast('Statistics calculated', 'info');
      console.log('JSON Stats:', stats);
    } catch (error) {
      this.showError('Failed to calculate stats: ' + error.message);
    }
  }

  calculateJSONStats(obj, raw) {
    let keyCount = 0;
    let arrayCount = 0;
    let objectCount = 0;
    let stringCount = 0;
    let numberCount = 0;
    let booleanCount = 0;
    let nullCount = 0;
    let maxDepth = 0;

    const traverse = (item, depth = 0) => {
      maxDepth = Math.max(maxDepth, depth);

      if (Array.isArray(item)) {
        arrayCount++;
        item.forEach(child => traverse(child, depth + 1));
      } else if (item && typeof item === 'object') {
        objectCount++;
        keyCount += Object.keys(item).length;
        Object.values(item).forEach(value => traverse(value, depth + 1));
      } else if (typeof item === 'string') {
        stringCount++;
      } else if (typeof item === 'number') {
        numberCount++;
      } else if (typeof item === 'boolean') {
        booleanCount++;
      } else if (item === null) {
        nullCount++;
      }
    };

    traverse(obj);

    return {
      keyCount,
      arrayCount,
      objectCount,
      stringCount,
      numberCount,
      booleanCount,
      nullCount,
      maxDepth
    };
  }

  handleValidationSuccess() {
    this.dom.validationState.textContent = 'Valid JSON';
    this.setMarkers([]);
    this.clearError();
  }

  handleJsonError(error, start) {
    const marker = this.parseErrorToMarker(error);
    this.setMarkers(marker ? [marker] : []);
    this.dom.validationState.textContent = 'Invalid JSON';
    this.showError(error.message);
    this.dom.resultStatus.textContent = 'Validation error';
    this.recordPerformance('error', start);
  }

  parseErrorToMarker(error) {
    const message = String(error?.message ?? 'Invalid JSON');
    const match = message.match(/position\s(\d+)/i);

    if (!match) {
      return {
        startLineNumber: 1,
        endLineNumber: 1,
        startColumn: 1,
        endColumn: 1,
        message,
        severity: this.monaco.MarkerSeverity.Error
      };
    }

    const position = Number.parseInt(match[1], 10);
    return {
      startLineNumber: 1,
      endLineNumber: 1,
      startColumn: Math.max(1, position),
      endColumn: Math.max(2, position + 1),
      message,
      severity: this.monaco.MarkerSeverity.Error
    };
  }

  autoFormatIfValid(options = {}) {
    const start = performance.now();
    const raw = this.inputModel.getValue();

    try {
      const parsed = JSON.parse(raw);
      const formatted = JSON.stringify(parsed, null, 2);
      this.outputModel.setValue(formatted);
      this.setMarkers([]);
      this.dom.validationState.textContent = 'Valid JSON';
      this.dom.resultStatus.textContent = 'Auto-formatted from paste/input.';

      if (!options.silent) {
        this.showToast('Auto-formatted pasted JSON.', 'success');
      }

      this.recordPerformance('auto-format', start);
    } catch (error) {
      this.validateJson({ value: raw, updateState: true });
      if (!options.silent) {
        this.dom.resultStatus.textContent = 'Input changed. Fix errors to format.';
      }
    }
  }

  validateJson({ value, updateState }) {
    try {
      JSON.parse(value);
      this.setMarkers([]);
      if (updateState) this.dom.validationState.textContent = 'Valid JSON';
      return true;
    } catch (error) {
      const marker = this.parseErrorToMarker(error);
      this.setMarkers(marker ? [marker] : []);
      if (updateState) this.dom.validationState.textContent = 'Invalid JSON';
      return false;
    }
  }

  autoFixCommonJsonIssues(raw) {
    return raw
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/([\{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":')
      .replace(/:\s*'([^']*)'/g, ': "$1"')
      .replace(/(\r\n|\n|\r)/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  toggleWordWrap() {
    const wrapValue = this.dom.wrapToggle.checked ? 'on' : 'off';
    this.inputEditor.updateOptions({ wordWrap: wrapValue });
    this.outputEditor.updateOptions({ wordWrap: wrapValue });
  }

  toggleTreeView() {
    if (!this.dom.treeToggle.checked) {
      this.dom.treeView.hidden = true;
      return;
    }

    const rendered = this.renderTree(this.outputModel.getValue() || this.inputModel.getValue());

    if (!rendered) {
      this.showError('Tree view is available only for valid JSON.');
      this.dom.treeToggle.checked = false;
    } else {
      this.clearError();
      this.dom.treeView.hidden = false;
    }
  }

  toggleDiffView() {
    const enabled = this.dom.diffToggle.checked;
    this.dom.outputEditor.hidden = enabled;
    this.dom.diffEditor.hidden = !enabled;

    if (enabled) {
      this.diffEditor.setModel({
        original: this.inputModel,
        modified: this.outputModel
      });
    }
  }

  renderTree(input) {
    try {
      const parsed = JSON.parse(input);
      this.dom.treeView.innerHTML = '';
      this.dom.treeView.appendChild(this.buildTreeNode(parsed, 'root', 0));
      return true;
    } catch {
      return false;
    }
  }

  buildTreeNode(value, key, depth = 0) {
    if (depth > CONFIG.TREE_MAX_DEPTH) {
      const div = document.createElement('div');
      div.textContent = '... (max depth reached)';
      div.className = 'tree-max-depth';
      return div;
    }

    const row = document.createElement('details');
    row.open = key === 'root' && depth < 2;
    row.className = 'tree-node';

    const summary = document.createElement('summary');
    summary.textContent = this.getNodeLabel(value, key);
    row.appendChild(summary);

    if (value !== null && typeof value === 'object') {
      const entries = Object.entries(value);

      if (entries.length > CONFIG.TREE_MAX_NODES) {
        const warning = document.createElement('div');
        warning.textContent = `... (${entries.length - CONFIG.TREE_MAX_NODES} more items)`;
        warning.className = 'tree-warning';
        row.appendChild(warning);
      }

      entries
        .slice(0, CONFIG.TREE_MAX_NODES)
        .forEach(([childKey, childValue]) => {
          row.appendChild(this.buildTreeNode(childValue, childKey, depth + 1));
        });
    } else {
      const leaf = document.createElement('div');
      leaf.className = 'tree-leaf';
      leaf.textContent = this.formatValue(value);
      row.appendChild(leaf);
    }

    return row;
  }

  getNodeLabel(value, key) {
    if (Array.isArray(value)) {
      return `${key}: Array(${value.length})`;
    }
    if (value && typeof value === 'object') {
      return `${key}: Object(${Object.keys(value).length})`;
    }
    return `${key}: ${typeof value}`;
  }

  formatValue(value) {
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    return String(value);
  }

  async copyOutput() {
    const value = this.outputModel.getValue();

    if (!value) {
      this.showToast('No output to copy.', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      this.dom.copyBtn?.classList.add('copy-success');
      this.showToast('Copied to clipboard.', 'success');

      setTimeout(() => {
        this.dom.copyBtn?.classList.remove('copy-success');
      }, 450);
    } catch (error) {
      this.showToast('Failed to copy: ' + error.message, 'error');
    }
  }

  downloadOutput() {
    const value = this.outputModel.getValue();

    if (!value) {
      this.showToast('No output to download.', 'error');
      return;
    }

    try {
      const blob = new Blob([value], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `toolnexus-json-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('Downloaded JSON output.', 'success');
    } catch (error) {
      this.showToast('Failed to download: ' + error.message, 'error');
    }
  }

  addToHistory(value) {
    if (this.state.history[this.state.historyIndex] === value) {
      return;
    }

    // Remove forward history if we're not at the end
    if (this.state.historyIndex < this.state.history.length - 1) {
      this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);
    }

    this.state.history.push(value);

    // Limit history size
    if (this.state.history.length > CONFIG.HISTORY_LIMIT) {
      this.state.history.shift();
    }

    this.state.historyIndex = this.state.history.length - 1;
  }

  undo() {
    if (this.state.historyIndex > 0) {
      this.state.historyIndex--;
      this.inputModel.setValue(this.state.history[this.state.historyIndex]);
    }
  }

  redo() {
    if (this.state.historyIndex < this.state.history.length - 1) {
      this.state.historyIndex++;
      this.inputModel.setValue(this.state.history[this.state.historyIndex]);
    }
  }

  updatePayloadStats(value) {
    const bytes = new TextEncoder().encode(value).length;
    this.dom.payloadStats.textContent = this.formatBytes(bytes);
    this.dom.largeFileWarning.hidden = bytes < CONFIG.LARGE_FILE_THRESHOLD_BYTES;
  }

  formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  getResultStatus(action) {
    const statuses = {
      format: 'Formatted output ready.',
      minify: 'Minified output ready.',
      compress: 'Compressed output ready.',
      sort: 'Sorted output ready.',
      validate: 'JSON validated successfully.'
    };
    return statuses[action] || 'Output ready.';
  }

  setMarkers(markers) {
    this.monaco.editor.setModelMarkers(this.inputModel, CONFIG.MARKER_OWNER, markers);
  }

  showError(message) {
    this.dom.errorMessage.hidden = false;
    this.dom.errorMessage.textContent = message;

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (this.dom.errorMessage.textContent === message) {
        this.dom.errorMessage.hidden = true;
      }
    }, 5000);
  }

  clearError() {
    this.dom.errorMessage.hidden = true;
    this.dom.errorMessage.textContent = '';
  }

  showToast(message, type = 'info') {
    if (!this.dom.toastRegion) return;

    // Limit number of toasts
    if (this.dom.toastRegion.children.length >= CONFIG.MAX_TOASTS) {
      this.dom.toastRegion.firstChild?.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'alert');
    toast.textContent = message;

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => toast.remove();
    toast.appendChild(closeBtn);

    this.dom.toastRegion.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 3000);
  }

  recordPerformance(action, start) {
    const elapsed = performance.now() - start;
    this.state.performanceMetrics[action] = elapsed;

    this.dom.perfTime.textContent = `${elapsed.toFixed(2)} ms`;

    // Warn if operation is slow
    if (elapsed > CONFIG.PERFORMANCE_THRESHOLD_MS) {
      console.warn(`Slow operation detected: ${action} took ${elapsed.toFixed(2)}ms`);
    }
  }

  setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure' && entry.name.startsWith('json-')) {
            console.debug(`Performance measure: ${entry.name} = ${entry.duration}ms`);
          }
        }
      });

      observer.observe({ entryTypes: ['measure'] });
    }
  }
}

// Initialize the formatter when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.jsonFormatter = new JSONFormatter();
});
