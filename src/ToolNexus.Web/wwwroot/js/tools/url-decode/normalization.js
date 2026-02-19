import { normalizeLineEndings, toStringSafe } from './utils.js';

export function normalizeInput(input, { trim = true } = {}) {
  const source = toStringSafe(input);
  const normalizedLineEndings = normalizeLineEndings(source);
  const normalized = trim ? normalizedLineEndings.trim() : normalizedLineEndings;
  const lines = normalized.split('\n');

  return {
    source,
    normalized,
    lines,
    isMultiline: lines.length > 1
  };
}
