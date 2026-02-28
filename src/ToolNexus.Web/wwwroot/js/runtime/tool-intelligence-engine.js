const FORMAT_BADGES = {
  json: 'Detected: JSON',
  xml: 'Detected: XML',
  yaml: 'Detected: YAML',
  encoded: 'Detected: Encoded text',
  structured: 'Detected: Structured text',
  plain: 'Detected: Plain text'
};

function safeParseJson(value = '') {
  try {
    return { parsed: JSON.parse(value), valid: true };
  } catch (error) {
    return { parsed: null, valid: false, error };
  }
}

function detectFormat(value = '') {
  const input = String(value ?? '').trim();
  if (!input) return { type: 'plain', badge: FORMAT_BADGES.plain, isMinifiedJson: false };

  const json = safeParseJson(input);
  if (json.valid) {
    const isMinifiedJson = input.length > 120 && !input.includes('\n') && /[{\[]/.test(input);
    return { type: 'json', badge: FORMAT_BADGES.json, isMinifiedJson };
  }

  if (/^<\?xml|^<[^>]+>/.test(input)) {
    return { type: 'xml', badge: FORMAT_BADGES.xml, isMinifiedJson: false };
  }

  if (/^[\w-]+:\s+/m.test(input) && /\n/.test(input)) {
    return { type: 'yaml', badge: FORMAT_BADGES.yaml, isMinifiedJson: false };
  }

  if (/^[A-Za-z0-9+/=\s]+$/.test(input) && input.length > 24 && input.length % 4 === 0) {
    return { type: 'encoded', badge: FORMAT_BADGES.encoded, isMinifiedJson: false };
  }

  if (/[,;\t]/.test(input) && /\n/.test(input)) {
    return { type: 'structured', badge: FORMAT_BADGES.structured, isMinifiedJson: false };
  }

  return { type: 'plain', badge: FORMAT_BADGES.plain, isMinifiedJson: false };
}

function classifyConfidence({ hasInput, hasError, warningCount, isValidJson }) {
  if (!hasInput) return 'ready';
  if (hasError) return 'error';
  if (warningCount > 0) return 'warning';
  if (isValidJson) return 'valid';
  return 'ready';
}

function buildContextHints({ input = '', selectedAction = 'run', dismissed = [] } = {}) {
  const hints = [];
  const trimmed = input.trim();
  const bytes = new TextEncoder().encode(trimmed).length;
  const detection = detectFormat(trimmed);

  if (bytes > 12000) {
    hints.push({ id: 'large-input', text: 'Large input detected — formatting may take longer.', level: 'warning' });
  }

  if (detection.isMinifiedJson) {
    hints.push({ id: 'minified-json', text: 'Looks like minified JSON — click Format for readability.', level: 'info' });
  }

  if (detection.type === 'structured' && trimmed.includes(';') && !trimmed.includes(',')) {
    hints.push({ id: 'csv-delimiter', text: 'Possible invalid delimiter in CSV — verify delimiter settings.', level: 'warning' });
  }

  if (!trimmed) {
    hints.push({ id: 'empty-flow', text: 'Paste input and run to start execution intelligence.', level: 'info' });
  } else if (selectedAction === 'run') {
    hints.push({ id: 'action-ready', text: 'Execution ready — run the selected action to produce output.', level: 'info' });
  }

  return {
    detection,
    hints: hints.filter((hint) => !dismissed.includes(hint.id))
  };
}

function buildActionSuggestions({ toolSlug = '', input = '', output = '', selectedAction = '' } = {}) {
  const suggestions = [];
  const slug = String(toolSlug || '').toLowerCase();
  const hasOutput = Boolean(output.trim());

  if (slug.includes('json') && input.trim()) {
    const sourceDetection = detectFormat(input);
    if (sourceDetection.isMinifiedJson || selectedAction.toLowerCase().includes('validate')) {
      suggestions.push({ id: 'format-json', label: 'Format JSON', command: 'set-action', value: 'format' });
    }

    if (hasOutput && output.includes('\n')) {
      suggestions.push({ id: 'minify-json', label: 'Minify', command: 'set-action', value: 'minify' });
    }
  }

  const opposite = {
    'json-to-xml': 'xml-to-json',
    'xml-to-json': 'json-to-xml',
    'json-to-yaml': 'yaml-to-json',
    'yaml-to-json': 'json-to-yaml',
    'csv-to-json': 'json-to-csv',
    'json-to-csv': 'csv-to-json',
    'url-encode': 'url-decode',
    'url-decode': 'url-encode',
    'base64-encode': 'base64-decode',
    'base64-decode': 'base64-encode'
  };

  if (hasOutput && opposite[slug]) {
    suggestions.push({ id: 'opposite-conversion', label: `Open ${opposite[slug]}`, command: 'navigate', value: `/tools/${opposite[slug]}` });
  }

  if (hasOutput) {
    suggestions.push({ id: 'copy-result', label: 'Copy result', command: 'copy' });
    suggestions.push({ id: 'download-result', label: 'Download', command: 'download' });
  }

  return suggestions.slice(0, 4);
}

function buildResultIntelligence({ input = '', output = '', durationMs = 0, error = '' } = {}) {
  const inputSize = new TextEncoder().encode(input).length;
  const outputSize = new TextEncoder().encode(output).length;
  const deltaPercent = inputSize > 0 ? Math.round(((outputSize - inputSize) / inputSize) * 100) : 0;
  const reductionText = deltaPercent < 0
    ? `Output reduced by ${Math.abs(deltaPercent)}%`
    : deltaPercent > 0
      ? `Output increased by ${deltaPercent}%`
      : 'Output size unchanged';

  const quality = error
    ? 'Low confidence'
    : output.trim()
      ? 'High confidence'
      : 'Pending confidence';

  return {
    reductionText,
    durationText: durationMs > 0 ? `${durationMs} ms` : '—',
    quality,
    inputSize,
    outputSize
  };
}

function inferErrorIntelligence(message = '') {
  const text = String(message || 'Execution error.').trim();
  const nearLine = text.match(/line\s+(\d+)/i)?.[1] ?? null;

  if (/comma/i.test(text)) {
    return {
      explanation: 'The JSON parser expected a comma between fields.',
      probableCause: nearLine ? `Missing comma near line ${nearLine}.` : 'Missing comma between properties.',
      quickFix: 'Add the missing comma and run Format JSON again.'
    };
  }

  if (/unexpected token|invalid/i.test(text)) {
    return {
      explanation: 'Input syntax does not match the selected operation.',
      probableCause: nearLine ? `Invalid token near line ${nearLine}.` : 'Unexpected syntax in input.',
      quickFix: 'Validate structure first, then retry execution.'
    };
  }

  return {
    explanation: 'Execution could not complete with current input.',
    probableCause: 'Payload format or selected action may be incompatible.',
    quickFix: 'Review the detected format hint and try the recommended action chip.'
  };
}

export function createToolIntelligenceEngine() {
  return {
    detectFormat,
    buildContextHints,
    buildActionSuggestions,
    buildResultIntelligence,
    inferErrorIntelligence,
    classifyConfidence
  };
}
