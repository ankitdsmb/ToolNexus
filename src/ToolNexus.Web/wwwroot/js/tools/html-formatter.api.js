const LARGE_INPUT_THRESHOLD = 120000;
const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const INLINE_ELEMENTS = new Set(['a', 'abbr', 'b', 'bdi', 'bdo', 'button', 'cite', 'code', 'data', 'dfn', 'em', 'i', 'kbd', 'label', 'mark', 'q', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var']);
const PRESERVE_WHITESPACE_ELEMENTS = new Set(['pre', 'textarea']);

const DEFAULT_OPTIONS = Object.freeze({
  indentSize: 2,
  indentWithTabs: false,
  maxLineWidth: 120,
  preserveAttributeLineBreaks: true,
  compactMode: false,
  showLineNumbers: false,
  autoFormat: false
});

function indentUnit(options) {
  return options.indentWithTabs ? '\t' : ' '.repeat(options.indentSize);
}

function normalizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

function withLineNumbers(text) {
  const lines = text.split('\n');
  const width = String(lines.length).length;
  return lines.map((line, index) => `${String(index + 1).padStart(width, ' ')} | ${line}`).join('\n');
}

function countLines(text) {
  if (!text) return 0;
  return text.split('\n').length;
}

function tokenize(html) {
  const tokens = [];
  let i = 0;

  while (i < html.length) {
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4);
      const closeIndex = end >= 0 ? end + 3 : html.length;
      tokens.push({ type: 'comment', value: html.slice(i, closeIndex) });
      i = closeIndex;
      continue;
    }

    if (html.startsWith('<!DOCTYPE', i) || html.startsWith('<!doctype', i)) {
      const end = html.indexOf('>', i + 2);
      const closeIndex = end >= 0 ? end + 1 : html.length;
      tokens.push({ type: 'doctype', value: html.slice(i, closeIndex) });
      i = closeIndex;
      continue;
    }

    if (html[i] === '<') {
      if (html[i + 1] === '/') {
        const end = html.indexOf('>', i + 2);
        const closeIndex = end >= 0 ? end + 1 : html.length;
        const name = html.slice(i + 2, closeIndex - 1).trim().toLowerCase();
        tokens.push({ type: 'closeTag', name, raw: html.slice(i, closeIndex) });
        i = closeIndex;
        continue;
      }

      const tagEnd = findTagCloseIndex(html, i + 1);
      const closeIndex = tagEnd >= 0 ? tagEnd + 1 : html.length;
      const rawTag = html.slice(i, closeIndex);
      const nameMatch = rawTag.match(/^<\s*([a-zA-Z][\w:-]*)/);

      if (!nameMatch) {
        tokens.push({ type: 'text', value: rawTag });
        i = closeIndex;
        continue;
      }

      const name = nameMatch[1].toLowerCase();
      const isSelfClosing = /\/\s*>$/.test(rawTag) || VOID_ELEMENTS.has(name);
      tokens.push({ type: 'openTag', name, raw: rawTag, selfClosing: isSelfClosing });
      i = closeIndex;
      continue;
    }

    const nextTag = html.indexOf('<', i);
    const end = nextTag >= 0 ? nextTag : html.length;
    tokens.push({ type: 'text', value: html.slice(i, end) });
    i = end;
  }

  return tokens;
}

function findTagCloseIndex(html, start) {
  let quote = '';
  for (let i = start; i < html.length; i += 1) {
    const char = html[i];
    if (!quote && (char === '"' || char === "'")) {
      quote = char;
      continue;
    }
    if (quote && char === quote) {
      quote = '';
      continue;
    }
    if (!quote && char === '>') return i;
  }
  return -1;
}

function buildTree(tokens) {
  const root = { type: 'root', children: [] };
  const stack = [root];
  const warnings = [];

  for (const token of tokens) {
    const parent = stack[stack.length - 1];
    if (token.type === 'openTag') {
      const node = { type: 'element', name: token.name, rawOpenTag: token.raw, selfClosing: token.selfClosing, children: [] };
      parent.children.push(node);
      if (!token.selfClosing) stack.push(node);
      continue;
    }

    if (token.type === 'closeTag') {
      let found = false;
      for (let j = stack.length - 1; j > 0; j -= 1) {
        if (stack[j].name === token.name) {
          stack.length = j;
          found = true;
          break;
        }
      }
      if (!found) warnings.push({ message: `Ignoring unmatched closing tag </${token.name}>.` });
      continue;
    }

    parent.children.push(token);
  }

  if (stack.length > 1) warnings.push({ message: 'Input contains unclosed tags. Formatter applied safe auto-closing.' });
  return { root, warnings };
}

function parseAttributes(rawOpenTag) {
  const match = rawOpenTag.match(/^<\s*[a-zA-Z][\w:-]*\s*([^>]*)>/s);
  if (!match) return [];
  const raw = match[1].replace(/\/$/, '').trim();
  if (!raw) return [];

  const attrs = [];
  const regex = /([:\w-]+)(\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;
  let attrMatch;
  while ((attrMatch = regex.exec(raw)) !== null) {
    const name = attrMatch[1];
    const value = attrMatch[2] ? attrMatch[2].replace(/^\s*=\s*/, '=') : '';
    attrs.push(`${name}${value}`);
  }

  return attrs;
}

function formatOpenTag(node, options, depth) {
  const attrs = parseAttributes(node.rawOpenTag);
  const closeToken = node.selfClosing ? ' />' : '>';
  if (!attrs.length) return `<${node.name}${closeToken}`;

  const singleLine = `<${node.name} ${attrs.join(' ')}${closeToken}`;
  if (singleLine.length <= options.maxLineWidth && !options.preserveAttributeLineBreaks) return singleLine;

  const pad = indentUnit(options).repeat(depth + 1);
  return `<${node.name}\n${attrs.map((attr) => `${pad}${attr}`).join('\n')}\n${indentUnit(options).repeat(depth)}${closeToken}`;
}

function formatNode(node, options, depth, parentPreservesWhitespace = false) {
  const indent = indentUnit(options).repeat(depth);
  if (node.type === 'comment') return `${indent}${node.value.trim()}`;
  if (node.type === 'doctype') return `${indent}${node.value.trim()}`;

  if (node.type === 'text') {
    if (parentPreservesWhitespace) return node.value;
    const collapsed = node.value.replace(/\s+/g, ' ').trim();
    return collapsed ? `${indent}${collapsed}` : '';
  }

  if (node.type !== 'element') return '';

  const preservesWhitespace = PRESERVE_WHITESPACE_ELEMENTS.has(node.name);
  const inlineTag = INLINE_ELEMENTS.has(node.name);
  const openTag = formatOpenTag(node, options, depth);

  if (node.selfClosing || VOID_ELEMENTS.has(node.name)) return `${indent}${openTag}`;

  const childLines = node.children.map((child) => formatNode(child, options, depth + 1, preservesWhitespace)).filter(Boolean);
  if (!childLines.length) return `${indent}${openTag}</${node.name}>`;

  if (inlineTag && childLines.length === 1 && childLines[0].trim().length < options.maxLineWidth / 2) {
    return `${indent}${openTag}${childLines[0].trim()}</${node.name}>`;
  }

  if (preservesWhitespace) {
    const rawContent = node.children.map((child) => (child.type === 'text' ? child.value : formatNode(child, options, 0, true))).join('');
    return `${indent}${openTag}${rawContent}</${node.name}>`;
  }

  return `${indent}${openTag}\n${childLines.join('\n')}\n${indent}</${node.name}>`;
}

function formatPretty(html, options) {
  const { root, warnings } = buildTree(tokenize(html));
  const output = root.children.map((node) => formatNode(node, options, 0, false)).filter(Boolean).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { output, warnings };
}

function formatCompact(html) {
  const result = tokenize(html).map((token) => {
    if (token.type === 'text') return token.value.replace(/\s+/g, ' ').trim();
    if (token.raw) return token.raw.trim();
    if (token.value) return token.value.trim();
    return '';
  }).filter(Boolean).join('');

  return { output: result.replace(/>\s+</g, '><').trim(), warnings: [] };
}

export async function runHtmlFormatter(action, input, options = {}) {
  const normalizedInput = normalizeInput(input);
  const resolvedOptions = { ...DEFAULT_OPTIONS, ...options };

  if (!normalizedInput.trim()) return { output: '', warnings: [], metrics: { characters: 0, lines: 0 } };
  if (normalizedInput.length >= LARGE_INPUT_THRESHOLD) await new Promise((resolve) => window.setTimeout(resolve, 16));

  const desiredAction = String(action ?? 'format').trim().toLowerCase();
  const effectiveOptions = { ...resolvedOptions, compactMode: desiredAction === 'minify' ? true : resolvedOptions.compactMode };
  const formatted = effectiveOptions.compactMode ? formatCompact(normalizedInput) : formatPretty(normalizedInput, effectiveOptions);

  const output = effectiveOptions.showLineNumbers ? withLineNumbers(formatted.output) : formatted.output;
  return { output, warnings: formatted.warnings, metrics: { characters: output.length, lines: countLines(output) } };
}

export function getDefaultHtmlFormatterOptions() {
  return { ...DEFAULT_OPTIONS };
}
