import { analyzeJsonError } from './diagnostics.js';

export function validateJsonDocument(source, options = {}) {
  const strictMode = options.strictMode ?? true;
  let parsedValue;

  try {
    parsedValue = JSON.parse(source);
  } catch (error) {
    return {
      ok: false,
      diagnostics: analyzeJsonError(source, error)
    };
  }

  if (strictMode && (parsedValue === null || Array.isArray(parsedValue) === false && typeof parsedValue !== 'object')) {
    return {
      ok: false,
      diagnostics: {
        title: 'Invalid top-level type',
        explanation: 'Strict mode requires a top-level object or array.',
        line: 1,
        column: 1,
        position: 0
      }
    };
  }

  return {
    ok: true,
    value: parsedValue
  };
}

export function analyzeStructure(value, rawInput) {
  const topLevelType = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
  const keyCount = topLevelType === 'object' ? Object.keys(value).length : 0;
  const arrayLength = topLevelType === 'array' ? value.length : 0;

  return {
    topLevelType,
    keyCount,
    arrayLength,
    depth: computeDepth(value),
    characterCount: rawInput.length,
    lineCount: rawInput ? rawInput.split('\n').length : 0
  };
}

export function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

function computeDepth(value) {
  if (value === null || typeof value !== 'object') {
    return 0;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 1;
    }

    return 1 + Math.max(...value.map(computeDepth));
  }

  const entries = Object.values(value);
  if (entries.length === 0) {
    return 1;
  }

  return 1 + Math.max(...entries.map(computeDepth));
}
