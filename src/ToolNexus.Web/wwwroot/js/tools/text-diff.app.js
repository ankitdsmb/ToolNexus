import { getKeyboardEventManager } from './keyboard-event-manager.js';
import {
  buildDiffModel,
  LARGE_INPUT_THRESHOLD,
  MAX_RENDER_LINES,
  serializeResult,
  summarize
} from './text-diff.api.js';
import { createDiffView, queryTextDiffDom } from './text-diff.dom.js';

const TOOL_ID = 'text-diff';

function debounce(fn, waitMs) {
  let handle = 0;
  return (...args) => {
    window.clearTimeout(handle);
    handle = window.setTimeout(() => fn(...args), waitMs);
  };
}

function download(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export class TextDiffApp {
  constructor(root) {
    this.dom = queryTextDiffDom(root);
    this.latestResult = '';
    this.cleanupView = () => {};
    this.disposeKeyboardHandler = () => {};
    this.eventController = new AbortController();
    this.autoCompare = debounce(() => {
      if (this.dom.autoCompareToggle.checked) {
        this.runCompare();
      }
    }, 250);
  }

  init() {
    if (!this.dom.compareBtn) return;
    this.bindEvents();
    this.runCompare();
  }

  destroy() {
    this.disposeKeyboardHandler();
    this.cleanupView();
    this.eventController.abort();
  }

  showError(message) {
    this.dom.diffError.textContent = message;
    this.dom.diffError.hidden = false;
  }

  clearError() {
    this.dom.diffError.hidden = true;
    this.dom.diffError.textContent = '';
  }

  async runCompare() {
    try {
      this.clearError();
      this.dom.processingState.hidden = false;

      await new Promise((resolve) => window.requestAnimationFrame(resolve));

      const options = {
        trimTrailing: this.dom.trimTrailingToggle.checked,
        ignoreWhitespace: this.dom.ignoreWhitespaceToggle.checked,
        ignoreCase: this.dom.ignoreCaseToggle.checked,
        detailMode: this.dom.detailModeSelect.value
      };

      const leftText = this.dom.leftInput.value;
      const rightText = this.dom.rightInput.value;
      const estimatedLines = leftText.split('\n').length + rightText.split('\n').length;

      const rows = buildDiffModel(leftText, rightText, options);
      const summary = summarize(rows);
      this.dom.diffSummary.textContent = `Added: ${summary.added} · Removed: ${summary.removed} · Changed: ${summary.changed}`;

      const viewRows = rows.length > MAX_RENDER_LINES ? rows.slice(0, MAX_RENDER_LINES) : rows;
      const view = createDiffView(viewRows, this.dom.viewModeSelect.value, this.dom.scrollSyncToggle);
      this.cleanupView();
      this.cleanupView = view.cleanup;
      this.dom.diffOutput.textContent = "";
      this.dom.diffOutput.appendChild(view.node);

      if (rows.length > MAX_RENDER_LINES) {
        const notice = document.createElement('p');
        notice.textContent = `Showing first ${MAX_RENDER_LINES.toLocaleString()} rows for rendering performance.`;
        this.dom.diffOutput.prepend(notice);
      }

      if (estimatedLines > LARGE_INPUT_THRESHOLD) {
        const perfNote = document.createElement('p');
        perfNote.textContent = 'Large input detected: rendering optimized output.';
        this.dom.diffOutput.prepend(perfNote);
      }

      this.latestResult = serializeResult(rows);
    } catch {
      this.showError('Diff comparison failed. Please verify your input and options, then try again.');
    } finally {
      this.dom.processingState.hidden = true;
    }
  }

  bindEvents() {
    const signal = this.eventController.signal;
    this.dom.compareBtn.addEventListener('click', () => this.runCompare(), { signal });

    this.dom.swapBtn.addEventListener('click', () => {
      const currentLeft = this.dom.leftInput.value;
      this.dom.leftInput.value = this.dom.rightInput.value;
      this.dom.rightInput.value = currentLeft;
      this.autoCompare();
    }, { signal });

    this.dom.clearBtn.addEventListener('click', () => {
      this.dom.leftInput.value = '';
      this.dom.rightInput.value = '';
      this.cleanupView();
      this.dom.diffOutput.textContent = "";
      this.dom.diffSummary.textContent = 'Added: 0 · Removed: 0 · Changed: 0';
    }, { signal });

    this.dom.copyDiffBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(this.latestResult || '');
    }, { signal });

    this.dom.downloadDiffBtn.addEventListener('click', () => {
      download('text-diff.patch.txt', this.latestResult || '');
    }, { signal });

    this.dom.viewModeSelect.addEventListener('change', () => this.runCompare(), { signal });
    this.dom.detailModeSelect.addEventListener('change', () => this.runCompare(), { signal });

    [
      this.dom.leftInput,
      this.dom.rightInput,
      this.dom.trimTrailingToggle,
      this.dom.ignoreWhitespaceToggle,
      this.dom.ignoreCaseToggle,
      this.dom.autoCompareToggle
    ].forEach((el) => {
      el.addEventListener('input', this.autoCompare, { signal });
      el.addEventListener('change', this.autoCompare, { signal });
    });

    this.disposeKeyboardHandler = getKeyboardEventManager().register({
      root: this.dom.root,
      onKeydown: (event) => {
        if (!(event.ctrlKey || event.metaKey)) return;
        if (event.key === 'Enter') {
          event.preventDefault();
          this.runCompare();
        }
        if (event.key.toLowerCase() === 'l') {
          event.preventDefault();
          this.dom.clearBtn.click();
        }
      }
    });
  }
}

export function createTextDiffApp(root) {
  const app = new TextDiffApp(root);
  app.init();
  return app;
}

export { TOOL_ID };
