const TOOL_SLUG = 'xml-formatter';
const LARGE_DOCUMENT_THRESHOLD = 120_000;
const DEFAULT_OPTIONS = Object.freeze({
  useTabs: false,
  indentSize: 2,
  prettyPrint: true,
  compactMode: false,
  preserveWhitespaceText: true
});

const SELECTORS = Object.freeze({
  page: '.tool-page[data-slug="xml-formatter"]',
  input: '#inputEditor',
  output: '#outputEditor',
  runButton: '#runBtn',
  copyButton: '#copyBtn',
  downloadButton: '#downloadBtn',
  actionSelect: '#actionSelect',
  errorMessage: '#errorMessage',
  resultStatus: '#resultStatus',
  inputPanelHeader: '#toolInputHeading',
  outputPanelHeader: '#toolOutputHeading',
  actionContainer: '.tool-page__action-selector',
  toolbar: '.tool-toolbar__actions',
  shortcutHint: '#editorShortcutHint'
});

const state = {
  initialized: false,
  autoFormat: false,
  lastOutput: '',
  customControls: null,
  stats: null,
  largeFileNotice: null,
  isProcessing: false,
  statusTimer: 0
};

const normalizeInput = (value) => (typeof value === 'string' ? value.replace(/\r\n?/g, '\n') : '');

function createXmlFormatterError(title, message, location = null) {
  return { title, message, location };
}

function parseXmlSafely(rawXml) {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(rawXml, 'application/xml');
  const parserError = documentNode.querySelector('parsererror');

  if (parserError) {
    const detailText = parserError.textContent?.trim() || 'Invalid XML document.';
    const lineMatch = detailText.match(/line\s*(\d+)/i);
    const columnMatch = detailText.match(/column\s*(\d+)/i);

    throw createXmlFormatterError(
      'Unable to parse XML',
      detailText.split('\n')[0],
      {
        line: lineMatch ? Number.parseInt(lineMatch[1], 10) : null,
        column: columnMatch ? Number.parseInt(columnMatch[1], 10) : null
      }
    );
  }

  return documentNode;
}

function buildIndent(level, options) {
  const unit = options.useTabs ? '\t' : ' '.repeat(options.indentSize);
  return unit.repeat(level);
}

function escapeText(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttribute(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('"', '&quot;');
}

function formatXmlNode(node, level, options) {
  const indent = buildIndent(level, options);
  const childIndent = buildIndent(level + 1, options);

  if (node.nodeType === Node.ELEMENT_NODE) {
    const tagName = node.tagName;
    const attributes = Array.from(node.attributes)
      .map((attribute) => `${attribute.name}="${escapeAttribute(attribute.value)}"`)
      .join(' ');
    const openingTag = attributes ? `<${tagName} ${attributes}>` : `<${tagName}>`;

    if (!node.childNodes.length) {
      const selfClosingTag = attributes ? `<${tagName} ${attributes}/>` : `<${tagName}/>`;
      return `${indent}${selfClosingTag}`;
    }

    const significantChildren = Array.from(node.childNodes).filter((child) => {
      if (child.nodeType !== Node.TEXT_NODE) return true;
      return options.preserveWhitespaceText || child.nodeValue?.trim();
    });

    const onlyTextNode =
      significantChildren.length === 1 &&
      significantChildren[0].nodeType === Node.TEXT_NODE &&
      significantChildren[0].nodeValue !== null;

    if (onlyTextNode) {
      const inlineText = escapeText(significantChildren[0].nodeValue);
      return `${indent}${openingTag}${inlineText}</${tagName}>`;
    }

    const inner = significantChildren
      .map((child) => formatXmlNode(child, level + 1, options))
      .join('\n');

    return `${indent}${openingTag}\n${inner}\n${indent}</${tagName}>`;
  }

  if (node.nodeType === Node.TEXT_NODE) {
    if (!options.preserveWhitespaceText && !node.nodeValue?.trim()) {
      return '';
    }

    const encoded = escapeText(node.nodeValue ?? '');
    return options.prettyPrint ? `${childIndent}${encoded}` : encoded;
  }

  if (node.nodeType === Node.CDATA_SECTION_NODE) {
    return `${indent}<![CDATA[${node.nodeValue ?? ''}]]>`;
  }

  if (node.nodeType === Node.COMMENT_NODE) {
    return `${indent}<!--${node.nodeValue ?? ''}-->`;
  }

  if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
    return `${indent}<?${node.nodeName} ${node.nodeValue ?? ''}?>`;
  }

  if (node.nodeType === Node.DOCUMENT_TYPE_NODE) {
    const doctype = node;
    const publicId = doctype.publicId ? ` PUBLIC "${doctype.publicId}"` : '';
    const systemId = doctype.systemId ? ` "${doctype.systemId}"` : '';
    return `${indent}<!DOCTYPE ${doctype.name}${publicId}${systemId}>`;
  }

  return '';
}

function formatXmlDocument(documentNode, options) {
  if (options.compactMode || !options.prettyPrint) {
    return new XMLSerializer().serializeToString(documentNode);
  }

  const lines = [];

  for (const childNode of Array.from(documentNode.childNodes)) {
    const formatted = formatXmlNode(childNode, 0, options);
    if (formatted) {
      lines.push(formatted);
    }
  }

  return `${lines.join('\n').trim()}\n`;
}

function countMetrics(value) {
  const text = value ?? '';
  return {
    lines: text.length ? text.split('\n').length : 0,
    characters: text.length
  };
}

function updateStats(inputValue, outputValue = state.lastOutput) {
  if (!state.stats) return;

  const input = countMetrics(inputValue);
  const output = countMetrics(outputValue);

  state.stats.textContent = `Input: ${input.lines} lines / ${input.characters} chars • Output: ${output.lines} lines / ${output.characters} chars`;

  if (state.largeFileNotice) {
    state.largeFileNotice.hidden = input.characters < LARGE_DOCUMENT_THRESHOLD;
  }
}

function setStatus(message, mode = 'idle') {
  const status = document.querySelector(SELECTORS.resultStatus);
  if (!status) return;

  status.textContent = message;
  status.classList.remove('result-indicator--idle', 'result-indicator--success', 'result-indicator--error');

  if (mode === 'success') {
    status.classList.add('result-indicator--success');
  } else if (mode === 'error') {
    status.classList.add('result-indicator--error');
  } else {
    status.classList.add('result-indicator--idle');
  }
}

function scheduleStatusReset() {
  window.clearTimeout(state.statusTimer);
  state.statusTimer = window.setTimeout(() => setStatus('Ready', 'idle'), 1800);
}

function displayError(error) {
  const errorNode = document.querySelector(SELECTORS.errorMessage);
  if (!errorNode) return;

  const location = error?.location?.line
    ? ` (line ${error.location.line}${error.location.column ? `, column ${error.location.column}` : ''})`
    : '';

  errorNode.hidden = false;
  errorNode.textContent = `${error?.title ?? 'XML formatting failed'}: ${error?.message ?? 'Invalid input.'}${location}`;
  setStatus('Invalid XML', 'error');
}

function clearError() {
  const errorNode = document.querySelector(SELECTORS.errorMessage);
  if (!errorNode) return;
  errorNode.hidden = true;
  errorNode.textContent = '';
}

function ensureControls() {
  if (state.customControls) return;

  const actionContainer = document.querySelector(SELECTORS.actionContainer);
  if (!actionContainer) return;

  const controls = document.createElement('div');
  controls.className = 'xml-formatter-controls';
  controls.innerHTML = `
    <div class="xml-formatter-controls__row">
      <label for="xmlIndentStyle">Indentation</label>
      <select id="xmlIndentStyle">
        <option value="spaces-2">2 spaces</option>
        <option value="spaces-4">4 spaces</option>
        <option value="tabs">Tabs</option>
      </select>
    </div>
    <div class="xml-formatter-controls__toggles">
      <label><input id="xmlPrettyToggle" type="checkbox" checked /> Pretty print</label>
      <label><input id="xmlCompactToggle" type="checkbox" /> Compact mode</label>
      <label><input id="xmlAutoToggle" type="checkbox" /> Auto format</label>
    </div>
    <button id="xmlClearInputBtn" type="button" class="tool-btn tool-btn--outline">Clear input</button>
    <p id="xmlStats" class="xml-formatter-controls__stats" aria-live="polite"></p>
    <p id="xmlLargeFileNotice" class="xml-formatter-controls__notice" hidden>
      Large XML detected. Formatting may take a moment.
    </p>
  `;

  actionContainer.insertAdjacentElement('afterend', controls);

  const inputHeader = document.querySelector(SELECTORS.inputPanelHeader)?.parentElement;
  if (inputHeader && !inputHeader.querySelector('.xml-formatter-badge')) {
    const badge = document.createElement('span');
    badge.className = 'xml-formatter-badge';
    badge.textContent = 'Client-side processing';
    inputHeader.appendChild(badge);
  }

  state.customControls = controls;
  state.stats = controls.querySelector('#xmlStats');
  state.largeFileNotice = controls.querySelector('#xmlLargeFileNotice');
}

function resolveOptions() {
  const indentStyle = document.getElementById('xmlIndentStyle')?.value ?? 'spaces-2';
  const prettyPrint = document.getElementById('xmlPrettyToggle')?.checked ?? true;
  const compactMode = document.getElementById('xmlCompactToggle')?.checked ?? false;

  if (indentStyle === 'tabs') {
    return { ...DEFAULT_OPTIONS, useTabs: true, prettyPrint, compactMode };
  }

  return {
    ...DEFAULT_OPTIONS,
    useTabs: false,
    indentSize: indentStyle === 'spaces-4' ? 4 : 2,
    prettyPrint,
    compactMode
  };
}

function setOutput(value) {
  const output = document.querySelector(SELECTORS.output);
  if (!output) return;
  output.value = value;
  state.lastOutput = value;
  updateStats(document.querySelector(SELECTORS.input)?.value ?? '', value);
}

async function executeFormat(rawInput, overrideOptions = null) {
  const normalizedInput = normalizeInput(rawInput);
  if (!normalizedInput.trim()) {
    throw createXmlFormatterError('Missing XML input', 'Paste XML before formatting.');
  }

  const options = overrideOptions ?? resolveOptions();
  const xmlDocument = parseXmlSafely(normalizedInput);
  return formatXmlDocument(xmlDocument, options);
}

function bindUiEvents() {
  const input = document.querySelector(SELECTORS.input);
  const runButton = document.querySelector(SELECTORS.runButton);
  const clearButton = document.getElementById('xmlClearInputBtn');
  const autoToggle = document.getElementById('xmlAutoToggle');

  if (!input || !runButton || !clearButton || !autoToggle) return;

  const triggerAutoFormat = async () => {
    if (!state.autoFormat || state.isProcessing || !input.value.trim()) return;
    try {
      const output = await executeFormat(input.value);
      setOutput(output);
      clearError();
      setStatus('Formatted', 'success');
      scheduleStatusReset();
    } catch (error) {
      displayError(error);
    }
  };

  input.addEventListener('input', () => {
    updateStats(input.value);
    runButton.disabled = !input.value.trim();
    void triggerAutoFormat();
  });

  clearButton.addEventListener('click', () => {
    input.value = '';
    setOutput('');
    clearError();
    setStatus('Input cleared', 'idle');
    runButton.disabled = true;
    input.focus();
  });

  autoToggle.addEventListener('change', () => {
    state.autoFormat = autoToggle.checked;
    if (state.autoFormat) {
      void triggerAutoFormat();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.key.toLowerCase() === 'l') {
      event.preventDefault();
      clearButton.click();
    }
  });

  for (const controlId of ['xmlIndentStyle', 'xmlPrettyToggle', 'xmlCompactToggle']) {
    document.getElementById(controlId)?.addEventListener('change', () => {
      if (state.autoFormat) {
        void triggerAutoFormat();
      }
    });
  }

  runButton.disabled = !input.value.trim();
  updateStats(input.value);
}

function initializeXmlFormatterUi() {
  if (state.initialized) return;
  if (!document.querySelector(SELECTORS.page)) return;

  ensureControls();
  bindUiEvents();

  const actionSelect = document.querySelector(SELECTORS.actionSelect);
  if (actionSelect) {
    actionSelect.value = 'format';
    actionSelect.disabled = true;
  }

  const toolbar = document.querySelector(SELECTORS.toolbar);
  const downloadButton = document.querySelector(SELECTORS.downloadButton);
  const copyButton = document.querySelector(SELECTORS.copyButton);

  if (toolbar && !toolbar.querySelector('.xml-toolbar-note')) {
    const note = document.createElement('span');
    note.className = 'xml-toolbar-note';
    note.textContent = 'Output is text-only (safe, no execution).';
    toolbar.appendChild(note);
  }

  if (downloadButton) {
    downloadButton.textContent = 'Download XML';
  }

  if (copyButton) {
    copyButton.textContent = 'Copy output';
  }

  const shortcutHint = document.querySelector(SELECTORS.shortcutHint);
  if (shortcutHint) {
    shortcutHint.textContent = 'Shortcuts: Ctrl/Cmd + Enter to format • Ctrl/Cmd + L to clear';
  }

  state.initialized = true;
}

export async function runTool(action, input) {
  initializeXmlFormatterUi();
  state.isProcessing = true;
  setStatus('Processing XML…', 'idle');

  try {
    const normalizedAction = (action ?? 'format').toLowerCase();
    clearError();

    if (normalizedAction === 'validate') {
      parseXmlSafely(normalizeInput(input));
      setStatus('XML is valid', 'success');
      scheduleStatusReset();
      return 'Valid XML';
    }

    const overrideOptions = normalizedAction === 'minify' ? { ...resolveOptions(), compactMode: true, prettyPrint: false } : null;
    const output = await executeFormat(input, overrideOptions);
    setStatus('Formatted', 'success');
    scheduleStatusReset();
    return output;
  } catch (error) {
    const safeError = error?.title ? error : createXmlFormatterError('XML formatting failed', 'Please provide well-formed XML.');
    displayError(safeError);
    throw new Error(safeError.message);
  } finally {
    state.isProcessing = false;
  }
}

initializeXmlFormatterUi();

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules[TOOL_SLUG] = { runTool };
