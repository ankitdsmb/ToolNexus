const LARGE_DOCUMENT_THRESHOLD = 120_000;

const DEFAULT_OPTIONS = Object.freeze({
  useTabs: false,
  indentSize: 2,
  prettyPrint: true,
  compactMode: false,
  preserveWhitespaceText: true
});

export function normalizeInput(value) {
  return typeof value === 'string' ? value.replace(/\r\n?/g, '\n') : '';
}

export function createXmlFormatterError(title, message, location = null) {
  return { title, message, location };
}

export function parseXmlSafely(rawXml) {
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
      if (child.nodeType !== Node.TEXT_NODE) {
        return true;
      }

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

export function formatXmlDocument(documentNode, options) {
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

function resolveOptions(baseOptions = DEFAULT_OPTIONS, requested = {}) {
  const options = { ...baseOptions, ...requested };

  if (options.useTabs) {
    options.indentSize = baseOptions.indentSize;
  }

  return options;
}

export async function runXmlFormatter(action, input, options = {}) {
  const normalizedAction = String(action ?? 'format').trim().toLowerCase();
  const normalizedInput = normalizeInput(input);

  if (!normalizedInput.trim()) {
    throw createXmlFormatterError('Missing XML input', 'Paste XML before formatting.');
  }

  if (normalizedAction === 'validate') {
    parseXmlSafely(normalizedInput);
    return 'Valid XML';
  }

  const xmlDocument = parseXmlSafely(normalizedInput);
  const normalizedOptions = resolveOptions(DEFAULT_OPTIONS, options);

  if (normalizedAction === 'minify') {
    return formatXmlDocument(xmlDocument, {
      ...normalizedOptions,
      compactMode: true,
      prettyPrint: false
    });
  }

  return formatXmlDocument(xmlDocument, normalizedOptions);
}

export function getLargeDocumentThreshold() {
  return LARGE_DOCUMENT_THRESHOLD;
}

export function getDefaultXmlFormatterOptions() {
  return { ...DEFAULT_OPTIONS };
}
