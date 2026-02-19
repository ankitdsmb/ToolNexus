import { JsonYamlToolError } from './errors.js';
import { getLineColumn } from './utils.js';

function extractPosition(message) {
  const match = message.match(/position\s+(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

export function parseJsonInput(rawInput) {
  const input = rawInput?.trim() ?? '';
  if (!input) {
    throw new JsonYamlToolError('EMPTY_INPUT', 'Input required', 'Paste JSON before converting.');
  }

  try {
    return JSON.parse(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON';
    const position = extractPosition(message);

    if (position === null) {
      throw new JsonYamlToolError('INVALID_JSON', 'Invalid JSON', 'Unable to parse input. Verify JSON syntax and try again.');
    }

    const location = getLineColumn(input, position);
    throw new JsonYamlToolError(
      'INVALID_JSON',
      'Invalid JSON',
      `Invalid JSON near line ${location.line}, column ${location.column}: ${message}.`,
      location
    );
  }
}
