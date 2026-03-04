import {
  createWorkerErrorResponse,
  createWorkerSuccessResponse
} from './worker-message-protocol.js';

function jsonFormat(payload = {}) {
  const source = typeof payload === 'string' ? payload : payload.value;
  const indent = Number.isInteger(payload.indent) ? payload.indent : 2;
  return JSON.stringify(JSON.parse(String(source ?? '{}')), null, indent);
}

function cssAnalyze(payload = {}) {
  const css = String(payload.value ?? '');
  const rules = (css.match(/\{/g) || []).length;
  const declarations = (css.match(/:[^;{}]+;/g) || []).length;
  const selectors = css
    .split('{')
    .slice(0, -1)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((selectorSet) => selectorSet.split(','))
    .map((selector) => selector.trim())
    .filter(Boolean);

  return {
    selectorCount: selectors.length,
    uniqueSelectorCount: new Set(selectors).size,
    ruleCount: rules,
    declarationCount: declarations
  };
}

function splitWords(value) {
  return String(value ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function textTransform(payload = {}) {
  const value = String(payload.value ?? '');
  const mode = String(payload.mode || 'none');

  if (mode === 'upper') return value.toUpperCase();
  if (mode === 'lower') return value.toLowerCase();
  if (mode === 'trim') return value.trim();

  const words = splitWords(value);

  if (mode === 'camel') {
    return words
      .map((word, index) => index === 0
        ? word.toLowerCase()
        : `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
      .join('');
  }

  if (mode === 'snake') {
    return words.map((word) => word.toLowerCase()).join('_');
  }

  if (mode === 'kebab') {
    return words.map((word) => word.toLowerCase()).join('-');
  }

  return value;
}

function createLineTokens(lines, tokenType) {
  return lines.map((line, index) => ({ type: tokenType, lineNumber: index + 1, value: line }));
}

function textDiff(payload = {}) {
  const before = String(payload.before ?? '').split(/\r?\n/);
  const after = String(payload.after ?? '').split(/\r?\n/);

  const removed = before.filter((line) => !after.includes(line));
  const added = after.filter((line) => !before.includes(line));

  return {
    summary: {
      added: added.length,
      removed: removed.length,
      changed: Math.max(added.length, removed.length)
    },
    tokens: [
      ...createLineTokens(removed, 'removed'),
      ...createLineTokens(added, 'added')
    ]
  };
}

const HANDLERS = Object.freeze({
  jsonFormat,
  cssAnalyze,
  textTransform,
  textDiff
});

self.addEventListener('message', (event) => {
  const request = event.data;
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

  try {
    const handler = HANDLERS[request?.operation];
    if (typeof handler !== 'function') {
      throw new Error(`Unsupported worker operation \"${request?.operation}\".`);
    }

    const result = handler(request.payload);
    self.postMessage(createWorkerSuccessResponse(request, result, startedAt));
  } catch (error) {
    self.postMessage(createWorkerErrorResponse(request, error, startedAt));
  }
});
