const DEFAULT_CONFIG = Object.freeze({
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
});

export class XmlJsonError extends Error {
  constructor(title, message) {
    super(message);
    this.name = 'XmlJsonError';
    this.title = title;
  }
}

function normalizeInput(input) {
  return (input ?? '').toString().replace(/\r\n/g, '\n').trim();
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

  return { root };
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
      appendChildValue(result, node.nodeName, convertElementToJson(node, config, counters));
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

  if (textValues.length > 0) result[config.textKey] = textValues.length === 1 ? textValues[0] : textValues;
  if (cdataValues.length > 0) result[config.cdataKey] = cdataValues.length === 1 ? cdataValues[0] : cdataValues;
  if (commentValues.length > 0) result[config.commentKey] = commentValues.length === 1 ? commentValues[0] : commentValues;

  const keys = Object.keys(result);
  if (keys.length === 0) return '';
  if (keys.length === 1 && Object.hasOwn(result, config.textKey)) return result[config.textKey];
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
  return config.prettyPrint ? JSON.stringify(stableValue, null, config.indentSize) : JSON.stringify(stableValue);
}

export async function transformXmlToJson(xmlInput, config = {}) {
  const normalized = normalizeInput(xmlInput);
  if (!normalized) {
    throw new XmlJsonError('Input required', 'Please provide XML input before converting.');
  }

  const normalizedConfig = { ...DEFAULT_CONFIG, ...config };
  const { root } = parseXmlDocument(normalized);
  const counters = { nodeCount: 0 };

  if (root.childNodes.length > 2000) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const converted = { [root.nodeName]: convertElementToJson(root, normalizedConfig, counters) };
  return { output: formatJsonOutput(converted, normalizedConfig), nodeCount: counters.nodeCount };
}

export function getDefaultXmlToJsonConfig() {
  return { ...DEFAULT_CONFIG };
}
