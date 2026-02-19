import { ToolError } from './errors.js';

function indexToLinePosition(input, index) {
  const safeIndex = Math.max(0, Math.min(index, input.length));
  const lines = input.slice(0, safeIndex).split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}

export function parseJsonInput(rawInput) {
  const input = (rawInput ?? '').trim();

  if (!input) {
    throw new ToolError(
      'EMPTY_INPUT',
      'Input is empty',
      'Paste a JSON object or an array of objects to convert.',
      'Add JSON in the input panel and click Convert.'
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch (error) {
    const positionMatch = /position\s(\d+)/i.exec(error.message);
    const position = positionMatch ? Number.parseInt(positionMatch[1], 10) : 0;
    const { line, column } = indexToLinePosition(input, position);

    throw new ToolError(
      'INVALID_JSON',
      'Invalid JSON syntax',
      `Invalid JSON near line ${line}, column ${column}.`,
      'Check commas, quotes, and braces around the highlighted location.',
      { parseMessage: error.message, line, column }
    );
  }

  if (Array.isArray(parsed)) {
    const invalidIndex = parsed.findIndex(item => typeof item !== 'object' || item === null || Array.isArray(item));
    if (invalidIndex >= 0) {
      throw new ToolError(
        'INVALID_ARRAY_ITEM',
        'Array contains unsupported rows',
        `Row ${invalidIndex + 1} is not an object.`,
        'Use an array of JSON objects, for example: [{"name":"Ada"}].'
      );
    }

    return parsed;
  }

  if (typeof parsed === 'object' && parsed !== null) {
    return [parsed];
  }

  throw new ToolError(
    'UNSUPPORTED_ROOT',
    'Unsupported JSON root type',
    'Root JSON value must be an object or an array of objects.',
    'Wrap your data in an object or array before converting.'
  );
}
