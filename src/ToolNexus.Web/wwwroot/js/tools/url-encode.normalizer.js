function normalizeLineEnding(value) {
  return value.replace(/\r\n?/g, '\n');
}

function trimOuterWhitespace(value) {
  return value.trim();
}

export function normalizeInput(value) {
  const source = typeof value === 'string' ? value : String(value ?? '');
  return normalizeLineEnding(trimOuterWhitespace(source));
}

export function splitLines(value) {
  return normalizeInput(value).split('\n');
}
