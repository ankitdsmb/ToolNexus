import { MinifierError } from './js-minifier-errors.js';

export function normalizeInput(rawInput) {
  const original = typeof rawInput === 'string' ? rawInput : String(rawInput ?? '');
  const normalized = original.replace(/\r\n/g, '\n');

  if (!normalized.trim()) {
    throw new MinifierError('Input Required', 'Paste JavaScript into the input panel before minifying.');
  }

  return {
    original,
    normalized,
    trimmed: normalized.trim()
  };
}
