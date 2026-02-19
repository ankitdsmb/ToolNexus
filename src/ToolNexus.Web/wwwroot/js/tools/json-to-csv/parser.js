import { ToolError } from './errors.js';
import { normalizeRawInput, normalizeParserRoot } from './input-normalizer.js';

function indexToLinePosition(input, index) {
  const safeIndex = Number.isFinite(index)
    ? Math.max(0, Math.min(index, input.length))
    : 0;
  const lines = input.slice(0, safeIndex).split('\n');

  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}

export function parseJsonInput(rawInput) {
  const input = normalizeRawInput(rawInput);

  if (!input) {
    throw new ToolError(
      'EMPTY_INPUT',
      'Input is empty',
      'Paste a JSON object or an array of objects to convert.',
      'Add JSON in the input panel, then run Convert.'
    );
  }

  let parsedValue;
  try {
    parsedValue = JSON.parse(input);
  } catch (error) {
    const positionMatch = /position\s(\d+)/i.exec(error.message);
    const position = positionMatch ? Number.parseInt(positionMatch[1], 10) : 0;
    const { line, column } = indexToLinePosition(input, position);

    throw new ToolError(
      'INVALID_JSON',
      'Invalid JSON',
      `Invalid JSON near line ${line}, column ${column}.`,
      'Check for missing commas, trailing commas, or unmatched braces.',
      { parseMessage: error.message, line, column }
    );
  }

  const normalizedRoot = normalizeParserRoot(parsedValue);

  if (!Array.isArray(normalizedRoot)) {
    throw new ToolError(
      'UNSUPPORTED_ROOT',
      'Unsupported JSON root value',
      'Root JSON value must be an object or an array of objects.',
      'Wrap primitives in an object, or provide an array of objects.'
    );
  }

  const invalidIndex = normalizedRoot.findIndex(item => !item || typeof item !== 'object' || Array.isArray(item));
  if (invalidIndex !== -1) {
    throw new ToolError(
      'INVALID_ARRAY_ITEM',
      'Array contains invalid rows',
      `Row ${invalidIndex + 1} is not a JSON object.`,
      'Ensure each row is an object, for example: [{"name":"Ada"}].'
    );
  }

  return normalizedRoot;
}
