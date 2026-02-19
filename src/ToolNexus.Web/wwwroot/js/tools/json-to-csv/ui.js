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
    delimiterSelect: document.getElementById('delimiterSelect'),
    statusText: document.getElementById('statusText'),
    rowCount: document.getElementById('rowCount'),
    errorBox: document.getElementById('errorBox'),
    errorTitle: document.getElementById('errorTitle'),
    errorDetail: document.getElementById('errorDetail'),
    errorSuggestion: document.getElementById('errorSuggestion')
  };
}

export function mountJsonToCsvTool() {
  const els = getElements();
  if (!els.jsonInput || !els.csvOutput) {
    return;
  }

  let latestCsv = '';
  let converting = false;

  const setProcessing = isProcessing => {
    converting = isProcessing;
    els.convertBtn.disabled = isProcessing;
    els.convertBtn.textContent = isProcessing ? 'Converting…' : 'Convert';
    els.statusText.textContent = isProcessing ? 'Processing input…' : 'Ready';
  };

  const clearError = () => {
    els.errorBox.hidden = true;
    els.errorTitle.textContent = '';
    els.errorDetail.textContent = '';
    els.errorSuggestion.textContent = '';
  };

  const showError = error => {
    const friendly = toUserError(error);
    els.errorTitle.textContent = friendly.title;
    els.errorDetail.textContent = friendly.message;
    els.errorSuggestion.textContent = friendly.suggestion;
    els.errorBox.hidden = false;
    els.statusText.textContent = 'Fix errors to continue';
  };

  const syncActionState = () => {
    const hasOutput = latestCsv.length > 0;
    els.copyBtn.disabled = !hasOutput;
    els.downloadBtn.disabled = !hasOutput;
  };

  const runConversion = async () => {
    if (converting) {
      return;
    }

    clearError();
    setProcessing(true);

    try {
      const records = parseJsonInput(els.jsonInput.value);
      const normalized = await normalizeRows(records, {
        flattenNested: els.flattenToggle.checked,
        includeNulls: els.includeNullToggle.checked
      });

      if (normalized.headers.length === 0) {
        throw new ToolError(
          'EMPTY_OBJECTS',
          'No fields found',
          'Objects were parsed but no fields were discovered for CSV headers.',
          'Add at least one key/value pair in your JSON objects.'
        );
      }

      latestCsv = buildCsv(normalized.headers, normalized.rows, {
        delimiter: DELIMITER_MAP[els.delimiterSelect.value],
        preventCsvInjection: els.sanitizeToggle.checked
      });

      els.csvOutput.value = latestCsv;
      els.rowCount.textContent = `${normalized.rows.length.toLocaleString()} row(s), ${normalized.headers.length.toLocaleString()} column(s)`;
      els.statusText.textContent = 'Conversion completed';
    } catch (error) {
      latestCsv = '';
      els.csvOutput.value = '';
      els.rowCount.textContent = '0 row(s)';
      showError(error);
    } finally {
      setProcessing(false);
      syncActionState();
    }
  };

  els.convertBtn.addEventListener('click', runConversion);

  els.clearBtn.addEventListener('click', () => {
    els.jsonInput.value = '';
    els.csvOutput.value = '';
    latestCsv = '';
    clearError();
    els.rowCount.textContent = '0 row(s)';
    els.statusText.textContent = 'Cleared';
    syncActionState();
  });

  els.copyBtn.addEventListener('click', async () => {
    if (!latestCsv) {
      return;
    }

    await copyToClipboard(latestCsv);
    els.statusText.textContent = 'CSV copied to clipboard';
  });

  els.downloadBtn.addEventListener('click', () => {
    if (!latestCsv) {
      return;
    }

    downloadCsv(latestCsv);
    els.statusText.textContent = 'CSV downloaded';
  });

  els.jsonInput.addEventListener('input', () => {
    if (els.autoConvert.checked) {
      runConversion();
    }
  });

  [els.flattenToggle, els.includeNullToggle, els.sanitizeToggle, els.delimiterSelect].forEach(control => {
    control.addEventListener('change', () => {
      if (els.autoConvert.checked && els.jsonInput.value.trim()) {
        runConversion();
      }
    });
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

  syncActionState();
}
