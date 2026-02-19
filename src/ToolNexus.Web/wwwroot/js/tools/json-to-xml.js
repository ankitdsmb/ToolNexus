const TOOL_SLUG = 'json-to-xml';
const DEFAULT_ROOT = 'root';
const ARRAY_ITEM_TAG = 'item';
const DEFAULT_OPTIONS = {
  rootName: DEFAULT_ROOT,
  prettyPrint: true,
  indentSize: 2,
  autoRoot: true,
  attributeMode: false,
  nullMode: 'self-closing'
};

const state = {
  initialized: false,
  autoConvert: false,
  autoConvertTimer: null
};

class JsonXmlError extends Error {
  constructor(title, message) {
    super(message);
    this.name = 'JsonXmlError';
    this.title = title;
  }
}

function escapeXmlText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeTagName(name) {
  const trimmed = (name ?? '').toString().trim();
  const fallback = 'node';
  if (!trimmed) return fallback;

  const sanitized = trimmed
    .replace(/\s+/g, '_')
    .replace(/[^\w\-.]/g, '_');

  if (!sanitized) return fallback;
  if (/^[A-Za-z_]/.test(sanitized)) return sanitized;

  return `n_${sanitized}`;
}

function getLocationFromPosition(input, position) {
  if (!Number.isInteger(position) || position < 0) return null;

  const upToPosition = input.slice(0, Math.min(position, input.length));
  const lines = upToPosition.split('\n');
  return {
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1
  };
}

function normalizeInput(input) {
  if (input == null) return '';
  return input.toString().replace(/\r\n/g, '\n').trim();
}

function parseJson(input) {
  const normalized = normalizeInput(input);
  if (!normalized) {
    throw new JsonXmlError('Input required', 'Please provide JSON input before converting.');
  }

  try {
    return JSON.parse(normalized);
  } catch (error) {
    const match = /position\s(\d+)/i.exec(error?.message ?? '');
    const position = match ? Number.parseInt(match[1], 10) : Number.NaN;
    const location = Number.isFinite(position) ? getLocationFromPosition(normalized, position) : null;
    const suffix = location ? ` near line ${location.line}, column ${location.column}.` : '.';
    throw new JsonXmlError('Invalid JSON', `Invalid JSON${suffix}`);
  }
}

function readOptions() {
  const rootName = sanitizeTagName(document.getElementById('jsonXmlRootName')?.value ?? DEFAULT_ROOT);
  const prettyPrint = document.getElementById('jsonXmlPrettyPrint')?.checked ?? DEFAULT_OPTIONS.prettyPrint;
  const indentSize = Number.parseInt(document.getElementById('jsonXmlIndentSize')?.value ?? String(DEFAULT_OPTIONS.indentSize), 10);
  const autoRoot = document.getElementById('jsonXmlAutoRoot')?.checked ?? DEFAULT_OPTIONS.autoRoot;
  const attributeMode = document.getElementById('jsonXmlAttributeMode')?.checked ?? DEFAULT_OPTIONS.attributeMode;
  const nullMode = document.getElementById('jsonXmlNullMode')?.value ?? DEFAULT_OPTIONS.nullMode;

  return {
    rootName,
    prettyPrint,
    indentSize: indentSize === 4 ? 4 : 2,
    autoRoot,
    attributeMode,
    nullMode: nullMode === 'empty' ? 'empty' : 'self-closing'
  };
}

function formatPrimitive(value) {
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  return value == null ? '' : String(value);
}

function buildXml(value, options) {
  const newline = options.prettyPrint ? '\n' : '';
  const indentUnit = options.prettyPrint ? ' '.repeat(options.indentSize) : '';

  const renderNode = (nodeName, nodeValue, depth) => {
    const tag = sanitizeTagName(nodeName || ARRAY_ITEM_TAG);
    const indent = options.prettyPrint ? indentUnit.repeat(depth) : '';

    if (nodeValue === null) {
      return options.nullMode === 'empty'
        ? `${indent}<${tag}></${tag}>${newline}`
        : `${indent}<${tag} />${newline}`;
    }

    if (Array.isArray(nodeValue)) {
      const wrapperOpen = `${indent}<${tag}>${newline}`;
      const children = nodeValue.map(item => renderNode(ARRAY_ITEM_TAG, item, depth + 1)).join('');
      const wrapperClose = `${indent}</${tag}>${newline}`;
      return `${wrapperOpen}${children}${wrapperClose}`;
    }

    if (typeof nodeValue === 'object') {
      const entries = Object.entries(nodeValue);
      const attributes = [];
      const elements = [];

      for (const [key, itemValue] of entries) {
        if (options.attributeMode && (typeof itemValue === 'string' || typeof itemValue === 'number' || typeof itemValue === 'boolean')) {
          attributes.push(`${sanitizeTagName(key)}="${escapeXmlText(formatPrimitive(itemValue))}"`);
          continue;
        }

        elements.push(renderNode(key, itemValue, depth + 1));
      }

      const attrText = attributes.length > 0 ? ` ${attributes.join(' ')}` : '';
      if (elements.length === 0) {
        return `${indent}<${tag}${attrText} />${newline}`;
      }

      return `${indent}<${tag}${attrText}>${newline}${elements.join('')}${indent}</${tag}>${newline}`;
    }

    return `${indent}<${tag}>${escapeXmlText(formatPrimitive(nodeValue))}</${tag}>${newline}`;
  };

  if (options.autoRoot) {
    return renderNode(options.rootName, value, 0).trim();
  }

  if (Array.isArray(value)) {
    return value.map(item => renderNode(ARRAY_ITEM_TAG, item, 0)).join('').trim();
  }

  if (typeof value === 'object' && value !== null) {
    return Object.entries(value)
      .map(([key, item]) => renderNode(key, item, 0))
      .join('')
      .trim();
  }

  return renderNode(options.rootName, value, 0).trim();
}

function calculateStructureStats(value) {
  let objectCount = 0;
  let arrayCount = 0;
  const stack = [value];

  while (stack.length > 0) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      arrayCount += 1;
      for (let i = current.length - 1; i >= 0; i -= 1) stack.push(current[i]);
    } else if (current && typeof current === 'object') {
      objectCount += 1;
      const values = Object.values(current);
      for (let i = values.length - 1; i >= 0; i -= 1) stack.push(values[i]);
    }
  }

  return { objectCount, arrayCount };
}

function ensureUiEnhancements() {
  if (state.initialized) return;

  const page = document.querySelector('.tool-page[data-slug="json-to-xml"]');
  if (!page) return;

  const header = page.querySelector('.tool-page__heading p');
  if (header) header.textContent = 'Professional JSON to XML conversion with deterministic, client-side serialization.';

  const heading = page.querySelector('.tool-page__heading > div');
  if (heading) {
    const badge = document.createElement('span');
    badge.textContent = 'Client-side processing';
    badge.className = 'json-xml-badge';
    heading.appendChild(badge);
  }

  const runLabel = document.querySelector('#runBtn .tool-btn__label');
  if (runLabel) runLabel.textContent = 'Convert';

  const shortcutHint = document.getElementById('editorShortcutHint');
  if (shortcutHint) shortcutHint.textContent = 'Shortcuts: Ctrl/Cmd + Enter convert, Ctrl/Cmd + L clear input.';

  const toolbar = page.querySelector('.tool-toolbar__actions');
  if (toolbar) {
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.id = 'jsonXmlClearBtn';
    clearBtn.className = 'tool-btn tool-btn--outline';
    clearBtn.textContent = 'Clear input';
    clearBtn.addEventListener('click', clearInput);
    toolbar.insertBefore(clearBtn, toolbar.firstChild?.nextSibling ?? null);
  }

  const selector = page.querySelector('.tool-page__action-selector');
  if (selector?.parentElement) {
    const controls = document.createElement('section');
    controls.className = 'json-xml-controls';

    controls.append(
      buildField('Root element', buildInput('jsonXmlRootName', DEFAULT_ROOT)),
      buildField('Pretty print', buildCheckbox('jsonXmlPrettyPrint', true)),
      buildField('Indentation', buildSelect('jsonXmlIndentSize', [{ value: '2', label: '2 spaces' }, { value: '4', label: '4 spaces' }])),
      buildField('Auto root wrapper', buildCheckbox('jsonXmlAutoRoot', true)),
      buildField('Primitive to attributes', buildCheckbox('jsonXmlAttributeMode', false)),
      buildField('Null handling', buildSelect('jsonXmlNullMode', [{ value: 'self-closing', label: 'Self-closing tag' }, { value: 'empty', label: 'Empty element pair' }])),
      buildField('Auto convert', buildCheckbox('jsonXmlAutoConvert', false))
    );

    selector.parentElement.insertBefore(controls, selector.nextSibling);
  }

  attachUiEvents();
  injectStyles();
  state.initialized = true;
}

function buildField(labelText, control) {
  const wrapper = document.createElement('label');
  wrapper.className = 'json-xml-controls__field';

  const text = document.createElement('span');
  text.textContent = labelText;

  wrapper.append(text, control);
  return wrapper;
}

function buildInput(id, value) {
  const input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  input.value = value;
  return input;
}

function buildCheckbox(id, checked) {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = id;
  input.checked = checked;
  return input;
}

function buildSelect(id, options) {
  const select = document.createElement('select');
  select.id = id;

  for (const option of options) {
    const element = document.createElement('option');
    element.value = option.value;
    element.textContent = option.label;
    select.appendChild(element);
  }

  return select;
}

function clearInput() {
  const inputEditor = document.getElementById('inputEditor');
  if (inputEditor) inputEditor.value = '';

  const monacoInput = document.querySelector('#inputEditorSurface .monaco-editor');
  if (monacoInput && window.monaco?.editor) {
    const editors = window.monaco.editor.getEditors?.() ?? [];
    const editor = editors.find(item => item.getDomNode()?.closest('#inputEditorSurface'));
    editor?.setValue('');
  }

  const errorMessage = document.getElementById('errorMessage');
  if (errorMessage) {
    errorMessage.hidden = true;
    errorMessage.textContent = '';
  }
}

function attachUiEvents() {
  const input = document.getElementById('inputEditor');
  const auto = document.getElementById('jsonXmlAutoConvert');
  const runBtn = document.getElementById('runBtn');

  auto?.addEventListener('change', () => {
    state.autoConvert = auto.checked;
    if (state.autoConvert && input?.value.trim()) runBtn?.click();
  });

  input?.addEventListener('input', () => {
    if (!state.autoConvert) return;
    window.clearTimeout(state.autoConvertTimer);
    state.autoConvertTimer = window.setTimeout(() => runBtn?.click(), 250);
  });

  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;

    if (event.key === 'l' || event.key === 'L') {
      event.preventDefault();
      clearInput();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      runBtn?.click();
    }
  });
}

function injectStyles() {
  const id = 'json-xml-tool-styles';
  if (document.getElementById(id)) return;

  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    .json-xml-badge { display:inline-block; margin-top:10px; padding:4px 10px; border-radius:999px; background:rgba(30,120,255,.12); color:#1e5fd0; font-size:.78rem; font-weight:600; }
    .json-xml-controls { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:12px 16px; padding:16px 0 8px; }
    .json-xml-controls__field { display:flex; flex-direction:column; gap:6px; font-size:.9rem; }
    .json-xml-controls__field input[type="text"], .json-xml-controls__field select { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  `;

  document.head.appendChild(style);
}

export async function runTool(action, input) {
  ensureUiEnhancements();

  if ((action ?? '').toLowerCase() !== 'convert') {
    throw new JsonXmlError('Unsupported action', 'Only convert action is supported.');
  }

  const options = readOptions();
  const startedAt = performance.now();
  const parsed = parseJson(input);
  const xml = buildXml(parsed, options);
  const metrics = calculateStructureStats(parsed);

  const resultStatus = document.getElementById('resultStatus');
  if (resultStatus) {
    const elapsed = Math.max(1, Math.round(performance.now() - startedAt));
    resultStatus.textContent = `Converted locally • ${metrics.objectCount} objects • ${metrics.arrayCount} arrays • ${elapsed}ms`;
  }

  return xml;
}

ensureUiEnhancements();
window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules[TOOL_SLUG] = { runTool };
