const TOOL_SLUG = 'html-to-markdown';

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
  normalizeInput(input) {
    return (typeof input === 'string' ? input : '').replace(/\r\n?/g, '\n');
  },

  normalizeInlineWhitespace(value) {
    return value.replace(/[\t\f\v ]+/g, ' ');
  },

  collapseEmptyLines(value, compactMode) {
    const maxBreaks = compactMode ? 2 : 3;
    return value.replace(/\n{4,}/g, '\n'.repeat(maxBreaks));
  },

  escapeMarkdownText(value) {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/([*_`~])/g, '\\$1');
  },

  extractLanguageHint(className) {
    if (!className) return '';
    const languageClass = className.split(/\s+/).find((token) => token.startsWith('language-'));
    return languageClass ? languageClass.slice('language-'.length).trim() : '';
  },

  countMetrics(value) {
    const text = value || '';
    return {
      chars: text.length,
      lines: text ? text.split('\n').length : 0
    };
  }
};

const InputNormalizer = {
  normalize(html) {
    return Utils.normalizeInput(html).trim();
  }
};

const HtmlParser = {
  parse(html) {
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
  }
};

const MarkdownWriter = {
  toMarkdown(documentNode, options) {
    const blocks = MarkdownWriter.renderBlockChildren(documentNode.body, options, 0);
    const raw = blocks.join('\n\n').trim();
    return Utils.collapseEmptyLines(raw, options.compactMode);
  },

  renderBlockChildren(parent, options, depth) {
    const blocks = [];
    let inlineBuffer = [];

    const flushInlineBuffer = () => {
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
      const isBlock = BLOCK_TAGS.has(tag);

      if (isBlock) {
        flushInlineBuffer();
        const rendered = MarkdownWriter.renderBlock(node, options, depth);
        if (rendered) blocks.push(rendered);
      } else {
        inlineBuffer.push(MarkdownWriter.renderInline(node, options));
      }
    }

    flushInlineBuffer();
    return blocks.filter(Boolean);
  },

  renderBlock(node, options, depth) {
    const tag = node.tagName.toLowerCase();

    if (/^h[1-6]$/.test(tag)) {
      const level = Number(tag.slice(1));
      const text = MarkdownWriter.renderInlineChildren(node, options).trim();
      return text ? `${'#'.repeat(level)} ${text}` : '';
    }

    if (tag === 'p') {
      return MarkdownWriter.renderInlineChildren(node, options).trim();
    }

    if (tag === 'blockquote') {
      const quote = MarkdownWriter.renderBlockChildren(node, options, depth + 1).join('\n\n').trim();
      if (!quote) return '';
      return quote.split('\n').map((line) => (line ? `> ${line}` : '>')).join('\n');
    }

    if (tag === 'pre') {
      if (!options.preservePreBlocks) {
        return MarkdownWriter.renderInlineChildren(node, options).trim();
      }

      const codeNode = node.querySelector(':scope > code');
      const content = (codeNode?.textContent ?? node.textContent ?? '').replace(/\n+$/g, '');
      if (options.fencedCodeBlocks) {
        const language = Utils.extractLanguageHint(codeNode?.className ?? node.className ?? '');
        return `\`\`\`${language}\n${content}\n\`\`\``;
      }

      return content
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n');
    }

    if (tag === 'ul' || tag === 'ol') {
      return MarkdownWriter.renderList(node, options, depth);
    }

    if (tag === 'hr') return '---';

    if (tag === 'table') {
      return options.convertTables
        ? MarkdownWriter.renderTable(node, options)
        : options.preserveUnsupportedTags
          ? node.outerHTML
          : MarkdownWriter.renderInlineChildren(node, options).trim();
    }

    if (tag === 'div' || tag === 'section' || tag === 'article' || tag === 'main' || tag === 'header' || tag === 'footer' || tag === 'aside' || tag === 'nav' || tag === 'figure' || tag === 'figcaption' || tag === 'address' || tag === 'fieldset' || tag === 'form') {
      return MarkdownWriter.renderBlockChildren(node, options, depth).join('\n\n').trim();
    }

    if (tag === 'li') {
      return MarkdownWriter.renderInlineChildren(node, options).trim();
    }

    return options.preserveUnsupportedTags ? node.outerHTML : MarkdownWriter.renderInlineChildren(node, options).trim();
  },

  renderList(listNode, options, depth) {
    const ordered = listNode.tagName.toLowerCase() === 'ol';
    const items = Array.from(listNode.children).filter((node) => node.tagName?.toLowerCase() === 'li');

    return items
      .map((item, index) => {
        const marker = ordered ? `${index + 1}. ` : '- ';
        const indent = '  '.repeat(depth);

        const inlineParts = [];
        const nestedBlocks = [];

        for (const child of item.childNodes) {
          if (child.nodeType === Node.TEXT_NODE) {
            const text = Utils.normalizeInlineWhitespace(child.textContent ?? '');
            if (text.trim()) inlineParts.push(Utils.escapeMarkdownText(text));
            continue;
          }

          if (child.nodeType !== Node.ELEMENT_NODE) continue;
          const tag = child.tagName.toLowerCase();

          if (tag === 'ul' || tag === 'ol') {
            nestedBlocks.push(MarkdownWriter.renderList(child, options, depth + 1));
            continue;
          }

          if (BLOCK_TAGS.has(tag) && tag !== 'li') {
            const blockContent = MarkdownWriter.renderBlock(child, options, depth + 1);
            if (blockContent) nestedBlocks.push(blockContent);
            continue;
          }

          inlineParts.push(MarkdownWriter.renderInline(child, options));
        }

        const inlineText = Utils.normalizeInlineWhitespace(inlineParts.join('')).trim();
        const nestedText = nestedBlocks
          .filter(Boolean)
          .map((block) => block.split('\n').map((line) => `${indent}  ${line}`).join('\n'))
          .join('\n');

        return `${indent}${marker}${inlineText}${nestedText ? `\n${nestedText}` : ''}`.trimEnd();
      })
      .join('\n');
  },

  renderTable(tableNode, options) {
    const rows = Array.from(tableNode.querySelectorAll('tr')).map((row) =>
      Array.from(row.children)
        .filter((cell) => ['td', 'th'].includes(cell.tagName.toLowerCase()))
        .map((cell) => MarkdownWriter.renderInlineChildren(cell, options).replace(/\|/g, '\\|').trim())
    ).filter((row) => row.length > 0);

    if (!rows.length) return '';

    const columnCount = Math.max(...rows.map((row) => row.length));
    const normalized = rows.map((row) => {
      const next = [...row];
      while (next.length < columnCount) next.push('');
      return next;
    });

    const header = normalized[0];
    const separator = new Array(columnCount).fill('---');
    const bodyRows = normalized.slice(1);

    const lines = [header, separator, ...bodyRows].map((row) => `| ${row.join(' | ')} |`);
    return lines.join('\n');
  },

  renderInlineChildren(parent, options) {
    return Array.from(parent.childNodes)
      .map((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return Utils.escapeMarkdownText(Utils.normalizeInlineWhitespace(node.textContent ?? ''));
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return '';
        if (IGNORE_TAGS.has(node.tagName.toLowerCase())) return '';
        return MarkdownWriter.renderInline(node, options);
      })
      .join('');
  },

  renderInline(node, options) {
    const tag = node.tagName.toLowerCase();

    if (tag === 'strong' || tag === 'b') {
      const text = MarkdownWriter.renderInlineChildren(node, options).trim();
      return text ? `**${text}**` : '';
    }

    if (tag === 'em' || tag === 'i') {
      const text = MarkdownWriter.renderInlineChildren(node, options).trim();
      return text ? `*${text}*` : '';
    }

    if (tag === 'code') {
      const text = (node.textContent ?? '').replace(/`/g, '\\`').trim();
      return text ? `\`${text}\`` : '';
    }

    if (tag === 'a') {
      const href = node.getAttribute('href')?.trim();
      const text = MarkdownWriter.renderInlineChildren(node, options).trim() || href || '';
      if (!href) return text;
      return `[${text}](${href})`;
    }

    if (tag === 'img') {
      const src = node.getAttribute('src')?.trim();
      if (!src) return '';
      const alt = (node.getAttribute('alt') ?? '').trim();
      return `![${alt}](${src})`;
    }

    if (tag === 'br') {
      return options.keepLineBreaks ? '  \n' : '\n';
    }

    if (BLOCK_TAGS.has(tag)) {
      return MarkdownWriter.renderBlock(node, options, 0);
    }

    if (tag === 'span' || tag === 'small' || tag === 'mark' || tag === 'sub' || tag === 'sup' || tag === 'u' || tag === 's' || tag === 'del' || tag === 'ins' || tag.includes('-')) {
      const content = MarkdownWriter.renderInlineChildren(node, options);
      return content || (options.preserveUnsupportedTags ? node.outerHTML : '');
    }

    return options.preserveUnsupportedTags ? node.outerHTML : MarkdownWriter.renderInlineChildren(node, options);
  }
};

const ErrorHandler = {
  toUserMessage(error) {
    console.error('HTML to Markdown conversion failed.', error);
    return {
      title: 'Conversion failed',
      explanation: 'The HTML input could not be processed into Markdown.',
      suggestion: 'Validate your markup, then retry. If the issue persists, clear the input and paste again.'
    };
  }
};

const Engine = {
  convert(input, runtimeOptions) {
    const options = { ...DEFAULT_OPTIONS, ...runtimeOptions };
    const normalizedHtml = InputNormalizer.normalize(input);
    if (!normalizedHtml) return '';

    const documentNode = HtmlParser.parse(normalizedHtml);
    return MarkdownWriter.toMarkdown(documentNode, options);
  }
};

class HtmlToMarkdownUi {
  constructor() {
    this.page = document.querySelector(`.tool-page[data-slug="${TOOL_SLUG}"]`);
    if (!this.page) return;

    this.input = document.getElementById('inputEditor');
    this.output = document.getElementById('outputEditor');
    this.runBtn = document.getElementById('runBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resultStatus = document.getElementById('resultStatus');
    this.actionSelect = document.getElementById('actionSelect');

    this.autoRunTimer = null;
  }

  init() {
    if (!this.page || !this.input || !this.runBtn) return;

    this.decorateHeading();
    this.renameControls();
    this.injectControls();
    this.bindEvents();
    this.updateMetrics();
    this.updateDisabledState();
  }

  decorateHeading() {
    const description = this.page.querySelector('.tool-page__heading p');
    if (description) {
      description.textContent = 'Convert HTML into stable, clean Markdown using deterministic client-side processing.';
    }

    const headingContainer = this.page.querySelector('.tool-page__heading > div');
    if (!headingContainer || headingContainer.querySelector('.html-md-badge')) return;

    const badge = document.createElement('span');
    badge.className = 'html-md-badge';
    badge.textContent = 'Client-side only';
    headingContainer.appendChild(badge);
  }

  renameControls() {
    const inputLabel = this.page.querySelector('label[for="inputEditor"]');
    const outputLabel = this.page.querySelector('label[for="outputEditor"]');
    const outputHeading = document.getElementById('toolOutputHeading');

    if (inputLabel) inputLabel.textContent = 'HTML input';
    if (outputLabel) outputLabel.textContent = 'Markdown output';
    if (outputHeading) outputHeading.textContent = 'Markdown output';
    if (this.runBtn.querySelector('.tool-btn__label')) {
      this.runBtn.querySelector('.tool-btn__label').textContent = 'Convert';
      this.runBtn.querySelector('.tool-btn__label').dataset.defaultLabel = 'Convert';
      this.runBtn.querySelector('.tool-btn__label').dataset.loadingLabel = 'Converting…';
    }

    if (this.downloadBtn) this.downloadBtn.textContent = 'Download .md';
    if (this.actionSelect) this.actionSelect.value = 'convert';
  }

  injectControls() {
    const actionZone = this.page.querySelector('.tool-page__action-selector');
    if (!actionZone || document.getElementById('htmlMdOptions')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'htmlMdOptions';
    wrapper.className = 'html-md-options';

    const createToggle = (id, label, checked = false) => {
      const group = document.createElement('label');
      group.className = 'html-md-options__toggle';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = id;
      input.checked = checked;
      const text = document.createElement('span');
      text.textContent = label;
      group.append(input, text);
      return group;
    };

    wrapper.append(
      createToggle('htmlMdAuto', 'Auto convert'),
      createToggle('htmlMdFenced', 'Fenced code blocks', true),
      createToggle('htmlMdBreaks', 'Keep line breaks', true),
      createToggle('htmlMdPreserve', 'Preserve unsupported tags'),
      createToggle('htmlMdTables', 'Convert tables', true),
      createToggle('htmlMdPre', 'Preserve <pre> blocks', true)
    );

    const density = document.createElement('label');
    density.className = 'html-md-options__select';
    density.htmlFor = 'htmlMdDensity';
    density.textContent = 'Markdown density';
    const densitySelect = document.createElement('select');
    densitySelect.id = 'htmlMdDensity';
    for (const value of ['pretty', 'compact']) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value[0].toUpperCase() + value.slice(1);
      densitySelect.appendChild(option);
    }
    density.appendChild(densitySelect);
    wrapper.appendChild(density);

    const clearBtn = document.createElement('button');
    clearBtn.id = 'htmlMdClearInput';
    clearBtn.className = 'tool-btn tool-btn--ghost';
    clearBtn.type = 'button';
    clearBtn.textContent = 'Clear input';
    wrapper.appendChild(clearBtn);

    const metrics = document.createElement('div');
    metrics.id = 'htmlMdMetrics';
    metrics.className = 'html-md-metrics';
    metrics.setAttribute('aria-live', 'polite');
    wrapper.appendChild(metrics);

    const hint = document.createElement('p');
    hint.className = 'shortcut-hint';
    hint.textContent = 'Shortcuts: Ctrl/Cmd + Enter convert • Ctrl/Cmd + L clear';
    wrapper.appendChild(hint);

    actionZone.appendChild(wrapper);
  }

  bindEvents() {
    const clearBtn = document.getElementById('htmlMdClearInput');
    const autoToggle = document.getElementById('htmlMdAuto');
    const optionIds = ['htmlMdFenced', 'htmlMdBreaks', 'htmlMdPreserve', 'htmlMdTables', 'htmlMdPre', 'htmlMdDensity'];

    clearBtn?.addEventListener('click', () => {
      this.input.value = '';
      this.updateMetrics();
      this.updateDisabledState();
      this.runBtn.focus();
    });

    this.copyBtn?.addEventListener('click', () => {
      this.copyBtn.classList.add('is-copied-feedback');
      setTimeout(() => this.copyBtn?.classList.remove('is-copied-feedback'), 750);
    });

    this.downloadBtn?.addEventListener('click', () => {
      const output = this.output?.value || '';
      if (!output.trim()) return;
      const link = document.createElement('a');
      const blob = new Blob([output], { type: 'text/markdown;charset=utf-8' });
      link.href = URL.createObjectURL(blob);
      link.download = 'converted-markdown.md';
      link.click();
      URL.revokeObjectURL(link.href);
    });

    this.input.addEventListener('input', () => {
      this.updateMetrics();
      this.updateDisabledState();
      if (autoToggle?.checked) this.scheduleAutoRun();
    });

    for (const id of optionIds) {
      document.getElementById(id)?.addEventListener('change', () => {
        if (autoToggle?.checked && this.input.value.trim()) this.scheduleAutoRun();
      });
    }

    window.addEventListener('keydown', (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === 'l') {
        event.preventDefault();
        clearBtn?.click();
      }
    });
  }

  scheduleAutoRun() {
    clearTimeout(this.autoRunTimer);
    this.autoRunTimer = window.setTimeout(() => this.runBtn.click(), 180);
  }

  updateMetrics() {
    const metrics = document.getElementById('htmlMdMetrics');
    if (!metrics) return;

    const inputMetrics = Utils.countMetrics(this.input.value || '');
    const outputMetrics = Utils.countMetrics(this.output?.value || '');
    metrics.textContent = `Input: ${inputMetrics.chars.toLocaleString()} chars / ${inputMetrics.lines} lines · Output: ${outputMetrics.chars.toLocaleString()} chars / ${outputMetrics.lines} lines`;
  }

  updateDisabledState() {
    const hasInput = Boolean(this.input.value.trim());
    this.runBtn.disabled = !hasInput;
  }

  getOptions() {
    return {
      fencedCodeBlocks: Boolean(document.getElementById('htmlMdFenced')?.checked),
      keepLineBreaks: Boolean(document.getElementById('htmlMdBreaks')?.checked),
      preserveUnsupportedTags: Boolean(document.getElementById('htmlMdPreserve')?.checked),
      convertTables: Boolean(document.getElementById('htmlMdTables')?.checked),
      preservePreBlocks: Boolean(document.getElementById('htmlMdPre')?.checked),
      compactMode: (document.getElementById('htmlMdDensity')?.value ?? 'pretty') === 'compact'
    };
  }
}

const ui = new HtmlToMarkdownUi();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ui.init());
} else {
  ui.init();
}

export async function runTool(action, input) {
  if ((action ?? '').toLowerCase() !== 'convert') {
    throw new Error('Unsupported action for HTML to Markdown tool.');
  }

  try {
    const hasLargeInput = (input?.length ?? 0) > 180000;
    if (hasLargeInput) {
      ui.resultStatus.textContent = 'Processing large input…';
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    const result = Engine.convert(input, ui.getOptions());
    ui.updateMetrics();
    return result;
  } catch (error) {
    const safeError = ErrorHandler.toUserMessage(error);
    throw new Error(`${safeError.title}: ${safeError.explanation} ${safeError.suggestion}`);
  }
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules[TOOL_SLUG] = { runTool };
