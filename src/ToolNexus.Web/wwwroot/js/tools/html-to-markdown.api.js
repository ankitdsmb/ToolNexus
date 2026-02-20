const DEFAULT_OPTIONS = Object.freeze({
  fencedCodeBlocks: true,
  keepLineBreaks: true,
  preserveUnsupportedTags: false,
  convertTables: true,
  compactMode: false,
  preservePreBlocks: true
});

const BLOCK_TAGS = new Set(['address', 'article', 'aside', 'blockquote', 'div', 'dl', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul']);
const IGNORE_TAGS = new Set(['script', 'style', 'noscript']);

const Utils = {
  normalizeInput: (input) => (typeof input === 'string' ? input : '').replace(/\r\n?/g, '\n'),
  normalizeInlineWhitespace: (value) => value.replace(/[\t\f\v ]+/g, ' '),
  collapseEmptyLines: (value, compactMode) => value.replace(/\n{4,}/g, '\n'.repeat(compactMode ? 2 : 3)),
  escapeMarkdownText: (value) => value.replace(/\\/g, '\\\\').replace(/([*_`~])/g, '\\$1'),
  extractLanguageHint: (className) => className?.split(/\s+/).find((token) => token.startsWith('language-'))?.slice('language-'.length).trim() ?? '',
  countMetrics: (value) => ({ chars: (value || '').length, lines: value ? value.split('\n').length : 0 })
};

function parse(html) {
  return new DOMParser().parseFromString(html, 'text/html');
}

function renderInlineChildren(parent, options) {
  return Array.from(parent.childNodes).map((node) => {
    if (node.nodeType === Node.TEXT_NODE) return Utils.escapeMarkdownText(Utils.normalizeInlineWhitespace(node.textContent ?? ''));
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    if (IGNORE_TAGS.has(node.tagName.toLowerCase())) return '';
    return renderInline(node, options);
  }).join('');
}

function renderList(listNode, options, depth) {
  const ordered = listNode.tagName.toLowerCase() === 'ol';
  return Array.from(listNode.children).filter((node) => node.tagName?.toLowerCase() === 'li').map((item, index) => {
    const marker = ordered ? `${index + 1}. ` : '- ';
    const indent = '  '.repeat(depth);
    const inlineText = Utils.normalizeInlineWhitespace(renderInlineChildren(item, options)).trim();
    return `${indent}${marker}${inlineText}`.trimEnd();
  }).join('\n');
}

function renderTable(tableNode, options) {
  const rows = Array.from(tableNode.querySelectorAll('tr')).map((row) =>
    Array.from(row.children).filter((cell) => ['td', 'th'].includes(cell.tagName.toLowerCase())).map((cell) => renderInlineChildren(cell, options).replace(/\|/g, '\\|').trim())
  ).filter((row) => row.length > 0);
  if (!rows.length) return '';

  const cols = Math.max(...rows.map((r) => r.length));
  const normalized = rows.map((r) => [...r, ...new Array(cols - r.length).fill('')]);
  return [normalized[0], new Array(cols).fill('---'), ...normalized.slice(1)].map((r) => `| ${r.join(' | ')} |`).join('\n');
}

function renderBlock(node, options, depth) {
  const tag = node.tagName.toLowerCase();
  if (/^h[1-6]$/.test(tag)) return `${'#'.repeat(Number(tag.slice(1)))} ${renderInlineChildren(node, options).trim()}`.trim();
  if (tag === 'p') return renderInlineChildren(node, options).trim();
  if (tag === 'blockquote') {
    const quote = renderBlockChildren(node, options, depth + 1).join('\n\n').trim();
    return quote ? quote.split('\n').map((line) => (line ? `> ${line}` : '>')).join('\n') : '';
  }
  if (tag === 'pre') {
    const codeNode = node.querySelector(':scope > code');
    const content = (codeNode?.textContent ?? node.textContent ?? '').replace(/\n+$/g, '');
    if (!options.preservePreBlocks) return content.trim();
    if (options.fencedCodeBlocks) return `\`\`\`${Utils.extractLanguageHint(codeNode?.className ?? node.className ?? '')}\n${content}\n\`\`\``;
    return content.split('\n').map((line) => `    ${line}`).join('\n');
  }
  if (tag === 'ul' || tag === 'ol') return renderList(node, options, depth);
  if (tag === 'hr') return '---';
  if (tag === 'table') return options.convertTables ? renderTable(node, options) : renderInlineChildren(node, options).trim();
  if (tag === 'li') return renderInlineChildren(node, options).trim();
  if (tag === 'div' || tag === 'section' || tag === 'article' || tag === 'main' || tag === 'header' || tag === 'footer' || tag === 'aside' || tag === 'nav' || tag === 'figure' || tag === 'figcaption' || tag === 'address' || tag === 'fieldset' || tag === 'form') return renderBlockChildren(node, options, depth).join('\n\n').trim();
  return options.preserveUnsupportedTags ? node.outerHTML : renderInlineChildren(node, options).trim();
}

function renderInline(node, options) {
  const tag = node.tagName.toLowerCase();
  if (tag === 'strong' || tag === 'b') return `**${renderInlineChildren(node, options).trim()}**`;
  if (tag === 'em' || tag === 'i') return `*${renderInlineChildren(node, options).trim()}*`;
  if (tag === 'code') return `\`${(node.textContent ?? '').replace(/`/g, '\\`').trim()}\``;
  if (tag === 'a') {
    const href = node.getAttribute('href')?.trim();
    const text = renderInlineChildren(node, options).trim() || href || '';
    return href ? `[${text}](${href})` : text;
  }
  if (tag === 'img') {
    const src = node.getAttribute('src')?.trim();
    if (!src) return '';
    return `![${(node.getAttribute('alt') ?? '').trim()}](${src})`;
  }
  if (tag === 'br') return options.keepLineBreaks ? '  \n' : '\n';
  if (BLOCK_TAGS.has(tag)) return renderBlock(node, options, 0);
  return options.preserveUnsupportedTags ? node.outerHTML : renderInlineChildren(node, options);
}

function renderBlockChildren(parent, options, depth) {
  const blocks = [];
  let inlineBuffer = [];
  const flush = () => {
    if (!inlineBuffer.length) return;
    const merged = Utils.normalizeInlineWhitespace(inlineBuffer.join('')).trim();
    if (merged) blocks.push(merged);
    inlineBuffer = [];
  };

  for (const node of parent.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = Utils.normalizeInlineWhitespace(node.textContent ?? '');
      if (value.trim()) inlineBuffer.push(Utils.escapeMarkdownText(value));
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    if (IGNORE_TAGS.has(node.tagName.toLowerCase())) continue;

    const tag = node.tagName.toLowerCase();
    if (BLOCK_TAGS.has(tag)) {
      flush();
      const rendered = renderBlock(node, options, depth);
      if (rendered) blocks.push(rendered);
    } else {
      inlineBuffer.push(renderInline(node, options));
    }
  }

  flush();
  return blocks.filter(Boolean);
}

export async function runHtmlToMarkdown(action, input, runtimeOptions = {}) {
  if ((action ?? '').toLowerCase() !== 'convert') {
    throw new Error('Unsupported action for HTML to Markdown tool.');
  }

  const options = { ...DEFAULT_OPTIONS, ...runtimeOptions };
  const normalized = Utils.normalizeInput(input).trim();
  if (!normalized) return { output: '', metrics: Utils.countMetrics('') };

  if (normalized.length > 180000) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  const doc = parse(normalized);
  const raw = renderBlockChildren(doc.body, options, 0).join('\n\n').trim();
  const output = Utils.collapseEmptyLines(raw, options.compactMode);
  return { output, metrics: Utils.countMetrics(output) };
}

export function getDefaultHtmlToMarkdownOptions() {
  return { ...DEFAULT_OPTIONS };
}
