import { getKeyboardEventManager } from './keyboard-event-manager.js';
import { getToolPlatformKernel, normalizeToolRoot } from './tool-platform-kernel.js';
import { assertRunToolExecutionOnly } from './tool-lifecycle-guard.js';

const VIEWER_STATE = {
  parsed: null,
  filteredRows: [],
  visibleColumns: [],
  sort: { columnIndex: null, direction: null },
  searchTerm: '',
  columnFilters: new Map(),
  pageSize: 200,
  currentPage: 1,
  settings: {
    delimiter: ',',
    hasHeaderRow: true,
    sanitizeCells: false,
    detectTypes: true
  },
  rawInput: '',
  keyboardDispose: null
};

const DELIMITER_OPTIONS = {
  comma: ',',
  semicolon: ';',
  tab: '\t'
};

const TYPE_PRIORITY = ['number', 'boolean', 'date', 'string'];

function ensureViewerUi() {
  if (document.getElementById('csvViewerShell')) return;

  const inputPanel = document.querySelector('.tool-layout__panel');
  const outputPanel = document.querySelector('.tool-panel--output');
  const outputField = document.getElementById('outputField');

  if (!inputPanel || !outputPanel) return;

  const controls = document.createElement('section');
  controls.id = 'csvViewerControls';
  controls.className = 'csv-viewer-controls tool-panel';
  controls.innerHTML = `
    <div class="csv-viewer-controls__header">
      <h3>CSV Viewer</h3>
      <span class="csv-viewer-badge">Client-side processing</span>
    </div>
    <p class="csv-viewer-controls__description">Upload CSV files or paste content, then inspect data with sorting, filtering, and pagination.</p>
    <div class="csv-viewer-controls__grid">
      <label class="csv-viewer-field">
        <span>Delimiter</span>
        <select id="csvDelimiterSelect">
          <option value="comma">Comma (,)</option>
          <option value="semicolon">Semicolon (;)</option>
          <option value="tab">Tab (\t)</option>
        </select>
      </label>
      <label class="csv-viewer-field csv-viewer-field--checkbox">
        <input id="csvHeaderToggle" type="checkbox" checked />
        <span>Header row present</span>
      </label>
      <label class="csv-viewer-field csv-viewer-field--checkbox">
        <input id="csvSanitizeToggle" type="checkbox" />
        <span>Sanitize formula-like cells</span>
      </label>
      <label class="csv-viewer-field csv-viewer-field--checkbox">
        <input id="csvTypeToggle" type="checkbox" checked />
        <span>Auto-detect column types</span>
      </label>
      <label class="csv-viewer-field">
        <span>Search rows</span>
        <input id="csvSearchInput" type="search" placeholder="Find text across all columns" />
      </label>
      <label class="csv-viewer-field">
        <span>Rows per page</span>
        <select id="csvPageSizeSelect">
          <option value="100">100</option>
          <option value="200" selected>200</option>
          <option value="500">500</option>
          <option value="1000">1000</option>
        </select>
      </label>
    </div>
    <div class="csv-viewer-controls__actions">
      <input id="csvFileInput" type="file" accept=".csv,text/csv,text/plain" hidden />
      <button id="csvUploadBtn" class="tool-btn tool-btn--outline" type="button">Upload CSV</button>
      <button id="csvClearBtn" class="tool-btn tool-btn--ghost" type="button">Clear</button>
      <button id="csvDownloadBtn" class="tool-btn tool-btn--ghost" type="button" disabled>Download CSV</button>
      <button id="csvCopyBtn" class="tool-btn tool-btn--ghost" type="button" disabled>Copy table</button>
    </div>
    <div id="csvDropZone" class="csv-drop-zone" tabindex="0">Drop CSV file here</div>
  `;

  inputPanel.appendChild(controls);

  const shell = document.createElement('section');
  shell.id = 'csvViewerShell';
  shell.className = 'csv-viewer-shell';
  shell.innerHTML = `
    <div class="csv-viewer-status">
      <div id="csvViewerSummary" class="csv-viewer-summary">No dataset loaded.</div>
      <div id="csvViewerLoading" class="csv-viewer-loading" hidden>Processing CSV…</div>
    </div>
    <div id="csvViewerError" class="csv-viewer-error" hidden></div>
    <details class="csv-column-panel" open>
      <summary>Column visibility + filters</summary>
      <div id="csvColumnControls" class="csv-column-controls"></div>
    </details>
    <div class="csv-table-frame">
      <div class="csv-table-scroll">
        <table id="csvViewerTable" class="csv-viewer-table">
          <thead></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
    <div class="csv-pagination">
      <button id="csvPrevPage" class="tool-btn tool-btn--ghost" type="button" disabled>Previous</button>
      <span id="csvPageInfo">Page 0 / 0</span>
      <button id="csvNextPage" class="tool-btn tool-btn--ghost" type="button" disabled>Next</button>
    </div>
  `;

  outputPanel.appendChild(shell);
  outputField?.classList.add('csv-viewer-output-hidden');
  bindUiEvents();
}

function bindUiEvents() {
  const fileInput = document.getElementById('csvFileInput');
  const uploadBtn = document.getElementById('csvUploadBtn');
  const clearBtn = document.getElementById('csvClearBtn');
  const searchInput = document.getElementById('csvSearchInput');
  const delimiterSelect = document.getElementById('csvDelimiterSelect');
  const headerToggle = document.getElementById('csvHeaderToggle');
  const sanitizeToggle = document.getElementById('csvSanitizeToggle');
  const typeToggle = document.getElementById('csvTypeToggle');
  const pageSizeSelect = document.getElementById('csvPageSizeSelect');
  const dropZone = document.getElementById('csvDropZone');
  const prevPageBtn = document.getElementById('csvPrevPage');
  const nextPageBtn = document.getElementById('csvNextPage');
  const downloadBtn = document.getElementById('csvDownloadBtn');
  const copyBtn = document.getElementById('csvCopyBtn');

  uploadBtn?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;

    const text = await file.text();
    setInputEditorValue(text);
    VIEWER_STATE.rawInput = text;
    await processAndRender(text);
    fileInput.value = '';
  });

  clearBtn?.addEventListener('click', () => clearViewer(true));

  searchInput?.addEventListener('input', () => {
    VIEWER_STATE.searchTerm = (searchInput.value || '').trim().toLowerCase();
    VIEWER_STATE.currentPage = 1;
    renderDerivedDataset();
  });

  delimiterSelect?.addEventListener('change', () => {
    VIEWER_STATE.settings.delimiter = DELIMITER_OPTIONS[delimiterSelect.value] ?? ',';
  });

  headerToggle?.addEventListener('change', () => {
    VIEWER_STATE.settings.hasHeaderRow = headerToggle.checked;
  });

  sanitizeToggle?.addEventListener('change', () => {
    VIEWER_STATE.settings.sanitizeCells = sanitizeToggle.checked;
    renderDerivedDataset();
  });

  typeToggle?.addEventListener('change', () => {
    VIEWER_STATE.settings.detectTypes = typeToggle.checked;
  });

  pageSizeSelect?.addEventListener('change', () => {
    VIEWER_STATE.pageSize = Number.parseInt(pageSizeSelect.value, 10) || 200;
    VIEWER_STATE.currentPage = 1;
    renderDerivedDataset();
  });

  prevPageBtn?.addEventListener('click', () => {
    VIEWER_STATE.currentPage = Math.max(1, VIEWER_STATE.currentPage - 1);
    renderTable();
  });

  nextPageBtn?.addEventListener('click', () => {
    const totalPages = getTotalPages();
    VIEWER_STATE.currentPage = Math.min(totalPages, VIEWER_STATE.currentPage + 1);
    renderTable();
  });

  downloadBtn?.addEventListener('click', downloadCsv);
  copyBtn?.addEventListener('click', copyVisibleTable);

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add('is-dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove('is-dragover');
    });
  });

  dropZone?.addEventListener('drop', async (event) => {
    const [file] = event.dataTransfer?.files || [];
    if (!file) return;

    const text = await file.text();
    setInputEditorValue(text);
    VIEWER_STATE.rawInput = text;
    await processAndRender(text);
  });

  if (!VIEWER_STATE.keyboardDispose) {
    VIEWER_STATE.keyboardDispose = getKeyboardEventManager().register({
      root: document.querySelector('.tool-page[data-slug="csv-viewer"]'),
      onKeydown: (event) => {
        if (!event.ctrlKey && !event.metaKey) return;

        if (event.key.toLowerCase() === 'l') {
          event.preventDefault();
          clearViewer(true);
          return;
        }

        if (event.key.toLowerCase() === 'f') {
          const target = document.getElementById('csvSearchInput');
          if (!target) return;
          event.preventDefault();
          target.focus();
          target.select();
        }
      }
    });
  }
}

function clearViewer(clearInput) {
  VIEWER_STATE.parsed = null;
  VIEWER_STATE.filteredRows = [];
  VIEWER_STATE.columnFilters = new Map();
  VIEWER_STATE.visibleColumns = [];
  VIEWER_STATE.sort = { columnIndex: null, direction: null };
  VIEWER_STATE.currentPage = 1;
  VIEWER_STATE.searchTerm = '';
  VIEWER_STATE.rawInput = '';

  if (clearInput) {
    setInputEditorValue('');
  }

  const searchInput = document.getElementById('csvSearchInput');
  if (searchInput) searchInput.value = '';

  renderSummary('No dataset loaded.');
  hideError();
  renderColumnControls();
  renderTable();
  updateActionButtons();
}

async function processAndRender(input) {
  const raw = input ?? '';
  if (!raw.trim()) {
    clearViewer(false);
    return;
  }

  showLoading(true);
  hideError();

  await nextFrame();

  try {
    const parsed = parseCsv(raw, VIEWER_STATE.settings.delimiter);
    const normalized = normalizeCsvRows(parsed.rows, {
      hasHeaderRow: VIEWER_STATE.settings.hasHeaderRow,
      detectTypes: VIEWER_STATE.settings.detectTypes
    });

    VIEWER_STATE.rawInput = raw;
    VIEWER_STATE.parsed = normalized;
    VIEWER_STATE.sort = { columnIndex: null, direction: null };
    VIEWER_STATE.columnFilters = new Map();
    VIEWER_STATE.visibleColumns = normalized.columns.map((_, index) => index);
    VIEWER_STATE.currentPage = 1;

    renderDerivedDataset();
  } catch (error) {
    showError(formatParseError(error));
    renderSummary('Dataset failed to parse.');
    VIEWER_STATE.parsed = null;
    renderTable();
  } finally {
    showLoading(false);
    updateActionButtons();
  }
}

function parseCsv(text, delimiter = ',') {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let rowNumber = 1;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
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
      if (char === '\r' && nextChar === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      rowNumber += 1;
      continue;
    }

    field += char;
  }

  if (inQuotes) {
    const parseError = new Error('Unclosed quoted value detected.');
    parseError.rowNumber = rowNumber;
    throw parseError;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return { rows };
}

function normalizeCsvRows(rows, options) {
  const safeRows = Array.isArray(rows) ? rows : [];
  if (safeRows.length === 0) {
    return {
      columns: [],
      rows: [],
      columnTypes: []
    };
  }

  const trimmedRows = safeRows.map((row) => row.map((cell) => `${cell ?? ''}`));
  const maxColumns = trimmedRows.reduce((max, row) => Math.max(max, row.length), 0);
  const paddedRows = trimmedRows.map((row) => {
    const next = row.slice(0, maxColumns);
    while (next.length < maxColumns) next.push('');
    return next;
  });

  const hasHeaderRow = options?.hasHeaderRow !== false;
  const rawHeader = hasHeaderRow ? paddedRows[0] : [];
  const columns = hasHeaderRow
    ? rawHeader.map((header, index) => (header || '').trim() || `Column ${index + 1}`)
    : Array.from({ length: maxColumns }, (_, index) => `Column ${index + 1}`);

  const dataRows = hasHeaderRow ? paddedRows.slice(1) : paddedRows;
  const columnTypes = options?.detectTypes ? detectColumnTypes(dataRows) : Array(columns.length).fill('string');

  return {
    columns,
    rows: dataRows,
    columnTypes
  };
}

function detectColumnTypes(rows) {
  if (!rows.length) return [];

  return rows[0].map((_, columnIndex) => {
    const sampleValues = rows
      .map((row) => (row[columnIndex] || '').trim())
      .filter(Boolean)
      .slice(0, 300);

    if (sampleValues.length === 0) return 'string';

    const stats = {
      number: sampleValues.filter((value) => !Number.isNaN(Number(value))).length,
      boolean: sampleValues.filter((value) => /^(true|false)$/i.test(value)).length,
      date: sampleValues.filter((value) => !Number.isNaN(Date.parse(value))).length,
      string: sampleValues.length
    };

    const threshold = Math.max(1, Math.floor(sampleValues.length * 0.85));

    for (const type of TYPE_PRIORITY) {
      if (type === 'string') continue;
      if (stats[type] >= threshold) return type;
    }

    return 'string';
  });
}

function renderDerivedDataset() {
  if (!VIEWER_STATE.parsed) {
    renderColumnControls();
    renderTable();
    return;
  }

  const baseRows = applyColumnFilters(VIEWER_STATE.parsed.rows);
  const searchedRows = applySearch(baseRows);
  const sortedRows = applySorting(searchedRows);

  VIEWER_STATE.filteredRows = sortedRows;

  const totalRows = VIEWER_STATE.parsed.rows.length;
  const shownRows = sortedRows.length;
  renderSummary(`Rows: ${shownRows.toLocaleString()} / ${totalRows.toLocaleString()} • Columns: ${VIEWER_STATE.visibleColumns.length}/${VIEWER_STATE.parsed.columns.length}`);

  renderColumnControls();
  renderTable();
  updateActionButtons();
}

function applyColumnFilters(rows) {
  const activeFilters = [...VIEWER_STATE.columnFilters.entries()].filter(([, value]) => value);
  if (!activeFilters.length) return rows.slice();

  return rows.filter((row) => activeFilters.every(([columnIndex, value]) => (row[columnIndex] || '').toLowerCase().includes(value)));
}

function applySearch(rows) {
  const term = VIEWER_STATE.searchTerm;
  if (!term) return rows;

  return rows.filter((row) => row.some((cell, index) => {
    if (!VIEWER_STATE.visibleColumns.includes(index)) return false;
    return (cell || '').toLowerCase().includes(term);
  }));
}

function applySorting(rows) {
  const { columnIndex, direction } = VIEWER_STATE.sort;
  if (columnIndex === null || !direction) return rows;

  const type = VIEWER_STATE.parsed?.columnTypes[columnIndex] || 'string';

  return rows
    .map((row, originalIndex) => ({ row, originalIndex }))
    .sort((a, b) => {
      const left = a.row[columnIndex] ?? '';
      const right = b.row[columnIndex] ?? '';
      const compareValue = compareCells(left, right, type);

      if (compareValue !== 0) {
        return direction === 'asc' ? compareValue : -compareValue;
      }

      return a.originalIndex - b.originalIndex;
    })
    .map((entry) => entry.row);
}

function compareCells(left, right, type) {
  if (type === 'number') return Number(left) - Number(right);
  if (type === 'boolean') return Number(/^true$/i.test(left)) - Number(/^true$/i.test(right));
  if (type === 'date') return Date.parse(left) - Date.parse(right);
  return `${left}`.localeCompare(`${right}`, undefined, { sensitivity: 'base', numeric: true });
}

function renderColumnControls() {
  const target = document.getElementById('csvColumnControls');
  if (!target) return;

  const parsed = VIEWER_STATE.parsed;
  if (!parsed || !parsed.columns.length) {
    target.innerHTML = '<p class="csv-column-controls__empty">Load CSV data to configure columns.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  parsed.columns.forEach((columnName, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'csv-column-control';

    const checkboxId = `csv-col-visible-${index}`;
    const filterId = `csv-col-filter-${index}`;
    const checked = VIEWER_STATE.visibleColumns.includes(index);

    wrapper.innerHTML = `
      <label for="${checkboxId}" class="csv-column-control__toggle">
        <input id="${checkboxId}" type="checkbox" ${checked ? 'checked' : ''} />
        <span>${escapeHtml(columnName)} <em>(${parsed.columnTypes[index] || 'string'})</em></span>
      </label>
      <input id="${filterId}" type="search" placeholder="Filter ${escapeHtml(columnName)}" value="${escapeAttribute(VIEWER_STATE.columnFilters.get(index) || '')}" />
    `;

    const visibilityToggle = wrapper.querySelector(`#${CSS.escape(checkboxId)}`);
    const filterInput = wrapper.querySelector(`#${CSS.escape(filterId)}`);

    visibilityToggle?.addEventListener('change', () => {
      if (visibilityToggle.checked) {
        VIEWER_STATE.visibleColumns = [...new Set([...VIEWER_STATE.visibleColumns, index])].sort((a, b) => a - b);
      } else if (VIEWER_STATE.visibleColumns.length > 1) {
        VIEWER_STATE.visibleColumns = VIEWER_STATE.visibleColumns.filter((value) => value !== index);
      } else {
        visibilityToggle.checked = true;
      }
      renderDerivedDataset();
    });

    filterInput?.addEventListener('input', () => {
      VIEWER_STATE.columnFilters.set(index, filterInput.value.trim().toLowerCase());
      VIEWER_STATE.currentPage = 1;
      renderDerivedDataset();
    });

    fragment.appendChild(wrapper);
  });

  target.innerHTML = '';
  target.appendChild(fragment);
}

function renderTable() {
  const table = document.getElementById('csvViewerTable');
  const pageInfo = document.getElementById('csvPageInfo');
  const prevPageBtn = document.getElementById('csvPrevPage');
  const nextPageBtn = document.getElementById('csvNextPage');

  if (!table) return;

  const head = table.querySelector('thead');
  const body = table.querySelector('tbody');

  const parsed = VIEWER_STATE.parsed;
  if (!parsed || !parsed.columns.length) {
    head.innerHTML = '';
    body.innerHTML = '<tr><td class="csv-empty-cell">No data to display.</td></tr>';
    if (pageInfo) pageInfo.textContent = 'Page 0 / 0';
    if (prevPageBtn) prevPageBtn.disabled = true;
    if (nextPageBtn) nextPageBtn.disabled = true;
    return;
  }

  const visibleColumns = VIEWER_STATE.visibleColumns;
  const totalPages = getTotalPages();
  VIEWER_STATE.currentPage = Math.min(Math.max(1, VIEWER_STATE.currentPage), totalPages);

  const startIndex = (VIEWER_STATE.currentPage - 1) * VIEWER_STATE.pageSize;
  const endIndex = startIndex + VIEWER_STATE.pageSize;
  const pageRows = VIEWER_STATE.filteredRows.slice(startIndex, endIndex);

  const headRow = document.createElement('tr');
  visibleColumns.forEach((columnIndex) => {
    const columnName = parsed.columns[columnIndex];
    const th = document.createElement('th');
    th.scope = 'col';
    th.className = 'csv-col-header';
    th.textContent = columnName;
    th.dataset.sorted = VIEWER_STATE.sort.columnIndex === columnIndex ? VIEWER_STATE.sort.direction || 'none' : 'none';
    th.title = `Sort by ${columnName}`;
    th.addEventListener('click', () => toggleSort(columnIndex));
    headRow.appendChild(th);
  });

  const bodyFragment = document.createDocumentFragment();
  pageRows.forEach((row) => {
    const tr = document.createElement('tr');

    visibleColumns.forEach((columnIndex) => {
      const td = document.createElement('td');
      td.textContent = formatCell(row[columnIndex] || '');
      tr.appendChild(td);
    });

    bodyFragment.appendChild(tr);
  });

  if (!pageRows.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = visibleColumns.length;
    td.className = 'csv-empty-cell';
    td.textContent = 'No rows match current filters.';
    tr.appendChild(td);
    bodyFragment.appendChild(tr);
  }

  head.innerHTML = '';
  head.appendChild(headRow);

  body.innerHTML = '';
  body.appendChild(bodyFragment);

  if (pageInfo) pageInfo.textContent = `Page ${VIEWER_STATE.currentPage} / ${totalPages}`;
  if (prevPageBtn) prevPageBtn.disabled = VIEWER_STATE.currentPage <= 1;
  if (nextPageBtn) nextPageBtn.disabled = VIEWER_STATE.currentPage >= totalPages;
}

function toggleSort(columnIndex) {
  const current = VIEWER_STATE.sort;
  if (current.columnIndex !== columnIndex) {
    VIEWER_STATE.sort = { columnIndex, direction: 'asc' };
  } else if (current.direction === 'asc') {
    VIEWER_STATE.sort = { columnIndex, direction: 'desc' };
  } else {
    VIEWER_STATE.sort = { columnIndex: null, direction: null };
  }

  renderDerivedDataset();
}

function getTotalPages() {
  const total = VIEWER_STATE.filteredRows.length;
  return Math.max(1, Math.ceil(total / VIEWER_STATE.pageSize));
}

function formatCell(value) {
  const safe = `${value ?? ''}`;
  if (!VIEWER_STATE.settings.sanitizeCells) return safe;

  return /^[=+\-@]/.test(safe) ? `'${safe}` : safe;
}

function downloadCsv() {
  const content = VIEWER_STATE.rawInput || '';
  if (!content) return;

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'dataset.csv';
  link.click();
  URL.revokeObjectURL(url);
}

async function copyVisibleTable() {
  if (!VIEWER_STATE.parsed) return;

  const startIndex = (VIEWER_STATE.currentPage - 1) * VIEWER_STATE.pageSize;
  const endIndex = startIndex + VIEWER_STATE.pageSize;
  const rows = VIEWER_STATE.filteredRows.slice(startIndex, endIndex);
  const header = VIEWER_STATE.visibleColumns.map((index) => VIEWER_STATE.parsed.columns[index]);

  const lines = [header, ...rows.map((row) => VIEWER_STATE.visibleColumns.map((index) => formatCell(row[index] || '')))]
    .map((cells) => cells.join('\t'))
    .join('\n');

  try {
    await navigator.clipboard.writeText(lines);
  } catch {
    // no-op
  }
}

function renderSummary(message) {
  const summary = document.getElementById('csvViewerSummary');
  if (summary) summary.textContent = message;
}

function showLoading(visible) {
  const loading = document.getElementById('csvViewerLoading');
  if (loading) loading.hidden = !visible;
}

function showError(message) {
  const errorElement = document.getElementById('csvViewerError');
  if (!errorElement) return;

  errorElement.hidden = false;
  errorElement.innerHTML = `
    <strong>CSV parsing failed</strong>
    <p>${escapeHtml(message)}</p>
  `;
}

function hideError() {
  const errorElement = document.getElementById('csvViewerError');
  if (!errorElement) return;

  errorElement.hidden = true;
  errorElement.textContent = '';
}

function formatParseError(error) {
  const rowHint = error?.rowNumber ? `Approximate row: ${error.rowNumber}.` : '';
  const message = error?.message || 'Unknown parsing error.';
  return `${message} ${rowHint}`.trim();
}

function updateActionButtons() {
  const hasData = Boolean(VIEWER_STATE.parsed?.rows?.length);
  const downloadBtn = document.getElementById('csvDownloadBtn');
  const copyBtn = document.getElementById('csvCopyBtn');

  if (downloadBtn) downloadBtn.disabled = !VIEWER_STATE.rawInput;
  if (copyBtn) copyBtn.disabled = !hasData;
}

function setInputEditorValue(value) {
  const inputEditor = document.getElementById('inputEditor');
  if (inputEditor) inputEditor.value = value;

  if (window.monaco?.editor?.getModels) {
    const [inputModel] = window.monaco.editor.getModels();
    inputModel?.setValue(value);
  }
}

function nextFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

function escapeHtml(value) {
  return `${value}`
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#96;');
}

export async function runTool(action, input) {
  assertRunToolExecutionOnly('csv-viewer', action, input);
  ensureViewerUi();

  const delimiterSelect = document.getElementById('csvDelimiterSelect');
  const headerToggle = document.getElementById('csvHeaderToggle');
  const sanitizeToggle = document.getElementById('csvSanitizeToggle');
  const typeToggle = document.getElementById('csvTypeToggle');

  VIEWER_STATE.settings.delimiter = DELIMITER_OPTIONS[delimiterSelect?.value] ?? ',';
  VIEWER_STATE.settings.hasHeaderRow = headerToggle?.checked ?? true;
  VIEWER_STATE.settings.sanitizeCells = sanitizeToggle?.checked ?? false;
  VIEWER_STATE.settings.detectTypes = typeToggle?.checked ?? true;

  await processAndRender(input || '');

  const rowCount = VIEWER_STATE.parsed?.rows?.length || 0;
  const colCount = VIEWER_STATE.parsed?.columns?.length || 0;

  return JSON.stringify({
    action,
    status: rowCount ? 'ok' : 'empty',
    rowCount,
    columnCount: colCount,
    delimiter: VIEWER_STATE.settings.delimiter === '\t' ? 'tab' : VIEWER_STATE.settings.delimiter
  }, null, 2);
}



const TOOL_ID = 'csv-viewer';

function resolveRoot(context) {
  if (context?.handle?.id === TOOL_ID && context.handle?.root instanceof Element) {
    return context.handle.root;
  }

  return normalizeToolRoot(context);
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
  if (!root) return null;

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => {
      ensureViewerUi();
      return { destroy };
    },
    destroy: () => {
      VIEWER_STATE.keyboardDispose?.();
      VIEWER_STATE.keyboardDispose = null;
    }
  });
}

// lifecycle init (mount only)
// execution handled via runTool
// MOUNT ONLY — DO NOT EXECUTE BUSINESS LOGIC HERE
export function init(context) {
  const root = requireRuntimeRoot(context);
  const handle = create(root);
  if (!handle) return null;
  handle.init();
  return handle;
}

export function destroy(context) {
  const root = requireRuntimeRoot(context);
  if (!root) return;
  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}


