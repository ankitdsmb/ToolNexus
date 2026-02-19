const TOOL_SLUG = 'html-formatter';
const LARGE_INPUT_THRESHOLD = 120000;
const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const INLINE_ELEMENTS = new Set(['a', 'abbr', 'b', 'bdi', 'bdo', 'button', 'cite', 'code', 'data', 'dfn', 'em', 'i', 'kbd', 'label', 'mark', 'q', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var']);
const PRESERVE_WHITESPACE_ELEMENTS = new Set(['pre', 'textarea']);

const FormattingOptionsModule = (() => {
  const defaults = {
    indentSize: 2,
    indentWithTabs: false,
    maxLineWidth: 120,
    preserveAttributeLineBreaks: true,
    compactMode: false,
    showLineNumbers: false,
    autoFormat: false
  };

  const controls = {
    indentSize: null,
    indentWithTabs: null,
    maxLineWidth: null,
    preserveAttributeLineBreaks: null,
    compactMode: null,
    showLineNumbers: null,
    autoFormat: null
  };

  function indentUnit(options) {
    return options.indentWithTabs ? '\t' : ' '.repeat(options.indentSize);
  }

  function readOptions() {
    return {
      indentSize: Number.parseInt(controls.indentSize?.value ?? defaults.indentSize, 10) || defaults.indentSize,
      indentWithTabs: Boolean(controls.indentWithTabs?.checked),
      maxLineWidth: Number.parseInt(controls.maxLineWidth?.value ?? defaults.maxLineWidth, 10) || defaults.maxLineWidth,
      preserveAttributeLineBreaks: Boolean(controls.preserveAttributeLineBreaks?.checked),
      compactMode: Boolean(controls.compactMode?.checked),
      showLineNumbers: Boolean(controls.showLineNumbers?.checked),
      autoFormat: Boolean(controls.autoFormat?.checked)
    };
  }

  function bind(container, onAutoFormat) {
    if (!container) return;

    controls.indentSize = container.querySelector('[data-html-option="indent-size"]');
    controls.indentWithTabs = container.querySelector('[data-html-option="indent-tabs"]');
    controls.maxLineWidth = container.querySelector('[data-html-option="max-line-width"]');
    controls.preserveAttributeLineBreaks = container.querySelector('[data-html-option="preserve-attr-breaks"]');
    controls.compactMode = container.querySelector('[data-html-option="compact-mode"]');
    controls.showLineNumbers = container.querySelector('[data-html-option="show-line-numbers"]');
    controls.autoFormat = container.querySelector('[data-html-option="auto-format"]');

    controls.autoFormat?.addEventListener('change', () => {
      if (controls.autoFormat.checked) onAutoFormat();
    });
  }

  return { defaults, bind, readOptions, indentUnit };
})();

const InputNormalizationLayer = (() => {
  function normalize(input) {
    if (typeof input !== 'string') return '';
    return input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  }

  return { normalize };
})();

const UtilityHelpers = (() => {
  function countLines(text) {
    if (!text) return 0;
    return text.split('\n').length;
  }

  function withLineNumbers(text) {
    const lines = text.split('\n');
    const width = String(lines.length).length;
    return lines.map((line, index) => `${String(index + 1).padStart(width, ' ')} | ${line}`).join('\n');
  }

  function createDownload(content, filename) {
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  function debounce(fn, wait = 300) {
    let timer = 0;
    return (...args) => {
      clearTimeout(timer);
      timer = window.setTimeout(() => fn(...args), wait);
    };
  }

  function computeApproxLineFromIndex(input, index) {
    if (!Number.isFinite(index) || index <= 0) return null;
    return input.slice(0, index).split('\n').length;
  }

  return { countLines, withLineNumbers, createDownload, debounce, computeApproxLineFromIndex };
})();

const ErrorHandlingModule = (() => {
  function toUserError(error, input) {
    const fallback = {
      title: 'Formatting failed',
      message: 'Unable to format this HTML input safely.',
      line: null,
      warning: false
    };

    if (!error) return fallback;

    if (error.type === 'html-warning') {
      return {
        title: 'Formatted with warnings',
        message: error.message,
        line: error.index != null ? UtilityHelpers.computeApproxLineFromIndex(input, error.index) : null,
        warning: true
      };
    }

    return {
      title: 'Formatting failed',
      message: error.message || fallback.message,
      line: error.index != null ? UtilityHelpers.computeApproxLineFromIndex(input, error.index) : null,
      warning: false
    };
  }

  function renderError(errorNode, details) {
    if (!errorNode || !details) return;
    const lineHint = details.line ? ` Approximate line: ${details.line}.` : '';
    errorNode.textContent = `${details.title}. ${details.message}${lineHint}`;
    errorNode.hidden = false;
  }

  return { toUserError, renderError };
})();

const HtmlFormattingEngine = (() => {
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

        if ((name === 'script' || name === 'style') && !isSelfClosing) {
          const closeTag = `</${name}>`;
          const closeTagIndex = html.toLowerCase().indexOf(closeTag, i);
          const contentEnd = closeTagIndex >= 0 ? closeTagIndex : html.length;
          const content = html.slice(i, contentEnd);
          if (content) tokens.push({ type: 'rawText', name, value: content });
          if (closeTagIndex >= 0) {
            tokens.push({ type: 'closeTag', name, raw: closeTag });
            i = closeTagIndex + closeTag.length;
          } else {
            i = html.length;
          }
        }

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
        if (!found) {
          warnings.push({ type: 'html-warning', message: `Ignoring unmatched closing tag </${token.name}>.` });
        }
        continue;
      }

      parent.children.push(token);
    }

    if (stack.length > 1) {
      warnings.push({ type: 'html-warning', message: 'Input contains unclosed tags. Formatter applied safe auto-closing.' });
    }

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
    if (singleLine.length <= options.maxLineWidth && !options.preserveAttributeLineBreaks) {
      return singleLine;
    }

    const pad = FormattingOptionsModule.indentUnit(options).repeat(depth + 1);
    return `<${node.name}\n${attrs.map((attr) => `${pad}${attr}`).join('\n')}\n${FormattingOptionsModule.indentUnit(options).repeat(depth)}${closeToken}`;
  }

  function formatNode(node, options, depth, parentPreservesWhitespace = false) {
    const indent = FormattingOptionsModule.indentUnit(options).repeat(depth);

    if (node.type === 'comment') return `${indent}${node.value.trim()}`;
    if (node.type === 'doctype') return `${indent}${node.value.trim()}`;

    if (node.type === 'text') {
      if (parentPreservesWhitespace) return node.value;
      const collapsed = node.value.replace(/\s+/g, ' ').trim();
      return collapsed ? `${indent}${collapsed}` : '';
    }

    if (node.type === 'rawText') {
      return `${indent}${node.value}`;
    }

    if (node.type !== 'element') return '';

    const preservesWhitespace = PRESERVE_WHITESPACE_ELEMENTS.has(node.name);
    const inlineTag = INLINE_ELEMENTS.has(node.name);
    const openTag = formatOpenTag(node, options, depth);

    if (node.selfClosing || VOID_ELEMENTS.has(node.name)) return `${indent}${openTag}`;

    const childLines = node.children
      .map((child) => formatNode(child, options, depth + 1, preservesWhitespace))
      .filter(Boolean);

    if (!childLines.length) return `${indent}${openTag}</${node.name}>`;

    if (inlineTag && childLines.length === 1 && childLines[0].trim().length < options.maxLineWidth / 2) {
      const inlineText = childLines[0].trim();
      return `${indent}${openTag}${inlineText}</${node.name}>`;
    }

    if (preservesWhitespace) {
      const rawContent = node.children
        .map((child) => (child.type === 'text' || child.type === 'rawText' ? child.value : formatNode(child, options, 0, true)))
        .join('');
      return `${indent}${openTag}${rawContent}</${node.name}>`;
    }

    return `${indent}${openTag}\n${childLines.join('\n')}\n${indent}</${node.name}>`;
  }

  function formatPretty(html, options) {
    const tokens = tokenize(html);
    const { root, warnings } = buildTree(tokens);
    const output = root.children
      .map((node) => formatNode(node, options, 0, false))
      .filter(Boolean)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return { output, warnings };
  }

  function formatCompact(html) {
    const tokens = tokenize(html);
    let inPreserve = false;
    let preserveTag = '';

    const result = tokens.map((token) => {
      if (token.type === 'openTag' && PRESERVE_WHITESPACE_ELEMENTS.has(token.name)) {
        inPreserve = true;
        preserveTag = token.name;
        return token.raw.trim();
      }

      if (token.type === 'closeTag' && inPreserve && token.name === preserveTag) {
        inPreserve = false;
        preserveTag = '';
        return token.raw.trim();
      }

      if (token.type === 'text') {
        if (inPreserve) return token.value;
        return token.value.replace(/\s+/g, ' ').trim();
      }

      if (token.type === 'rawText') return token.value;
      if (token.raw) return token.raw.trim();
      if (token.value) return token.value.trim();
      return '';
    }).filter(Boolean).join('');

    return { output: result.replace(/>\s+</g, '><').trim(), warnings: [] };
  }

  function format(html, options) {
    return options.compactMode ? formatCompact(html) : formatPretty(html, options);
  }

  return { format };
})();

const UiLayer = (() => {
  let isInitialized = false;
  let customCopyButton = null;
  let customDownloadButton = null;
  let clearButton = null;
  let statusNode = null;
  let optionsContainer = null;

  function initialize() {
    if (isInitialized) return;

    const page = document.querySelector(`.tool-page[data-slug="${TOOL_SLUG}"]`);
    if (!page) return;

    const inputLabel = document.querySelector('label[for="inputEditor"]');
    const outputLabel = document.querySelector('label[for="outputEditor"]');
    if (inputLabel) inputLabel.textContent = 'Raw HTML input';
    if (outputLabel) outputLabel.textContent = 'Formatted HTML output';

    const heading = page.querySelector('.tool-page__heading p');
    if (heading) heading.textContent = 'Production-grade HTML beautifier and compact formatter. Runs entirely in your browser.';

    const header = page.querySelector('.tool-page__heading div');
    if (header && !header.querySelector('.html-formatter-badge')) {
      const badge = document.createElement('span');
      badge.className = 'html-formatter-badge';
      badge.textContent = 'Client-side processing';
      header.appendChild(badge);
    }

    const toolbar = document.querySelector('.tool-toolbar__actions');
    const runBtn = document.getElementById('runBtn');
    const runLabel = runBtn?.querySelector('.tool-btn__label');
    const actionSelect = document.getElementById('actionSelect');

    if (runLabel) {
      runLabel.dataset.defaultLabel = 'Format';
      runLabel.textContent = 'Format';
    }

    if (actionSelect) {
      actionSelect.value = 'format';
      const minifyOption = actionSelect.querySelector('option[value="minify"]');
      if (minifyOption) minifyOption.textContent = 'Compact';
    }

    if (toolbar && !toolbar.querySelector('[data-html-action="clear"]')) {
      clearButton = document.createElement('button');
      clearButton.type = 'button';
      clearButton.className = 'tool-btn tool-btn--outline';
      clearButton.dataset.htmlAction = 'clear';
      clearButton.textContent = 'Clear input';
      toolbar.insertBefore(clearButton, runBtn?.nextSibling ?? null);
    } else {
      clearButton = toolbar?.querySelector('[data-html-action="clear"]') ?? null;
    }

    customCopyButton = document.getElementById('copyBtn');
    customDownloadButton = document.getElementById('downloadBtn');
    if (customCopyButton) customCopyButton.textContent = 'Copy output';
    if (customDownloadButton) customDownloadButton.textContent = 'Download HTML';

    const inputPanel = page.querySelector('.tool-layout__panel');
    if (inputPanel && !inputPanel.querySelector('.html-formatter-options')) {
      optionsContainer = document.createElement('section');
      optionsContainer.className = 'html-formatter-options';
      optionsContainer.innerHTML = `
        <h3>Formatting options</h3>
        <div class="html-formatter-options__grid">
          <label>Indent size
            <select data-html-option="indent-size">
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
            </select>
          </label>
          <label>Indent style
            <select data-html-option="indent-tabs">
              <option value="false">Spaces</option>
              <option value="true">Tabs</option>
            </select>
          </label>
          <label>Max line width
            <input data-html-option="max-line-width" type="number" min="60" max="240" value="120" />
          </label>
          <label><input data-html-option="preserve-attr-breaks" type="checkbox" checked /> Preserve attribute line breaks</label>
          <label><input data-html-option="compact-mode" type="checkbox" /> Compact mode</label>
          <label><input data-html-option="show-line-numbers" type="checkbox" /> Show line numbers in output</label>
          <label><input data-html-option="auto-format" type="checkbox" /> Auto format on input</label>
        </div>`;
      const samplePanel = inputPanel.querySelector('.sample-panel');
      inputPanel.insertBefore(optionsContainer, samplePanel);
    } else {
      optionsContainer = inputPanel?.querySelector('.html-formatter-options') ?? null;
    }

    const indentTabs = optionsContainer?.querySelector('[data-html-option="indent-tabs"]');
    indentTabs?.addEventListener('change', () => {
      indentTabs.dataset.boolValue = indentTabs.value;
    });

    const outputPanelHeader = page.querySelector('.tool-panel--output .panel-header');
    if (outputPanelHeader && !outputPanelHeader.querySelector('.html-formatter-status')) {
      statusNode = document.createElement('p');
      statusNode.className = 'html-formatter-status';
      statusNode.textContent = '0 characters • 0 lines';
      outputPanelHeader.appendChild(statusNode);
    } else {
      statusNode = outputPanelHeader?.querySelector('.html-formatter-status') ?? null;
    }

    isInitialized = true;
  }

  function updateMetrics(text) {
    if (!statusNode) return;
    statusNode.textContent = `${text.length} characters • ${UtilityHelpers.countLines(text)} lines`;
  }

  function updateProcessingState(isProcessing) {
    const resultStatus = document.getElementById('resultStatus');
    if (!resultStatus) return;
    if (isProcessing) resultStatus.textContent = 'Processing...';
  }

  function bindInteractions(onClear, onCopy, onDownload, onAutoFormat) {
    clearButton?.addEventListener('click', onClear);
    customCopyButton?.addEventListener('click', onCopy);
    customDownloadButton?.addEventListener('click', onDownload);
    FormattingOptionsModule.bind(optionsContainer, onAutoFormat);
  }

  function readOptions() {
    const options = FormattingOptionsModule.readOptions();
    const indentMode = optionsContainer?.querySelector('[data-html-option="indent-tabs"]')?.value === 'true';
    options.indentWithTabs = indentMode;
    return options;
  }

  return { initialize, bindInteractions, readOptions, updateMetrics, updateProcessingState };
})();

async function runTool(action, input) {
  const normalizedInput = InputNormalizationLayer.normalize(input);
  const options = UiLayer.readOptions();

  if (!normalizedInput.trim()) return '';

  if (normalizedInput.length >= LARGE_INPUT_THRESHOLD) {
    UiLayer.updateProcessingState(true);
    await new Promise((resolve) => window.setTimeout(resolve, 16));
  }

  const desiredAction = (action ?? 'format').toLowerCase();
  const effectiveOptions = {
    ...FormattingOptionsModule.defaults,
    ...options,
    compactMode: desiredAction === 'minify' ? true : options.compactMode
  };

  const formatted = HtmlFormattingEngine.format(normalizedInput, effectiveOptions);

  const display = effectiveOptions.showLineNumbers
    ? UtilityHelpers.withLineNumbers(formatted.output)
    : formatted.output;

  if (formatted.warnings.length) {
    const warning = ErrorHandlingModule.toUserError(formatted.warnings[0], normalizedInput);
    const errorNode = document.getElementById('errorMessage');
    ErrorHandlingModule.renderError(errorNode, warning);
  } else {
    const errorNode = document.getElementById('errorMessage');
    if (errorNode) {
      errorNode.hidden = true;
      errorNode.textContent = '';
    }
  }

  UiLayer.updateMetrics(display);
  UiLayer.updateProcessingState(false);
  return display;
}

function setupFormatterUi() {
  UiLayer.initialize();

  const inputEditor = document.getElementById('inputEditor');
  const outputEditor = document.getElementById('outputEditor');
  const autoRun = UtilityHelpers.debounce(() => {
    if (UiLayer.readOptions().autoFormat) {
      document.getElementById('runBtn')?.click();
    }
  }, 350);

  const runBtn = document.getElementById('runBtn');
  const clearBtn = document.querySelector('[data-html-action="clear"]');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');

  const updateButtonStates = () => {
    const hasInput = Boolean((inputEditor?.value ?? '').trim());
    const hasOutput = Boolean((outputEditor?.value ?? '').trim());
    if (runBtn) runBtn.disabled = !hasInput;
    if (clearBtn) clearBtn.disabled = !hasInput;
    if (copyBtn) copyBtn.disabled = !hasOutput;
    if (downloadBtn) downloadBtn.disabled = !hasOutput;
  };

  UiLayer.bindInteractions(
    () => {
      if (!inputEditor) return;
      inputEditor.value = '';
      if (outputEditor) outputEditor.value = '';
      const errorNode = document.getElementById('errorMessage');
      if (errorNode) {
        errorNode.hidden = true;
        errorNode.textContent = '';
      }
      UiLayer.updateMetrics('');
      updateButtonStates();
    },
    async () => {
      const value = outputEditor?.value ?? '';
      if (!value.trim()) return;
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        // tool-page handles UX feedback for failures
      }
      updateButtonStates();
    },
    () => {
      const value = outputEditor?.value ?? '';
      if (!value.trim()) return;
      UtilityHelpers.createDownload(value, 'formatted.html');
      updateButtonStates();
    },
    () => {
      if ((inputEditor?.value ?? '').trim()) {
        document.getElementById('runBtn')?.click();
      }
    }
  );

  inputEditor?.addEventListener('input', () => {
    autoRun();
    updateButtonStates();
  });

  outputEditor?.addEventListener('input', updateButtonStates);
  updateButtonStates();

  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.repeat) return;

    if (event.key === 'l' || event.key === 'L') {
      const isFocusInEditor = document.activeElement === inputEditor;
      if (!isFocusInEditor) return;
      event.preventDefault();
      document.querySelector('[data-html-action="clear"]')?.click();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupFormatterUi, { once: true });
} else {
  setupFormatterUi();
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules[TOOL_SLUG] = { runTool };

export { runTool };
