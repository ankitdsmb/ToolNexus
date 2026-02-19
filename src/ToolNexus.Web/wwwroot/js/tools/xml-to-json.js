const TOOL_SLUG = 'xml-to-json';

const DEFAULT_CONFIG = {
  attributeKey: '@attributes',
  textKey: '#text',
  cdataKey: '#cdata',
  commentKey: '#comment',
  keepStrings: true,
  detectTypes: false,
  preserveRawText: false,
  includeAttributes: true,
  prettyPrint: true,
  indentSize: 2,
  sortKeys: false
};

const state = {
  initialized: false,
  autoConvert: false,
  autoConvertTimer: null,
  isProcessing: false,
  lastNodeCount: 0
};

class XmlJsonError extends Error {
  constructor(title, message) {
    super(message);
    this.name = 'XmlJsonError';
    this.title = title;
  }
}

function normalizeInput(input) {
  return (input ?? '').toString().replace(/\r\n/g, '\n').trim();
}

function readUiConfig() {
  const valueMode = document.getElementById('xmlJsonValueMode')?.value ?? 'strings';
  const outputFormat = document.getElementById('xmlJsonOutputMode')?.value ?? 'pretty';
  const indentSize = Number.parseInt(document.getElementById('xmlJsonIndentSize')?.value ?? '2', 10);

  return {
    attributeKey: document.getElementById('xmlJsonAttributeKey')?.value?.trim() || DEFAULT_CONFIG.attributeKey,
    textKey: document.getElementById('xmlJsonTextKey')?.value?.trim() || DEFAULT_CONFIG.textKey,
    cdataKey: document.getElementById('xmlJsonCdataKey')?.value?.trim() || DEFAULT_CONFIG.cdataKey,
    commentKey: document.getElementById('xmlJsonCommentKey')?.value?.trim() || DEFAULT_CONFIG.commentKey,
    includeAttributes: document.getElementById('xmlJsonIncludeAttributes')?.checked ?? DEFAULT_CONFIG.includeAttributes,
    keepStrings: valueMode === 'strings',
    detectTypes: valueMode === 'detect',
    preserveRawText: valueMode === 'raw',
    prettyPrint: outputFormat === 'pretty',
    indentSize: indentSize === 4 ? 4 : 2,
    sortKeys: document.getElementById('xmlJsonSortKeys')?.checked ?? DEFAULT_CONFIG.sortKeys
  };
}

function parseXmlDocument(xmlInput) {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(xmlInput, 'application/xml');
  const parserError = documentNode.querySelector('parsererror');

  if (parserError) {
    const details = parserError.textContent?.replace(/\s+/g, ' ').trim() ?? 'Invalid XML syntax.';
    const location = extractErrorLocation(details);
    const suffix = location ? ` Near line ${location.line}, column ${location.column}.` : '';
    throw new XmlJsonError('Invalid XML', `Unable to parse XML.${suffix}`);
  }

  const root = documentNode.documentElement;
  if (!root) {
    throw new XmlJsonError('XML required', 'Please provide a valid XML document before converting.');
  }

  return { documentNode, root };
}

function extractErrorLocation(details) {
  const lineColumnMatch = details.match(/line\s*(\d+)\s*[,;:]?\s*column\s*(\d+)/i)
    ?? details.match(/(\d+):(\d+)/);

  if (!lineColumnMatch) return null;

  return {
    line: Number.parseInt(lineColumnMatch[1], 10),
    column: Number.parseInt(lineColumnMatch[2], 10)
  };
}

function normalizeTextValue(value, preserveRawText) {
  if (preserveRawText) return value;
  return value.replace(/\s+/g, ' ').trim();
}

function castValue(value, config) {
  if (config.keepStrings || config.preserveRawText) return value;

  const candidate = value.trim();
  if (!candidate) return value;

  if (/^(true|false)$/i.test(candidate)) return candidate.toLowerCase() === 'true';
  if (/^null$/i.test(candidate)) return null;
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(candidate)) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) return parsed;
  }

  return value;
}

function appendChildValue(target, key, value) {
  if (!(key in target)) {
    target[key] = value;
    return;
  }

  if (!Array.isArray(target[key])) {
    target[key] = [target[key]];
  }

  target[key].push(value);
}

function convertElementToJson(element, config, counters) {
  counters.nodeCount += 1;

  const result = {};

  if (config.includeAttributes && element.attributes.length > 0) {
    const attributes = {};
    for (const attribute of element.attributes) {
      attributes[attribute.name] = castValue(attribute.value, config);
    }
    result[config.attributeKey] = attributes;
  }

  const textValues = [];
  const cdataValues = [];
  const commentValues = [];

  for (const node of element.childNodes) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const childName = node.nodeName;
      const childValue = convertElementToJson(node, config, counters);
      appendChildValue(result, childName, childValue);
      continue;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const normalized = normalizeTextValue(node.nodeValue ?? '', config.preserveRawText);
      if (normalized.length > 0) textValues.push(castValue(normalized, config));
      continue;
    }

    if (node.nodeType === Node.CDATA_SECTION_NODE) {
      const normalized = normalizeTextValue(node.nodeValue ?? '', config.preserveRawText);
      if (normalized.length > 0) cdataValues.push(castValue(normalized, config));
      continue;
    }

    if (node.nodeType === Node.COMMENT_NODE) {
      const normalized = normalizeTextValue(node.nodeValue ?? '', config.preserveRawText);
      if (normalized.length > 0) commentValues.push(normalized);
    }
  }

  if (textValues.length > 0) {
    result[config.textKey] = textValues.length === 1 ? textValues[0] : textValues;
  }

  if (cdataValues.length > 0) {
    result[config.cdataKey] = cdataValues.length === 1 ? cdataValues[0] : cdataValues;
  }

  if (commentValues.length > 0) {
    result[config.commentKey] = commentValues.length === 1 ? commentValues[0] : commentValues;
  }

  const resultKeys = Object.keys(result);
  if (resultKeys.length === 0) return '';
  if (resultKeys.length === 1 && Object.hasOwn(result, config.textKey)) return result[config.textKey];

  return result;
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (!value || typeof value !== 'object') return value;

  const sorted = {};
  for (const key of Object.keys(value).sort((a, b) => a.localeCompare(b))) {
    sorted[key] = sortKeysDeep(value[key]);
  }

  return sorted;
}

function formatJsonOutput(value, config) {
  const stableValue = config.sortKeys ? sortKeysDeep(value) : value;
  if (!config.prettyPrint) return JSON.stringify(stableValue);
  return JSON.stringify(stableValue, null, config.indentSize);
}

async function transformXmlToJson(xmlInput, config) {
  const normalized = normalizeInput(xmlInput);
  if (!normalized) {
    throw new XmlJsonError('Input required', 'Please provide XML input before converting.');
  }

  const { root } = parseXmlDocument(normalized);
  const counters = { nodeCount: 0 };

  if (root.childNodes.length > 2000) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const converted = { [root.nodeName]: convertElementToJson(root, config, counters) };
  return { output: formatJsonOutput(converted, config), nodeCount: counters.nodeCount };
}

function ensureToolingUi() {
  if (state.initialized) return;

  const page = document.querySelector('.tool-page[data-slug="xml-to-json"]');
  if (!page) return;

  page.classList.add('xml-json-tool');

  const description = page.querySelector('.tool-page__heading p');
  if (description) description.textContent = 'Reliable XML to JSON conversion with secure, deterministic client-side parsing.';

  const headingWrapper = page.querySelector('.tool-page__heading > div');
  if (headingWrapper) {
    const badge = document.createElement('span');
    badge.className = 'xml-json-tool__badge';
    badge.textContent = 'Client-side processing';
    headingWrapper.appendChild(badge);
  }

  const runLabel = document.querySelector('#runBtn .tool-btn__label');
  if (runLabel) runLabel.textContent = 'Convert';

  const shortcutHint = document.getElementById('editorShortcutHint');
  if (shortcutHint) {
    shortcutHint.textContent = 'Shortcuts: Ctrl/Cmd + Enter convert, Ctrl/Cmd + L clear input.';
  }

  injectControls(page);
  bindUiEvents();
  state.initialized = true;
}

function injectControls(page) {
  const selector = page.querySelector('.tool-page__action-selector');
  if (!selector?.parentElement) return;

  const toolbar = page.querySelector('.tool-toolbar__actions');
  if (toolbar && !document.getElementById('xmlJsonClearBtn')) {
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.id = 'xmlJsonClearBtn';
    clearBtn.className = 'tool-btn tool-btn--outline';
    clearBtn.textContent = 'Clear input';
    clearBtn.addEventListener('click', clearInputEditor);
    toolbar.insertBefore(clearBtn, toolbar.children[1] ?? null);
  }

  const controlPanel = document.createElement('section');
  controlPanel.className = 'xml-json-controls';
  controlPanel.innerHTML = `
    <label class="xml-json-controls__field"><span>Value mode</span>
      <select id="xmlJsonValueMode">
        <option value="strings" selected>Keep strings (safe)</option>
        <option value="detect">Auto detect types</option>
        <option value="raw">Preserve raw text</option>
      </select>
    </label>
    <label class="xml-json-controls__field"><span>Output</span>
      <select id="xmlJsonOutputMode">
        <option value="pretty" selected>Pretty JSON</option>
        <option value="minified">Minified JSON</option>
      </select>
    </label>
    <label class="xml-json-controls__field"><span>Indentation</span>
      <select id="xmlJsonIndentSize">
        <option value="2" selected>2 spaces</option>
        <option value="4">4 spaces</option>
      </select>
    </label>
    <label class="xml-json-controls__field"><span>Attribute key</span><input id="xmlJsonAttributeKey" type="text" value="${DEFAULT_CONFIG.attributeKey}" /></label>
    <label class="xml-json-controls__field"><span>Text key</span><input id="xmlJsonTextKey" type="text" value="${DEFAULT_CONFIG.textKey}" /></label>
    <label class="xml-json-controls__field"><span>CDATA key</span><input id="xmlJsonCdataKey" type="text" value="${DEFAULT_CONFIG.cdataKey}" /></label>
    <label class="xml-json-controls__field"><span>Comment key</span><input id="xmlJsonCommentKey" type="text" value="${DEFAULT_CONFIG.commentKey}" /></label>
    <label class="xml-json-controls__field xml-json-controls__field--inline"><input id="xmlJsonIncludeAttributes" type="checkbox" checked /><span>Include attributes</span></label>
    <label class="xml-json-controls__field xml-json-controls__field--inline"><input id="xmlJsonSortKeys" type="checkbox" /><span>Sort keys</span></label>
    <label class="xml-json-controls__field xml-json-controls__field--inline"><input id="xmlJsonAutoConvert" type="checkbox" /><span>Auto convert</span></label>
    <p id="xmlJsonMetrics" class="xml-json-controls__metrics" role="status" aria-live="polite">Ready.</p>
  `;

  selector.parentElement.insertBefore(controlPanel, selector.nextSibling);
}

function bindUiEvents() {
  const autoConvertInput = document.getElementById('xmlJsonAutoConvert');
  autoConvertInput?.addEventListener('change', () => {
    state.autoConvert = autoConvertInput.checked;
    if (state.autoConvert) scheduleAutoConvert();
  });

  const optionsContainer = document.querySelector('.xml-json-controls');
  optionsContainer?.addEventListener('input', () => {
    if (state.autoConvert) scheduleAutoConvert();
  });

  const inputEditor = document.getElementById('inputEditor');
  inputEditor?.addEventListener('input', () => {
    toggleConvertAvailability();
    if (state.autoConvert) scheduleAutoConvert();
  });

  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.key.toLowerCase() !== 'l') return;

    const targetTag = event.target?.tagName?.toLowerCase();
    if (targetTag === 'input' || targetTag === 'textarea') {
      event.preventDefault();
      clearInputEditor();
    }
  });

  toggleConvertAvailability();
}

function clearInputEditor() {
  const inputEditor = document.getElementById('inputEditor');
  if (!inputEditor) return;

  inputEditor.value = '';
  inputEditor.dispatchEvent(new Event('input', { bubbles: true }));
  updateMetrics('Input cleared.');
}

function toggleConvertAvailability() {
  const runBtn = document.getElementById('runBtn');
  const hasInput = (document.getElementById('inputEditor')?.value ?? '').trim().length > 0;
  if (runBtn) runBtn.disabled = !hasInput || state.isProcessing;
}

function scheduleAutoConvert() {
  window.clearTimeout(state.autoConvertTimer);
  state.autoConvertTimer = window.setTimeout(() => {
    if (!state.autoConvert || state.isProcessing) return;
    window.ToolNexusRun?.();
  }, 300);
}

function updateMetrics(text) {
  const metrics = document.getElementById('xmlJsonMetrics');
  if (metrics) metrics.textContent = text;
}

async function runTool(action, input) {
  ensureToolingUi();

  if ((action ?? '').toLowerCase() !== 'convert') {
    throw new XmlJsonError('Unsupported action', 'XML to JSON supports only the convert action.');
  }

  state.isProcessing = true;
  toggleConvertAvailability();
  updateMetrics('Processing XML…');

  try {
    const config = readUiConfig();
    const { output, nodeCount } = await transformXmlToJson(input, config);
    state.lastNodeCount = nodeCount;
    updateMetrics(`Converted ${nodeCount.toLocaleString()} nodes successfully.`);
    return output;
  } catch (error) {
    const message = error instanceof XmlJsonError
      ? `${error.title}: ${error.message}`
      : 'Conversion failed. Please verify the XML input and try again.';

    updateMetrics(message);
    throw new Error(message);
  } finally {
    state.isProcessing = false;
    toggleConvertAvailability();
  }
}

ensureToolingUi();

export { runTool };

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules[TOOL_SLUG] = { runTool };
