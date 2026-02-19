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

function getElements() {
  return {
    jsonInput: document.getElementById('jsonInput'),
    csvOutput: document.getElementById('csvOutput'),
    convertBtn: document.getElementById('convertBtn'),
    clearBtn: document.getElementById('clearBtn'),
    copyBtn: document.getElementById('copyBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    autoConvert: document.getElementById('autoConvertToggle'),
    flattenToggle: document.getElementById('flattenToggle'),
    includeNullToggle: document.getElementById('includeNullToggle'),
    sanitizeToggle: document.getElementById('sanitizeToggle'),
    prettyToggle: document.getElementById('prettyToggle'),
    delimiterSelect: document.getElementById('delimiterSelect'),
    arrayModeSelect: document.getElementById('arrayModeSelect'),
    arraySeparatorInput: document.getElementById('arraySeparatorInput'),
    statusText: document.getElementById('statusText'),
    outputStats: document.getElementById('outputStats'),
    errorBox: document.getElementById('errorBox'),
    errorTitle: document.getElementById('errorTitle'),
    errorDetail: document.getElementById('errorDetail'),
    errorSuggestion: document.getElementById('errorSuggestion')
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

export function mountJsonToCsvTool() {
  const els = getElements();
  if (!els.jsonInput || !els.csvOutput) {
    return;
  }

  let latestCsv = '';
  let converting = false;
  let autoConvertTimer = null;

  const syncActionState = () => {
    const hasInput = els.jsonInput.value.trim().length > 0;
    const hasOutput = latestCsv.length > 0;

    els.convertBtn.disabled = converting || !hasInput;
    els.clearBtn.disabled = converting && !hasInput;
    els.copyBtn.disabled = converting || !hasOutput;
    els.downloadBtn.disabled = converting || !hasOutput;
  };

  const setProcessing = isProcessing => {
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
      runConversion();
    }, 250);
  };

  els.convertBtn.addEventListener('click', runConversion);

  els.clearBtn.addEventListener('click', () => {
    els.jsonInput.value = '';
    els.csvOutput.value = '';
    latestCsv = '';
    clearError(els);
    updateOutputStats(els, 0, 0, false);
    setStatus(els, 'Input cleared', 'idle');
    syncActionState();
  });

  els.copyBtn.addEventListener('click', async () => {
    if (!latestCsv) {
      return;
    }

    await copyToClipboard(latestCsv);
    setStatus(els, 'CSV copied to clipboard', 'success');
  });

  els.downloadBtn.addEventListener('click', () => {
    if (!latestCsv) {
      return;
    }

    downloadCsv(latestCsv);
    setStatus(els, 'CSV downloaded', 'success');
  });

  els.jsonInput.addEventListener('input', () => {
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
  ].forEach(control => {
    control.addEventListener('change', scheduleAutoConvert);
  });

  window.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      runConversion();
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      els.clearBtn.click();
    }
  });

  updateOutputStats(els, 0, 0, false);
  syncActionState();
}
