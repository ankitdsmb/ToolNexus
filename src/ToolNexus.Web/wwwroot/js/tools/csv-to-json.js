const DEFAULT_PREVIEW_ROWS = 50;
const CHUNK_SIZE = 2000;
const FORMULA_PREFIXES = new Set(['=', '+', '-', '@']);

class CsvParseError extends Error {
  constructor(message, row) {
    super(message);
    this.name = 'CsvParseError';
    this.row = row;
  }
}

const idle = () => new Promise((resolve) => setTimeout(resolve, 0));

function normalizeHeaders(rawHeaders) {
  const used = new Map();
  return rawHeaders.map((header, index) => {
    const base = String(header ?? '').trim() || `column_${index + 1}`;
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

function parseCustomHeaders(value) {
  if (!value.trim()) {
    return [];
  }

  return normalizeHeaders(value.split(',').map((header) => header.trim()));
}

function parseCsvRecords(input, delimiter) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let rowIndex = 1;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (char === '"') {
      if (inQuotes && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(field);
      field = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && input[i + 1] === '\n') {
        i += 1;
      }

      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      rowIndex += 1;
      continue;
    }

    field += char;
  }

  if (inQuotes) {
    throw new CsvParseError('Unclosed quoted value detected.', rowIndex);
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function coerceValue(value, detectTypes, emptyAsNull, sanitizeFormulas) {
  const trimmed = value.trim();

  if (!trimmed) {
    return emptyAsNull ? null : '';
  }

  if (sanitizeFormulas && FORMULA_PREFIXES.has(trimmed[0])) {
    return `'${trimmed}`;
  }

  if (!detectTypes) {
    return trimmed;
  }

  if (/^(true|false)$/i.test(trimmed)) {
    return trimmed.toLowerCase() === 'true';
  }

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  return trimmed;
}

async function transformRowsToObjects(rows, options) {
  if (!rows.length) {
    return { records: [], headers: [] };
  }

  const sourceHeaders = options.useHeaderRow
    ? rows[0]
    : (options.customHeaders.length ? options.customHeaders : rows[0].map((_, index) => `column_${index + 1}`));

  const headers = normalizeHeaders(sourceHeaders);
  const dataStart = options.useHeaderRow ? 1 : 0;
  const records = [];

  for (let i = dataStart; i < rows.length; i += 1) {
    const sourceRow = rows[i];
    const record = {};

    for (let h = 0; h < headers.length; h += 1) {
      const rawValue = sourceRow[h] ?? '';
      record[headers[h]] = coerceValue(rawValue, options.typeDetection, options.emptyAsNull, options.sanitizeFormulas);
    }

    records.push(record);

    if (i % CHUNK_SIZE === 0) {
      await idle();
    }
  }

  return { records, headers };
}

function formatError(error) {
  if (error instanceof CsvParseError) {
    return `CSV Parsing Error\n${error.message}\nApproximate row: ${error.row}`;
  }

  return `Conversion Error\n${error.message || 'Unable to convert CSV input.'}`;
}

async function convertCsvToJson(input, config) {
  const rows = parseCsvRecords(input, config.delimiter);
  const { records, headers } = await transformRowsToObjects(rows, config);

  const previewSize = Number.isFinite(config.previewRows) ? Math.max(1, config.previewRows) : DEFAULT_PREVIEW_ROWS;
  const previewRecords = records.slice(0, previewSize);

  return {
    allRecords: records,
    previewRecords,
    headers,
    rowCount: records.length,
    json: JSON.stringify(previewRecords, null, config.pretty ? config.indent : 0)
  };
}

function initCsvToJsonApp() {
  const root = document.querySelector('.csv-json-page');
  if (!root) {
    return;
  }

  const dom = {
    convertBtn: document.getElementById('convertBtn'),
    clearBtn: document.getElementById('clearBtn'),
    copyBtn: document.getElementById('copyBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    delimiterSelect: document.getElementById('delimiterSelect'),
    useHeaderToggle: document.getElementById('useHeaderToggle'),
    customHeadersField: document.getElementById('customHeadersField'),
    customHeadersInput: document.getElementById('customHeadersInput'),
    autoConvertToggle: document.getElementById('autoConvertToggle'),
    prettyToggle: document.getElementById('prettyToggle'),
    indentSelect: document.getElementById('indentSelect'),
    typeDetectToggle: document.getElementById('typeDetectToggle'),
    emptyAsNullToggle: document.getElementById('emptyAsNullToggle'),
    sanitizeToggle: document.getElementById('sanitizeToggle'),
    previewRowsInput: document.getElementById('previewRowsInput'),
    statusText: document.getElementById('statusText'),
    errorBox: document.getElementById('errorBox'),
    csvInput: document.getElementById('csvInput'),
    jsonOutput: document.getElementById('jsonOutput'),
    rowCount: document.getElementById('rowCount'),
    charCount: document.getElementById('charCount')
  };

  let lastResult = '';

  const setBusy = (busy, status) => {
    dom.convertBtn.disabled = busy || !dom.csvInput.value.trim();
    dom.clearBtn.disabled = busy;
    dom.copyBtn.disabled = busy || !lastResult;
    dom.downloadBtn.disabled = busy || !lastResult;
    dom.statusText.textContent = status;
  };

  const clearError = () => {
    dom.errorBox.hidden = true;
    dom.errorBox.textContent = '';
  };

  const showError = (message) => {
    dom.errorBox.hidden = false;
    dom.errorBox.textContent = message;
  };

  const getConfig = () => ({
    delimiter: dom.delimiterSelect.value === '\t' ? '\t' : dom.delimiterSelect.value,
    useHeaderRow: dom.useHeaderToggle.checked,
    customHeaders: parseCustomHeaders(dom.customHeadersInput.value),
    pretty: dom.prettyToggle.checked,
    indent: Number(dom.indentSelect.value),
    typeDetection: dom.typeDetectToggle.checked,
    emptyAsNull: dom.emptyAsNullToggle.checked,
    sanitizeFormulas: dom.sanitizeToggle.checked,
    previewRows: Number(dom.previewRowsInput.value || DEFAULT_PREVIEW_ROWS)
  });

  const updateMetrics = (rowCount, charCount) => {
    dom.rowCount.textContent = `Rows: ${rowCount}`;
    dom.charCount.textContent = `Chars: ${charCount}`;
  };

  const runConversion = async () => {
    const input = dom.csvInput.value;

    if (!input.trim()) {
      dom.jsonOutput.value = '';
      lastResult = '';
      updateMetrics(0, 0);
      setBusy(false, 'Input is empty.');
      return;
    }

    setBusy(true, 'Processing CSV…');
    clearError();

    try {
      const result = await convertCsvToJson(input, getConfig());
      lastResult = result.json;
      dom.jsonOutput.value = result.json;
      updateMetrics(result.rowCount, result.json.length);
      const previewRows = Number(dom.previewRowsInput.value || DEFAULT_PREVIEW_ROWS);
      const previewSuffix = result.rowCount > previewRows ? ` (previewing first ${previewRows})` : '';
      setBusy(false, `Converted ${result.rowCount} rows${previewSuffix}.`);
    } catch (error) {
      lastResult = '';
      dom.jsonOutput.value = '';
      updateMetrics(0, 0);
      showError(formatError(error));
      setBusy(false, 'Conversion failed.');
    }
  };

  const clearAll = () => {
    dom.csvInput.value = '';
    dom.jsonOutput.value = '';
    dom.customHeadersInput.value = '';
    lastResult = '';
    clearError();
    updateMetrics(0, 0);
    setBusy(false, 'Cleared.');
    dom.csvInput.focus();
  };

  dom.useHeaderToggle.addEventListener('change', () => {
    dom.customHeadersField.hidden = dom.useHeaderToggle.checked;
    if (dom.autoConvertToggle.checked) {
      runConversion();
    }
  });

  dom.convertBtn.addEventListener('click', runConversion);
  dom.clearBtn.addEventListener('click', clearAll);

  dom.copyBtn.addEventListener('click', async () => {
    if (!lastResult) {
      return;
    }

    try {
      await navigator.clipboard.writeText(lastResult);
      setBusy(false, 'JSON copied to clipboard.');
    } catch {
      showError('Copy failed. Clipboard access was blocked by the browser.');
    }
  });

  dom.downloadBtn.addEventListener('click', () => {
    if (!lastResult) {
      return;
    }

    const blob = new Blob([lastResult], { type: 'application/json;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'converted.json';
    link.click();
    URL.revokeObjectURL(link.href);
    setBusy(false, 'Download started.');
  });

  const autoConvertHandler = () => {
    setBusy(false, dom.csvInput.value.trim() ? 'Ready to convert.' : 'Input is empty.');
    if (dom.autoConvertToggle.checked) {
      runConversion();
    }
  };

  [
    dom.csvInput,
    dom.delimiterSelect,
    dom.customHeadersInput,
    dom.prettyToggle,
    dom.indentSelect,
    dom.typeDetectToggle,
    dom.emptyAsNullToggle,
    dom.sanitizeToggle,
    dom.previewRowsInput
  ].forEach((element) => {
    element.addEventListener('input', autoConvertHandler);
    element.addEventListener('change', autoConvertHandler);
  });

  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      runConversion();
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      clearAll();
    }
  });

  setBusy(false, 'Ready');
}

document.addEventListener('DOMContentLoaded', initCsvToJsonApp);

export async function runTool(action, input) {
  if (action !== 'convert') {
    throw new Error(`Unsupported action: ${action}`);
  }

  const result = await convertCsvToJson(input, {
    delimiter: ',',
    useHeaderRow: true,
    customHeaders: [],
    pretty: true,
    indent: 2,
    typeDetection: true,
    emptyAsNull: true,
    sanitizeFormulas: false,
    previewRows: Number.MAX_SAFE_INTEGER
  });

  return JSON.stringify(result.allRecords, null, 2);
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['csv-to-json'] = { runTool };
