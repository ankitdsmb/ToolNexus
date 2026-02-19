export function normalizeInput(raw) {
  return String(raw ?? '').replace(/\r\n?/g, '\n').trim();
}

export function computeCounts(value) {
  const text = String(value ?? '');
  if (!text) {
    return { chars: 0, lines: 0 };
  }

  return {
    chars: text.length,
    lines: text.split('\n').length
  };
}

export function formatCountSummary(value) {
  const { chars, lines } = computeCounts(value);
  return `${chars} chars / ${lines} lines`;
}

export function isContainer(value) {
  return Array.isArray(value) || (value !== null && typeof value === 'object');
}

export function getContainerSizeLabel(value) {
  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }

  if (value !== null && typeof value === 'object') {
    return `Object(${Object.keys(value).length})`;
  }

  return typeof value;
}
