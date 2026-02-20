const DEFAULT_ROOT = 'root';
const ARRAY_ITEM_TAG = 'item';

const DEFAULT_OPTIONS = Object.freeze({
  rootName: DEFAULT_ROOT,
  prettyPrint: true,
  indentSize: 2,
  autoRoot: true,
  attributeMode: false,
  nullMode: 'self-closing'
});

export class JsonXmlError extends Error {
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

export function sanitizeTagName(name) {
  const trimmed = (name ?? '').toString().trim();
  const fallback = 'node';
  if (!trimmed) return fallback;

  const sanitized = trimmed.replace(/\s+/g, '_').replace(/[^\w\-.]/g, '_');
  if (!sanitized) return fallback;
  if (/^[A-Za-z_]/.test(sanitized)) return sanitized;
  return `n_${sanitized}`;
}

function getLocationFromPosition(input, position) {
  if (!Number.isInteger(position) || position < 0) return null;

  const upToPosition = input.slice(0, Math.min(position, input.length));
  const lines = upToPosition.split('\n');
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}

function normalizeInput(input) {
  if (input == null) return '';
  return input.toString().replace(/\r\n/g, '\n').trim();
}

export function parseJson(input) {
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

function formatPrimitive(value) {
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  return value == null ? '' : String(value);
}

export function buildXml(value, options = {}) {
  const normalizedOptions = { ...DEFAULT_OPTIONS, ...options };
  const newline = normalizedOptions.prettyPrint ? '\n' : '';
  const indentUnit = normalizedOptions.prettyPrint ? ' '.repeat(normalizedOptions.indentSize) : '';

  const renderNode = (nodeName, nodeValue, depth) => {
    const tag = sanitizeTagName(nodeName || ARRAY_ITEM_TAG);
    const indent = normalizedOptions.prettyPrint ? indentUnit.repeat(depth) : '';

    if (nodeValue === null) {
      return normalizedOptions.nullMode === 'empty'
        ? `${indent}<${tag}></${tag}>${newline}`
        : `${indent}<${tag} />${newline}`;
    }

    if (Array.isArray(nodeValue)) {
      const wrapperOpen = `${indent}<${tag}>${newline}`;
      const children = nodeValue.map((item) => renderNode(ARRAY_ITEM_TAG, item, depth + 1)).join('');
      const wrapperClose = `${indent}</${tag}>${newline}`;
      return `${wrapperOpen}${children}${wrapperClose}`;
    }

    if (typeof nodeValue === 'object') {
      const attributes = [];
      const elements = [];

      for (const [key, itemValue] of Object.entries(nodeValue)) {
        if (normalizedOptions.attributeMode && (typeof itemValue === 'string' || typeof itemValue === 'number' || typeof itemValue === 'boolean')) {
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

  if (normalizedOptions.autoRoot) {
    return renderNode(normalizedOptions.rootName, value, 0).trim();
  }

  if (Array.isArray(value)) {
    return value.map((item) => renderNode(ARRAY_ITEM_TAG, item, 0)).join('').trim();
  }

  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).map(([key, item]) => renderNode(key, item, 0)).join('').trim();
  }

  return renderNode(normalizedOptions.rootName, value, 0).trim();
}

export function calculateStructureStats(value) {
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

export function getDefaultJsonToXmlOptions() {
  return { ...DEFAULT_OPTIONS };
}
