import { normalizeInput } from './utils.js';
import { toFormatterError } from './errors.js';

export function parseNormalizedJson(rawInput) {
  const normalized = normalizeInput(rawInput);

  if (!normalized) {
    return {
      ok: false,
      normalized,
      error: {
        title: 'No input provided',
        message: 'Paste JSON into the input panel to format or validate.',
        details: '',
        location: null
      }
    };
  }

  try {
    return { ok: true, normalized, parsed: JSON.parse(normalized) };
  } catch (error) {
    return { ok: false, normalized, error: toFormatterError(normalized, error) };
  }
}
