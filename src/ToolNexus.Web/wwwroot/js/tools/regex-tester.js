const MODULE_KEY = 'regex-tester';
const INIT_FLAG = 'regexTesterInitialized';
const DEFAULT_MAX_INPUT_LENGTH = 100_000;
const DEFAULT_MAX_PATTERN_LENGTH = 2_048;

export class RegexToolError extends Error {
  constructor(message, code = 'REGEX_TOOL_ERROR') {
    super(message);
    this.name = 'RegexToolError';
    this.code = code;
  }
}

export function normalizeRegexOptions(options = {}) {
  const safeOptions = options && typeof options === 'object' ? options : {};

  return {
    pattern: typeof safeOptions.pattern === 'string' ? safeOptions.pattern : '',
    candidate: typeof safeOptions.candidate === 'string'
      ? safeOptions.candidate
      : typeof safeOptions.input === 'string'
        ? safeOptions.input
        : '',
    flags: sanitizeFlags(safeOptions.flags),
    maxInputLength: normalizeLimit(safeOptions.maxInputLength, DEFAULT_MAX_INPUT_LENGTH),
    maxPatternLength: normalizeLimit(safeOptions.maxPatternLength, DEFAULT_MAX_PATTERN_LENGTH),
    includeMatches: safeOptions.includeMatches !== false,
    includeGroups: safeOptions.includeGroups !== false
  };
}

export function sanitizeFlags(flags) {
  if (typeof flags !== 'string') {
    return '';
  }

  const allowed = new Set(['d', 'g', 'i', 'm', 's', 'u', 'v', 'y']);
  const seen = new Set();

  for (const flag of flags.trim()) {
    if (!allowed.has(flag) || seen.has(flag)) {
      continue;
    }

    seen.add(flag);
  }

  return Array.from(seen).sort().join('');
}

function normalizeLimit(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }

  return Math.floor(numeric);
}

export function validateRegexInputs(pattern, candidate, limits = {}) {
  const maxPatternLength = normalizeLimit(limits.maxPatternLength, DEFAULT_MAX_PATTERN_LENGTH);
  const maxInputLength = normalizeLimit(limits.maxInputLength, DEFAULT_MAX_INPUT_LENGTH);

  if (typeof pattern !== 'string') {
    throw new RegexToolError('Pattern must be a string.', 'INVALID_PATTERN');
  }

  if (typeof candidate !== 'string') {
    throw new RegexToolError('Input must be a string.', 'INVALID_INPUT');
  }

  if (pattern.length > maxPatternLength) {
    throw new RegexToolError(`Pattern is too large. Maximum length is ${maxPatternLength}.`, 'PATTERN_TOO_LARGE');
  }

  if (candidate.length > maxInputLength) {
    throw new RegexToolError(`Input is too large. Maximum length is ${maxInputLength}.`, 'INPUT_TOO_LARGE');
  }
}

export function runRegexEvaluation(pattern, candidate, flags = '', config = {}) {
  const normalizedFlags = sanitizeFlags(flags);
  const normalizedConfig = normalizeRegexOptions({ ...config, flags: normalizedFlags, pattern, candidate });

  validateRegexInputs(normalizedConfig.pattern, normalizedConfig.candidate, normalizedConfig);

  let expression;
  try {
    expression = new RegExp(normalizedConfig.pattern, normalizedConfig.flags);
  } catch {
    throw new RegexToolError('Pattern is not a valid regular expression.', 'INVALID_EXPRESSION');
  }

  const matcher = normalizedFlags.includes('g') || normalizedFlags.includes('y')
    ? new RegExp(expression.source, expression.flags)
    : expression;

  const matches = [];
  if (normalizedConfig.includeMatches) {
    if (matcher.global || matcher.sticky) {
      for (const match of normalizedConfig.candidate.matchAll(matcher)) {
        matches.push(match[0]);
        if (matches.length >= 500) {
          break;
        }
      }
    } else {
      const match = matcher.exec(normalizedConfig.candidate);
      if (match) {
        matches.push(match[0]);
      }
    }
  }

  const firstMatch = expression.exec(normalizedConfig.candidate);
  const groups = normalizedConfig.includeGroups && firstMatch
    ? firstMatch.slice(1)
    : [];

  return {
    isMatch: Boolean(firstMatch),
    matchCount: matches.length,
    matches,
    groups,
    flags: normalizedFlags
  };
}

export async function runTool(action, input, options = {}) {
  if (action !== 'test') {
    throw new RegexToolError(`Unsupported action: ${action}`, 'UNSUPPORTED_ACTION');
  }

  const normalized = normalizeRegexOptions({ ...options, candidate: input });
  const result = runRegexEvaluation(normalized.pattern, normalized.candidate, normalized.flags, normalized);
  return JSON.stringify(result, null, 2);
}

export function initRegexTesterApp(doc = document, host = window) {
  const root = doc.querySelector('[data-tool="regex-tester"]');
  if (!root || root.dataset[INIT_FLAG] === 'true') {
    return;
  }

  root.dataset[INIT_FLAG] = 'true';

  const patternInput = root.querySelector('[data-regex-pattern]');
  const flagsInput = root.querySelector('[data-regex-flags]');
  const candidateInput = root.querySelector('[data-regex-input]');
  const output = root.querySelector('[data-regex-output]');
  const status = root.querySelector('[data-regex-status]');
  const runButton = root.querySelector('[data-regex-run]');

  if (!patternInput || !candidateInput || !output) {
    return;
  }

  let rafId = 0;

  const renderResult = () => {
    const config = {
      pattern: patternInput.value,
      candidate: candidateInput.value,
      flags: flagsInput?.value ?? ''
    };

    try {
      const result = runRegexEvaluation(config.pattern, config.candidate, config.flags);
      output.value = JSON.stringify(result, null, 2);
      if (status) {
        status.textContent = result.isMatch
          ? `Matched ${result.matchCount} occurrence${result.matchCount === 1 ? '' : 's'}.`
          : 'No matches found.';
      }
    } catch (error) {
      output.value = '';
      if (status) {
        status.textContent = error instanceof RegexToolError
          ? error.message
          : 'Unable to evaluate expression.';
      }
    }
  };

  const scheduleRender = () => {
    if (rafId) {
      host.cancelAnimationFrame(rafId);
    }

    rafId = host.requestAnimationFrame(() => {
      rafId = 0;
      renderResult();
    });
  };

  root.addEventListener('input', (event) => {
    if (event.target === patternInput || event.target === flagsInput || event.target === candidateInput) {
      scheduleRender();
    }
  });

  runButton?.addEventListener('click', () => renderResult());

  renderResult();
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules[MODULE_KEY] = { runTool, initRegexTesterApp };
