const UI_IDS = {
  page: '.tool-page[data-slug="css-minifier"]',
  actionSelect: 'actionSelect',
  inputEditor: 'inputEditor',
  runBtn: 'runBtn',
  copyBtn: 'copyBtn',
  downloadBtn: 'downloadBtn',
  shortcutHint: 'editorShortcutHint',
  outputHeading: 'toolOutputHeading',
  outputStatus: 'resultStatus'
};

const STATE = {
  preserveImportantComments: false,
  autoMinify: false,
  lastInputHash: '',
  autoTimer: null
};

const CSS_TOKEN = {
  quote: /["']/,
  whitespace: /\s/
};

const ERROR_TITLES = {
  empty: 'Input Required',
  invalid: 'Potential CSS Syntax Issue',
  processing: 'Minification Failed'
};

const DOWNLOAD_FILE_NAME = 'styles.min.css';
const AUTO_MINIFY_DEBOUNCE_MS = 280;

function getDom() {
  const page = document.querySelector(UI_IDS.page);
  if (!page) return null;

  return {
    page,
    actionSelect: document.getElementById(UI_IDS.actionSelect),
    inputEditor: document.getElementById(UI_IDS.inputEditor),
    runBtn: document.getElementById(UI_IDS.runBtn),
    copyBtn: document.getElementById(UI_IDS.copyBtn),
    downloadBtn: document.getElementById(UI_IDS.downloadBtn),
    shortcutHint: document.getElementById(UI_IDS.shortcutHint),
    outputHeading: document.getElementById(UI_IDS.outputHeading),
    outputStatus: document.getElementById(UI_IDS.outputStatus)
  };
}

function escapeHtml(value) {
  return (value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getByteSize(value) {
  return new TextEncoder().encode(value).length;
}

function hashInput(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return String(hash);
}

function readCurrentOutput() {
  if (window.monaco?.editor?.getModels) {
    const outputModel = window.monaco.editor.getModels()[1];
    if (outputModel) return outputModel.getValue();
  }

  return document.getElementById('outputEditor')?.value ?? '';
}

function normalizeInput(rawInput) {
  const original = typeof rawInput === 'string' ? rawInput : String(rawInput ?? '');
  const trimmed = original.trim();

  return {
    original,
    normalized: trimmed,
    isEmpty: trimmed.length === 0,
    warnings: performCssSanityChecks(trimmed)
  };
}

function performCssSanityChecks(css) {
  if (!css) return [];

  const warnings = [];
  const braceBalance = countDelta(css, '{', '}');
  const parenBalance = countDelta(css, '(', ')');

  if (braceBalance !== 0) warnings.push('Block braces appear unbalanced.');
  if (parenBalance !== 0) warnings.push('Parentheses appear unbalanced.');

  const unmatchedQuotes = hasUnmatchedQuotes(css);
  if (unmatchedQuotes) warnings.push('Quoted string appears to be unterminated.');

  return warnings;
}

function countDelta(value, openToken, closeToken) {
  let delta = 0;
  for (const character of value) {
    if (character === openToken) delta += 1;
    if (character === closeToken) delta -= 1;
  }
  return delta;
}

function hasUnmatchedQuotes(css) {
  let quote = '';
  let escaped = false;

  for (const character of css) {
    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      continue;
    }

    if (!quote && CSS_TOKEN.quote.test(character)) {
      quote = character;
      continue;
    }

    if (quote && character === quote) {
      quote = '';
    }
  }

  return Boolean(quote);
}

function createStructuredError(title, explanation, location = null) {
  return { title, explanation, location };
}

function renderStatus(message, level = 'info') {
  const status = document.getElementById(UI_IDS.outputStatus);
  if (!status) return;

  status.textContent = message;
  status.classList.remove('result-indicator--idle', 'result-indicator--success', 'result-indicator--failure');

  if (level === 'success') status.classList.add('result-indicator--success');
  else if (level === 'error') status.classList.add('result-indicator--failure');
  else status.classList.add('result-indicator--idle');
}

function getWarningRegion() {
  return document.getElementById('cssMinifierWarnings');
}

function ensureEnhancements() {
  const dom = getDom();
  if (!dom || dom.page.dataset.cssMinifierEnhanced === 'true') return;

  dom.page.dataset.cssMinifierEnhanced = 'true';
  if (dom.actionSelect) dom.actionSelect.value = dom.actionSelect.options[0]?.value ?? '';

  if (dom.shortcutHint) {
    dom.shortcutHint.textContent = 'Shortcuts: Ctrl/Cmd + Enter to minify, Ctrl/Cmd + L to clear input';
  }

  if (dom.outputHeading) dom.outputHeading.textContent = 'Minified CSS Output';
  if (dom.runBtn) dom.runBtn.querySelector('.tool-btn__label').textContent = 'Minify';
  if (dom.copyBtn) dom.copyBtn.textContent = 'Copy Output';
  if (dom.downloadBtn) dom.downloadBtn.textContent = 'Download .min.css';

  const toolbar = dom.runBtn?.parentElement;
  if (toolbar) {
    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'tool-btn tool-btn--outline';
    clearButton.id = 'cssMinifierClearBtn';
    clearButton.textContent = 'Clear Input';
    clearButton.addEventListener('click', clearInput);

    const options = document.createElement('div');
    options.className = 'css-minifier-options';
    options.innerHTML = `
      <label><input id="cssAutoMinifyToggle" type="checkbox" /> Auto minify</label>
      <label><input id="cssPreserveCommentsToggle" type="checkbox" /> Preserve /*! comments */</label>
    `;

    toolbar.append(clearButton);
    toolbar.after(options);
  }

  const outputPanel = document.getElementById('outputField')?.parentElement;
  if (outputPanel) {
    const metrics = document.createElement('div');
    metrics.id = 'cssMinifierMetrics';
    metrics.className = 'css-minifier-metrics';
    metrics.innerHTML = '<span>Original: 0 B</span><span>Minified: 0 B</span><span>Reduction: 0%</span>';

    const warnings = document.createElement('div');
    warnings.id = 'cssMinifierWarnings';
    warnings.className = 'tool-error';
    warnings.hidden = true;

    const badge = document.createElement('p');
    badge.className = 'shortcut-hint';
    badge.textContent = 'Client-side processing only';

    outputPanel.prepend(metrics);
    outputPanel.prepend(warnings);
    outputPanel.prepend(badge);
  }

  bindEnhancedInteractions();
}

function clearInput() {
  const editor = document.getElementById(UI_IDS.inputEditor);
  if (editor) editor.value = '';

  if (window.monaco?.editor?.getModels) {
    const models = window.monaco.editor.getModels();
    if (models[0]) models[0].setValue('');
    if (models[1]) models[1].setValue('');
  }

  const output = document.getElementById('outputEditor');
  if (output) output.value = '';

  const warnings = getWarningRegion();
  if (warnings) {
    warnings.hidden = true;
    warnings.innerHTML = '';
  }

  updateMetrics('', '');
  renderStatus('Cleared', 'info');
}

function bindEnhancedInteractions() {
  const autoToggle = document.getElementById('cssAutoMinifyToggle');
  const preserveToggle = document.getElementById('cssPreserveCommentsToggle');
  const inputRegion = document.getElementById('inputEditorSurface') ?? document.getElementById(UI_IDS.inputEditor);
  const downloadBtn = document.getElementById(UI_IDS.downloadBtn);

  autoToggle?.addEventListener('change', () => {
    STATE.autoMinify = autoToggle.checked;
  });

  preserveToggle?.addEventListener('change', () => {
    STATE.preserveImportantComments = preserveToggle.checked;
  });

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      clearInput();
    }
  });

  if (downloadBtn) {
    const replacement = downloadBtn.cloneNode(true);
    downloadBtn.replaceWith(replacement);

    replacement.addEventListener('click', () => {
      const output = readCurrentOutput();
      if (!output.trim()) return;

      const blob = new Blob([output], { type: 'text/css' });
      const anchor = document.createElement('a');
      anchor.href = URL.createObjectURL(blob);
      anchor.download = DOWNLOAD_FILE_NAME;
      anchor.click();
      URL.revokeObjectURL(anchor.href);
    });
  }

  inputRegion?.addEventListener('keyup', () => {
    if (!STATE.autoMinify) return;

    window.clearTimeout(STATE.autoTimer);
    STATE.autoTimer = window.setTimeout(() => {
      if (typeof window.ToolNexusRun === 'function') {
        window.ToolNexusRun();
      }
    }, AUTO_MINIFY_DEBOUNCE_MS);
  });
}

function updateMetrics(original, minified) {
  const region = document.getElementById('cssMinifierMetrics');
  if (!region) return;

  const originalSize = getByteSize(original);
  const minifiedSize = getByteSize(minified);
  const reduction = originalSize === 0 ? 0 : ((1 - (minifiedSize / originalSize)) * 100);

  region.innerHTML = `
    <span>Original: ${formatBytes(originalSize)}</span>
    <span>Minified: ${formatBytes(minifiedSize)}</span>
    <span>Reduction: ${reduction.toFixed(1)}%</span>
  `;
}

function renderWarnings(warnings) {
  const region = getWarningRegion();
  if (!region) return;

  if (!warnings.length) {
    region.hidden = true;
    region.innerHTML = '';
    return;
  }

  region.hidden = false;
  region.innerHTML = `
    <strong>${ERROR_TITLES.invalid}</strong>
    <ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>
  `;
}

function findErrorLocation(css) {
  let line = 1;
  let column = 1;

  for (let index = 0; index < css.length; index += 1) {
    const character = css[index];

    if (character === '\n') {
      line += 1;
      column = 1;
      continue;
    }

    column += 1;
  }

  return { line, column };
}

function minifyCss(css, options = { preserveImportantComments: false }) {
  const output = [];
  const length = css.length;

  let index = 0;
  let quote = '';
  let inComment = false;
  let inImportantComment = false;
  let pendingWhitespace = false;

  while (index < length) {
    const character = css[index];
    const nextCharacter = css[index + 1] ?? '';

    if (inComment) {
      if (character === '*' && nextCharacter === '/') {
        if (inImportantComment && options.preserveImportantComments) {
          output.push('*', '/');
        }
        inComment = false;
        inImportantComment = false;
        index += 2;
        continue;
      }

      if (inImportantComment && options.preserveImportantComments) {
        output.push(character);
      }

      index += 1;
      continue;
    }

    if (!quote && character === '/' && nextCharacter === '*') {
      inComment = true;
      inImportantComment = css[index + 2] === '!';

      if (inImportantComment && options.preserveImportantComments) {
        output.push('/', '*', '!');
        index += 3;
      } else {
        index += 2;
      }
      continue;
    }

    if (quote) {
      output.push(character);

      if (character === '\\' && index + 1 < length) {
        output.push(css[index + 1]);
        index += 2;
        continue;
      }

      if (character === quote) quote = '';
      index += 1;
      continue;
    }

    if (CSS_TOKEN.quote.test(character)) {
      quote = character;
      output.push(character);
      index += 1;
      continue;
    }

    if (CSS_TOKEN.whitespace.test(character)) {
      pendingWhitespace = true;
      index += 1;
      continue;
    }

    const isBoundary = character === ':' || character === ';' || character === '{' || character === '}' || character === ',' || character === '>' || character === '+' || character === '~' || character === '(' || character === ')';

    if (pendingWhitespace) {
      const previous = output[output.length - 1] ?? '';
      if (previous && !isMinificationBoundary(previous) && !isBoundary) {
        output.push(' ');
      }
      pendingWhitespace = false;
    }

    if (character === ';' && (nextCharacter === '}' || nextCharacter === '' || CSS_TOKEN.whitespace.test(nextCharacter))) {
      const lookAhead = consumeWhitespace(css, index + 1);
      if (css[lookAhead] === '}') {
        index += 1;
        continue;
      }
    }

    output.push(character);
    index += 1;
  }

  return output.join('').trim();
}

function consumeWhitespace(value, startIndex) {
  let cursor = startIndex;
  while (cursor < value.length && CSS_TOKEN.whitespace.test(value[cursor])) {
    cursor += 1;
  }
  return cursor;
}

function isMinificationBoundary(character) {
  return character === ':' || character === ';' || character === '{' || character === '}' || character === ',' || character === '(' || character === ')';
}

function validateForExecution(normalizedInput) {
  if (normalizedInput.isEmpty) {
    throw createStructuredError(ERROR_TITLES.empty, 'Paste CSS into the input panel before minifying.');
  }
}

function toUserErrorMessage(error) {
  if (error?.title) {
    const location = error.location ? ` (line ${error.location.line}, col ${error.location.column})` : '';
    return `${error.title}: ${error.explanation}${location}`;
  }

  return `${ERROR_TITLES.processing}: Unable to minify the provided CSS safely.`;
}

export async function runTool(action, input) {
  ensureEnhancements();
  renderStatus('Processing…', 'info');

  const start = performance.now();
  const normalizedInput = normalizeInput(input);

  try {
    validateForExecution(normalizedInput);
    renderWarnings(normalizedInput.warnings);

    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    const minified = minifyCss(normalizedInput.normalized, {
      preserveImportantComments: STATE.preserveImportantComments
    });

    updateMetrics(normalizedInput.original, minified);
    STATE.lastInputHash = hashInput(normalizedInput.original);

    const duration = Math.max(1, Math.round(performance.now() - start));
    renderStatus(`Minified successfully in ${duration}ms`, 'success');

    return minified;
  } catch (error) {
    const message = toUserErrorMessage(error);
    const region = getWarningRegion();

    if (region) {
      region.hidden = false;
      region.innerHTML = `<strong>${escapeHtml(error.title ?? ERROR_TITLES.processing)}</strong><p>${escapeHtml(error.explanation ?? message)}</p>`;
    }

    renderStatus('Minification failed', 'error');
    throw new Error(message);
  }
}

function boot() {
  ensureEnhancements();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['css-minifier'] = { runTool };
