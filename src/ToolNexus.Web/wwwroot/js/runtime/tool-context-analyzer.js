const DEFAULT_DEBOUNCE_MS = 120;
const MAX_ANALYZE_LENGTH = 12000;

const TOOL_SUGGESTION_MAP = Object.freeze({
  json: {
    toolId: 'json-formatter',
    reason: 'Input appears to be JSON payload.',
    confidence: 0.95
  },
  base64: {
    toolId: 'base64-decode',
    reason: 'Input looks like Base64 text that can be decoded.',
    confidence: 0.84
  },
  markdown: {
    toolId: 'markdown-to-html',
    reason: 'Input contains Markdown syntax.',
    confidence: 0.87
  },
  url: {
    toolId: 'url-decode',
    reason: 'Input appears to contain URL text.',
    confidence: 0.82
  }
});

function normalizeInput(input) {
  return String(input ?? '').trim();
}

function limitInput(value) {
  if (value.length <= MAX_ANALYZE_LENGTH) {
    return value;
  }

  return value.slice(0, MAX_ANALYZE_LENGTH);
}

function detectJson(value) {
  const text = value.trim();
  if (text.length < 2) {
    return false;
  }

  const likelyJsonBoundaries = (text.startsWith('{') && text.endsWith('}'))
    || (text.startsWith('[') && text.endsWith(']'));
  if (!likelyJsonBoundaries) {
    return false;
  }

  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function detectBase64(value) {
  const text = value.replace(/\s+/g, '');
  if (text.length < 12 || text.length % 4 !== 0) {
    return false;
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(text)) {
    return false;
  }

  return true;
}

function detectMarkdown(value) {
  const text = value;
  if (text.length < 4) {
    return false;
  }

  const markdownSignals = [
    /^#{1,6}\s+.+/m,
    /\[[^\]]+\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/m,
    /(^|\n)(-|\*|\+)\s+.+/m,
    /(^|\n)\d+\.\s+.+/m,
    /\*\*[^*]+\*\*/,
    /```[\s\S]*?```/
  ];

  return markdownSignals.some((signal) => signal.test(text));
}

function detectUrl(value) {
  const text = value.trim();
  if (text.length < 8) {
    return false;
  }

  return /^(https?:\/\/|www\.)[^\s]+$/i.test(text)
    || /https?:\/\/[^\s]+/i.test(text);
}

function buildSuggestion(contextType) {
  const mapped = TOOL_SUGGESTION_MAP[contextType];
  if (!mapped) {
    return null;
  }

  return {
    toolId: mapped.toolId,
    confidence: mapped.confidence,
    reason: mapped.reason,
    contextType
  };
}

export function analyzeToolContext(input) {
  const normalized = limitInput(normalizeInput(input));
  if (!normalized) {
    return [];
  }

  const suggestions = [];
  if (detectJson(normalized)) {
    suggestions.push(buildSuggestion('json'));
  }
  if (detectBase64(normalized)) {
    suggestions.push(buildSuggestion('base64'));
  }
  if (detectMarkdown(normalized)) {
    suggestions.push(buildSuggestion('markdown'));
  }
  if (detectUrl(normalized)) {
    suggestions.push(buildSuggestion('url'));
  }

  return suggestions.filter(Boolean).sort((a, b) => b.confidence - a.confidence);
}

export function createToolContextAnalyzer({ debounceMs = DEFAULT_DEBOUNCE_MS, analyze = analyzeToolContext } = {}) {
  let debounceTimer = null;
  let token = 0;

  async function run(input, onSuggestions) {
    token += 1;
    const requestToken = token;

    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    return new Promise((resolve) => {
      debounceTimer = setTimeout(async () => {
        debounceTimer = null;
        const suggestions = await Promise.resolve().then(() => analyze(input));

        if (requestToken !== token) {
          resolve([]);
          return;
        }

        onSuggestions?.(suggestions);
        resolve(suggestions);
      }, debounceMs);
    });
  }

  function dispose() {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  return { run, dispose };
}
