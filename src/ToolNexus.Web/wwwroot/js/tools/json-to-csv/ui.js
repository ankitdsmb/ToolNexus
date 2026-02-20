import { getKeyboardEventManager } from '../keyboard-event-manager.js';
import { parseJsonInput } from './parser.js';
import { normalizeRows } from './normalizer.js';
import { buildCsv } from './csv-engine.js';
import { copyToClipboard, downloadCsv } from './exporter.js';
import { toUserError, ToolError } from './errors.js';

const DELIMITER_MAP = {
  comma: ',',
  semicolon: ';',
  tab: '\t'
};

const PREVIEW_ROW_LIMIT = 5000;
const APP_INSTANCES = new WeakMap();

function getElements(root = document) {
  return {
    jsonInput: root.querySelector('#jsonInput'),
    csvOutput: root.querySelector('#csvOutput'),
    convertBtn: root.querySelector('#convertBtn'),
    clearBtn: root.querySelector('#clearBtn'),
    copyBtn: root.querySelector('#copyBtn'),
    downloadBtn: root.querySelector('#downloadBtn'),
    autoConvert: root.querySelector('#autoConvertToggle'),
    flattenToggle: root.querySelector('#flattenToggle'),
    includeNullToggle: root.querySelector('#includeNullToggle'),
    sanitizeToggle: root.querySelector('#sanitizeToggle'),
    prettyToggle: root.querySelector('#prettyToggle'),
    delimiterSelect: root.querySelector('#delimiterSelect'),
    arrayModeSelect: root.querySelector('#arrayModeSelect'),
    arraySeparatorInput: root.querySelector('#arraySeparatorInput'),
    statusText: root.querySelector('#statusText'),
    outputStats: root.querySelector('#outputStats'),
    errorBox: root.querySelector('#errorBox'),
    errorTitle: root.querySelector('#errorTitle'),
    errorDetail: root.querySelector('#errorDetail'),
    errorSuggestion: root.querySelector('#errorSuggestion')
  };
}

function setStatus(els, message, tone = 'idle') {
  els.statusText.textContent = message;
  els.statusText.dataset.tone = tone;
}

function clearError(els) {
  els.errorBox.hidden = true;
  els.errorTitle.textContent = '';
  els.errorDetail.textContent = '';
  els.errorSuggestion.textContent = '';
}

function showError(els, error) {
  const friendly = toUserError(error);
  els.errorTitle.textContent = friendly.title;
  els.errorDetail.textContent = friendly.message;
  els.errorSuggestion.textContent = friendly.suggestion;
  els.errorBox.hidden = false;
  setStatus(els, 'Conversion failed', 'error');
}

function updateOutputStats(els, rowCount, columnCount, previewLimited) {
  const suffix = previewLimited ? ` · previewing first ${PREVIEW_ROW_LIMIT.toLocaleString()} rows` : '';
  els.outputStats.textContent = `${rowCount.toLocaleString()} row(s) · ${columnCount.toLocaleString()} column(s)${suffix}`;
}

function getOptions(els) {
  const delimiter = DELIMITER_MAP[els.delimiterSelect.value] || ',';

  return {
    delimiter,
    flattenNested: els.flattenToggle.checked,
    includeNulls: els.includeNullToggle.checked,
    preventCsvInjection: els.sanitizeToggle.checked,
    prettyInput: els.prettyToggle.checked,
    arrayMode: els.arrayModeSelect.value,
    arraySeparator: els.arraySeparatorInput.value
  };
}

export function mountJsonToCsvTool(root = document) {
  const els = getElements(root);
  if (!els.jsonInput || !els.csvOutput) {
    return null;
  }

  const ownerRoot = root instanceof Document
    ? (els.jsonInput.closest('[data-tool="json-to-csv"], .tool-page, main, form, article, section') ?? els.jsonInput.parentElement ?? document.body)
    : root;
  if (APP_INSTANCES.has(ownerRoot)) {
    return APP_INSTANCES.get(ownerRoot);
  }

  const disposers = [];
  let latestCsv = '';
  let converting = false;
  let autoConvertTimer = null;

  const on = (el, ev, fn) => {
    if (!el) return;
    el.addEventListener(ev, fn);
    disposers.push(() => el.removeEventListener(ev, fn));
  };

  const syncActionState = () => {
    const hasInput = els.jsonInput.value.trim().length > 0;
    const hasOutput = latestCsv.length > 0;

    els.convertBtn.disabled = converting || !hasInput;
    els.clearBtn.disabled = converting && !hasInput;
    els.copyBtn.disabled = converting || !hasOutput;
    els.downloadBtn.disabled = converting || !hasOutput;
  };

  const setProcessing = (isProcessing) => {
    converting = isProcessing;
    els.convertBtn.textContent = isProcessing ? 'Converting…' : 'Convert';
    setStatus(els, isProcessing ? 'Processing JSON input…' : 'Ready');
    syncActionState();
  };

  const runConversion = async () => {
    if (converting) {
      return;
    }

    clearError(els);
    setProcessing(true);

    try {
      const options = getOptions(els);
      const records = parseJsonInput(els.jsonInput.value);

      if (options.prettyInput) {
        els.jsonInput.value = JSON.stringify(records, null, 2);
      }

      const normalized = await normalizeRows(records, {
        flattenNested: options.flattenNested,
        includeNulls: options.includeNulls,
        arrayMode: options.arrayMode,
        arraySeparator: options.arraySeparator
      });

      if (normalized.headers.length === 0) {
        throw new ToolError(
          'EMPTY_OBJECTS',
          'No fields discovered',
          'Objects were parsed, but there are no fields available for CSV headers.',
          'Add at least one key/value pair in your JSON objects.'
        );
      }

      latestCsv = buildCsv(normalized.headers, normalized.rows, {
        delimiter: options.delimiter,
        preventCsvInjection: options.preventCsvInjection
      });

      const outputLines = latestCsv.split('\n');
      const previewLimited = outputLines.length > PREVIEW_ROW_LIMIT + 1;
      els.csvOutput.value = outputLines.slice(0, PREVIEW_ROW_LIMIT + 1).join('\n');

      updateOutputStats(els, normalized.rows.length, normalized.headers.length, previewLimited);
      setStatus(els, 'Conversion completed', 'success');
    } catch (error) {
      latestCsv = '';
      els.csvOutput.value = '';
      updateOutputStats(els, 0, 0, false);
      showError(els, error);
    } finally {
      setProcessing(false);
      syncActionState();
    }
  };

  const scheduleAutoConvert = () => {
    if (!els.autoConvert.checked) {
      return;
    }

    window.clearTimeout(autoConvertTimer);
    autoConvertTimer = window.setTimeout(() => {
      void runConversion();
    }, 250);
  };

  on(els.convertBtn, 'click', () => { void runConversion(); });

  on(els.clearBtn, 'click', () => {
    els.jsonInput.value = '';
    els.csvOutput.value = '';
    latestCsv = '';
    clearError(els);
    updateOutputStats(els, 0, 0, false);
    setStatus(els, 'Input cleared', 'idle');
    syncActionState();
  });

  on(els.copyBtn, 'click', async () => {
    if (!latestCsv) {
      return;
    }

    try {
      await copyToClipboard(latestCsv);
      setStatus(els, 'CSV copied to clipboard', 'success');
    } catch {
      showError(els, new ToolError(
        'CLIPBOARD_UNAVAILABLE',
        'Clipboard unavailable',
        'Unable to access your clipboard in this browser context.',
        'Copy the output manually from the CSV panel.'
      ));
    }
  });

  on(els.downloadBtn, 'click', () => {
    if (!latestCsv) {
      return;
    }

    downloadCsv(latestCsv);
    setStatus(els, 'CSV downloaded', 'success');
  });

  on(els.jsonInput, 'input', () => {
    syncActionState();
    scheduleAutoConvert();
  });

  [
    els.flattenToggle,
    els.includeNullToggle,
    els.sanitizeToggle,
    els.prettyToggle,
    els.delimiterSelect,
    els.arrayModeSelect,
    els.arraySeparatorInput
  ].forEach((control) => {
    on(control, 'change', scheduleAutoConvert);
  });

  const disposeKeyboard = getKeyboardEventManager().register({
    root: ownerRoot,
    onKeydown: (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        void runConversion();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        els.clearBtn.click();
      }
    }
  });


  const onWindowKeydown = (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      void runConversion();
    }

    if (event.key.toLowerCase() === 'l') {
      event.preventDefault();
      els.clearBtn.click();
    }
  };
  window.addEventListener('keydown', onWindowKeydown);

  updateOutputStats(els, 0, 0, false);
  syncActionState();

  const app = {
    destroy() {
      disposeKeyboard?.();
      window.removeEventListener('keydown', onWindowKeydown);
      window.clearTimeout(autoConvertTimer);
      while (disposers.length) disposers.pop()?.();
      APP_INSTANCES.delete(ownerRoot);
    }
  };

  APP_INSTANCES.set(ownerRoot, app);
  return app;
}
