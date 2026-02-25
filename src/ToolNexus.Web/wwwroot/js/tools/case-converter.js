import { getKeyboardEventManager } from './keyboard-event-manager.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const CASE_ACTIONS = Object.freeze({
  LOWERCASE: 'lowercase',
  UPPERCASE: 'uppercase',
  TITLE_CASE: 'title-case',
  SENTENCE_CASE: 'sentence-case',
  CAMEL_CASE: 'camel-case',
  PASCAL_CASE: 'pascal-case',
  SNAKE_CASE: 'snake-case',
  SCREAMING_SNAKE_CASE: 'screaming-snake-case',
  KEBAB_CASE: 'kebab-case',
  DOT_CASE: 'dot-case',
  PATH_CASE: 'path-case',
  ALTERNATING_CASE: 'alternating-case'
});

const ACTION_ALIASES = Object.freeze({
  lower: CASE_ACTIONS.LOWERCASE,
  upper: CASE_ACTIONS.UPPERCASE,
  title: CASE_ACTIONS.TITLE_CASE
});

const DEFAULT_ACTION = CASE_ACTIONS.LOWERCASE;
const TOOL_ID = 'case-converter';
const PREVIEW_ACTIONS = [
  CASE_ACTIONS.CAMEL_CASE,
  CASE_ACTIONS.PASCAL_CASE,
  CASE_ACTIONS.SNAKE_CASE,
  CASE_ACTIONS.KEBAB_CASE
];

const VALID_ACTIONS = new Set(Object.values(CASE_ACTIONS));

function resolveAction(action) {
  const normalizedAction = String(action ?? DEFAULT_ACTION).trim().toLowerCase();
  const aliasedAction = ACTION_ALIASES[normalizedAction] ?? normalizedAction;
  return VALID_ACTIONS.has(aliasedAction) ? aliasedAction : DEFAULT_ACTION;
}

const Utils = {
  normalizeLineEndings(value) {
    return (value ?? '').replace(/\r\n?/g, '\n');
  },

  trimLine(value) {
    return value.replace(/\s+/gu, ' ').trim();
  },

  isUppercaseAcronym(word) {
    return /^\p{Lu}[\p{Lu}\p{Nd}]{1,}$/u.test(word);
  },

  capitalizeWord(word) {
    if (!word) return '';
    const [first, ...rest] = [...word];
    return `${first.toLocaleUpperCase()}${rest.join('').toLocaleLowerCase()}`;
  },

  safeCountWords(input) {
    const words = input.match(/[\p{L}\p{N}]+/gu);
    return words?.length ?? 0;
  }
};

const Normalizer = {
  normalizeInput(input) {
    const normalized = Utils.normalizeLineEndings(typeof input === 'string' ? input : '');
    return normalized
      .split('\n')
      .map((line) => Normalizer.normalizeLine(line))
      .join('\n');
  },

  normalizeLine(line) {
    if (!line.trim()) return '';
    return line.replace(/\t/gu, ' ').replace(/[ \f\v]+/gu, ' ').trim();
  }
};

const Parser = {
  toWords(line) {
    if (!line) return [];

    const withBoundaries = line
      .replace(/([\p{Ll}\p{Nd}])([\p{Lu}])/gu, '$1 $2')
      .replace(/([\p{Lu}]+)([\p{Lu}][\p{Ll}])/gu, '$1 $2')
      .replace(/([\p{L}])(\p{Nd})/gu, '$1 $2')
      .replace(/(\p{Nd})(\p{L})/gu, '$1 $2');

    return withBoundaries
      .split(/[\s_\-./\\]+|[^\p{L}\p{N}]+/gu)
      .map((word) => word.trim())
      .filter(Boolean)
      .map((word) => ({
        raw: word,
        lower: word.toLocaleLowerCase(),
        acronym: Utils.isUppercaseAcronym(word)
      }));
  }
};

const Engine = {
  convert(action, input) {
    const resolvedAction = resolveAction(action);
    const normalizedInput = Normalizer.normalizeInput(input);
    const lines = normalizedInput.split('\n');

    const output = lines
      .map((line) => Engine.convertLine(resolvedAction, line))
      .join('\n');

    return output;
  },

  convertLine(action, line) {
    if (!line) return '';
    const words = Parser.toWords(line);

    switch (action) {
      case CASE_ACTIONS.LOWERCASE:
        return line.toLocaleLowerCase();
      case CASE_ACTIONS.UPPERCASE:
        return line.toLocaleUpperCase();
      case CASE_ACTIONS.TITLE_CASE:
        return words.map((word) => (word.acronym ? word.raw : Utils.capitalizeWord(word.lower))).join(' ');
      case CASE_ACTIONS.SENTENCE_CASE:
        return Engine.toSentenceCase(words);
      case CASE_ACTIONS.CAMEL_CASE:
        return Engine.toCamelCase(words);
      case CASE_ACTIONS.PASCAL_CASE:
        return Engine.toPascalCase(words);
      case CASE_ACTIONS.SNAKE_CASE:
        return Engine.toSeparatedCase(words, '_', 'lower');
      case CASE_ACTIONS.SCREAMING_SNAKE_CASE:
        return Engine.toSeparatedCase(words, '_', 'upper');
      case CASE_ACTIONS.KEBAB_CASE:
        return Engine.toSeparatedCase(words, '-', 'lower');
      case CASE_ACTIONS.DOT_CASE:
        return Engine.toSeparatedCase(words, '.', 'lower');
      case CASE_ACTIONS.PATH_CASE:
        return Engine.toSeparatedCase(words, '/', 'lower');
      case CASE_ACTIONS.ALTERNATING_CASE:
        return Engine.toAlternatingCase(line);
      default:
        return Engine.toSeparatedCase(words, ' ', 'lower');
    }
  },

  toSentenceCase(words) {
    if (words.length === 0) return '';

    return words
      .map((word, index) => {
        if (word.acronym) return word.raw;
        if (index === 0) return Utils.capitalizeWord(word.lower);
        return word.lower;
      })
      .join(' ');
  },

  toCamelCase(words) {
    if (words.length === 0) return '';

    return words
      .map((word, index) => {
        if (index === 0) return word.lower;
        return word.acronym ? word.raw : Utils.capitalizeWord(word.lower);
      })
      .join('');
  },

  toPascalCase(words) {
    return words
      .map((word) => (word.acronym ? word.raw : Utils.capitalizeWord(word.lower)))
      .join('');
  },

  toSeparatedCase(words, separator, style) {
    return words
      .map((word) => {
        if (style === 'upper') return word.lower.toLocaleUpperCase();
        return word.lower;
      })
      .join(separator);
  },

  toAlternatingCase(line) {
    let useUpper = true;
    let result = '';

    for (const char of line) {
      if (/\p{L}/u.test(char)) {
        result += useUpper ? char.toLocaleUpperCase() : char.toLocaleLowerCase();
        useUpper = !useUpper;
      } else {
        result += char;
      }
    }

    return result;
  }
};

const ErrorHandler = {
  handle(error) {
    console.error('Case conversion failed.', error);
    return 'Unable to convert text right now. Please retry or clear the input.';
  }
};

class CaseConverterUi {
  constructor(root) {
    this.page = root;
    if (!this.page) return;

    this.input = this.page.querySelector('#inputEditor');
    this.output = this.page.querySelector('#outputEditor');
    this.actionSelect = this.page.querySelector('#actionSelect');
    this.runBtn = this.page.querySelector('#runBtn');
    this.copyBtn = this.page.querySelector('#copyBtn');
    this.resultStatus = this.page.querySelector('#resultStatus');

    this.isAutoMode = true;
    this.pendingAutoRun = null;
    this.eventController = new AbortController();
    this.disposeKeyboardHandler = () => {};
  }

  init() {
    if (!this.page || !this.input || !this.actionSelect) return;

    this.renderLayoutEnhancements();
    this.hydrateActionOptions();
    this.bindEvents();
    this.refreshCounts();
    this.updateButtonStates();
    this.safeAutoRun();
  }

  renderLayoutEnhancements() {
    const heading = this.page.querySelector('.tool-page__heading p');
    if (heading) {
      heading.textContent = 'Normalize and transform text into developer-friendly case formats with predictable, line-by-line output.';
    }

    const actionGroup = this.page.querySelector('.tool-page__action-selector');
    if (actionGroup) {
      actionGroup.insertAdjacentHTML('beforeend', `
        <div class="case-controls" id="caseControls">
          <label class="case-controls__toggle">
            <input id="autoConvertToggle" type="checkbox" checked />
            <span>Auto convert</span>
          </label>
          <button id="clearInputBtn" class="tool-btn tool-btn--ghost" type="button">Clear input</button>
          <button id="swapTextBtn" class="tool-btn tool-btn--ghost" type="button">Swap</button>
        </div>
        <div class="case-previews" id="quickPreviewBar" role="group" aria-label="Quick conversion previews"></div>
        <div class="case-metrics" id="caseMetrics" aria-live="polite"></div>
      `);
    }
  }

  hydrateActionOptions() {
    const optionMap = new Map([
      [CASE_ACTIONS.LOWERCASE, 'lowercase'],
      [CASE_ACTIONS.UPPERCASE, 'UPPERCASE'],
      [CASE_ACTIONS.TITLE_CASE, 'Capitalize Words (Title Case)'],
      [CASE_ACTIONS.SENTENCE_CASE, 'sentence case'],
      [CASE_ACTIONS.CAMEL_CASE, 'camelCase'],
      [CASE_ACTIONS.PASCAL_CASE, 'PascalCase'],
      [CASE_ACTIONS.SNAKE_CASE, 'snake_case'],
      [CASE_ACTIONS.SCREAMING_SNAKE_CASE, 'SCREAMING_SNAKE_CASE'],
      [CASE_ACTIONS.KEBAB_CASE, 'kebab-case'],
      [CASE_ACTIONS.DOT_CASE, 'dot.case'],
      [CASE_ACTIONS.PATH_CASE, 'path/case'],
      [CASE_ACTIONS.ALTERNATING_CASE, 'alternating case']
    ]);

    const known = new Set(Array.from(this.actionSelect.options).map((o) => o.value));
    for (const [value, label] of optionMap.entries()) {
      if (known.has(value)) continue;
      const option = this.page.ownerDocument.createElement('option');
      option.value = value;
      option.textContent = label;
      this.actionSelect.appendChild(option);
    }

    if (!optionMap.has(this.actionSelect.value)) {
      this.actionSelect.value = CASE_ACTIONS.CAMEL_CASE;
    }

    const previewBar = this.page.querySelector('#quickPreviewBar');
    if (!previewBar) return;

    PREVIEW_ACTIONS.forEach((action) => {
      const button = this.page.ownerDocument.createElement('button');
      button.type = 'button';
      button.className = 'tool-btn tool-btn--outline case-preview-btn';
      button.dataset.action = action;
      button.textContent = optionMap.get(action) ?? action;
      previewBar.appendChild(button);
    });
  }

  bindEvents() {
    const autoToggle = this.page.querySelector('#autoConvertToggle');
    const clearBtn = this.page.querySelector('#clearInputBtn');
    const swapBtn = this.page.querySelector('#swapTextBtn');
    const metrics = this.page.querySelector('#caseMetrics');
    const signal = this.eventController.signal;

    this.input.addEventListener('input', () => {
      this.refreshCounts();
      this.updateButtonStates();
      if (this.isAutoMode) this.safeAutoRun();
    }, { signal });

    this.actionSelect.addEventListener('change', () => {
      this.updateSelectedPreview();
      if (this.isAutoMode) this.safeAutoRun();
    }, { signal });

    autoToggle?.addEventListener('change', () => {
      this.isAutoMode = autoToggle.checked;
      if (this.isAutoMode) this.safeAutoRun();
    }, { signal });

    clearBtn?.addEventListener('click', () => {
      this.input.value = '';
      this.refreshCounts();
      this.updateButtonStates();
      this.safeAutoRun();
      this.input.focus();
    }, { signal });

    swapBtn?.addEventListener('click', () => {
      const input = this.input.value;
      const output = this.output?.value ?? '';
      this.input.value = output;
      if (this.output) this.output.value = input;
      this.refreshCounts();
      this.updateButtonStates();
      this.safeAutoRun();
    }, { signal });

    metrics?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const previewAction = target.dataset.previewAction;
      if (!previewAction) return;
      this.actionSelect.value = previewAction;
      this.updateSelectedPreview();
      this.safeAutoRun();
    }, { signal });

    this.page.querySelector('#quickPreviewBar')?.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!(button instanceof HTMLButtonElement)) return;
      this.actionSelect.value = button.dataset.action ?? CASE_ACTIONS.CAMEL_CASE;
      this.updateSelectedPreview();
      this.safeAutoRun();
    }, { signal });

    this.disposeKeyboardHandler = getKeyboardEventManager().register({
      root: this.page,
      onKeydown: (event) => {
        if (!(event.ctrlKey || event.metaKey)) return;
        const key = event.key.toLowerCase();
        if (key === 'l') {
          event.preventDefault();
          this.input.value = '';
          this.refreshCounts();
          this.updateButtonStates();
          this.safeAutoRun();
        }

        if (key === 'c' && this.output === this.page.ownerDocument.activeElement && this.copyBtn) {
          this.copyBtn.classList.add('is-copied-feedback');
          setTimeout(() => this.copyBtn.classList.remove('is-copied-feedback'), 350);
        }
      }
    });

    this.updateSelectedPreview();
  }

  refreshCounts() {
    const metrics = this.page.querySelector('#caseMetrics');
    if (!metrics) return;

    const input = this.input.value ?? '';
    const chars = [...input].length;
    const words = Utils.safeCountWords(input);

    metrics.innerHTML = `
      <span><strong>${chars.toLocaleString()}</strong> characters</span>
      <span><strong>${words.toLocaleString()}</strong> words</span>
      <span class="case-metrics__hint">Ctrl/Cmd + Enter to convert • Ctrl/Cmd + L to clear</span>
    `;
  }

  updateButtonStates() {
    const hasInput = (this.input.value ?? '').trim().length > 0;
    if (this.runBtn) this.runBtn.disabled = !hasInput;
    if (this.copyBtn) this.copyBtn.disabled = !((this.output?.value ?? '').trim().length > 0);
  }

  updateSelectedPreview() {
    this.page.querySelectorAll('.case-preview-btn').forEach((button) => {
      const isSelected = button.dataset.action === this.actionSelect.value;
      button.classList.toggle('is-active', isSelected);
    });
  }

  safeAutoRun() {
    if (this.pendingAutoRun) window.clearTimeout(this.pendingAutoRun);
    this.pendingAutoRun = window.setTimeout(() => {
      if (!(this.input.value ?? '').trim()) return;
      this.runBtn?.click();
    }, 90);
  }

  destroy() {
    this.disposeKeyboardHandler();
    this.disposeKeyboardHandler = () => {};
    this.eventController.abort();
    if (this.pendingAutoRun) {
      window.clearTimeout(this.pendingAutoRun);
      this.pendingAutoRun = null;
    }
  }
}

export async function runTool(action, input) {
  try {
    const resolvedAction = resolveAction(action);
    return Engine.convert(resolvedAction, input);
  } catch (error) {
    return ErrorHandler.handle(error);
  }
}

function resolveRoot() {
  return document.querySelector('.tool-page[data-slug="case-converter"]');
}

function resolveRootFromContext(rootOrContext) {
  if (rootOrContext instanceof Element) {
    return rootOrContext;
  }

  if (rootOrContext?.root instanceof Element) {
    return rootOrContext.root;
  }

  if (rootOrContext?.toolRoot instanceof Element) {
    return rootOrContext.toolRoot;
  }

  return resolveRoot();
}

export function create(rootOrContext = resolveRoot()) {
  const root = resolveRootFromContext(rootOrContext);
  if (!root) {
    return null;
  }

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => {
      const app = new CaseConverterUi(root);
      app.init();
      return app;
    },
    destroy: (app) => app?.destroy()
  });
}

const handle = create(resolveRoot());
handle?.create();
handle?.init();

export function destroy(root = resolveRoot()) {
  if (!root) {
    return;
  }
  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['case-converter'] = { runTool };
