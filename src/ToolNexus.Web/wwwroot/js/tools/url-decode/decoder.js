import { normalizeInput } from './normalization.js';
import { throwDecodeError } from './validation.js';

function preprocessLine(line, plusAsSpace) {
  return plusAsSpace ? line.replace(/\+/g, ' ') : line;
}

function decodeLineStrict(line, options) {
  try {
    return decodeURIComponent(preprocessLine(line, options.plusAsSpace));
  } catch {
    throwDecodeError(line, options);
  }
}

function decodeLineTolerant(line, options) {
  const prepared = preprocessLine(line, options.plusAsSpace);

  try {
    return decodeURIComponent(prepared);
  } catch {
    let output = '';
    for (let index = 0; index < prepared.length; index += 1) {
      const char = prepared[index];
      if (char !== '%') {
        output += char;
        continue;
      }

      const pair = prepared.slice(index + 1, index + 3);
      if (!/^[0-9A-Fa-f]{2}$/.test(pair)) {
        output += '%';
        continue;
      }

      const chunk = `%${pair}`;
      try {
        output += decodeURIComponent(chunk);
      } catch {
        output += chunk;
      }

      index += 2;
    }

    return output;
  }
}

export function decodeUrlInput(input, options = {}) {
  const normalized = normalizeInput(input, { trim: true });
  if (!normalized.normalized.length) {
    return { output: '', warnings: [], normalized };
  }

  const warnings = [];
  const decodeLine = options.strictMode ? decodeLineStrict : decodeLineTolerant;
  const decodedLines = normalized.lines.map((line) => {
    try {
      return decodeLine(line, options);
    } catch (error) {
      if (options.strictMode) {
        throw error;
      }

      warnings.push('Malformed segments were preserved as-is.');
      return decodeLineTolerant(line, options);
    }
  });

  return {
    output: decodedLines.join('\n'),
    warnings,
    normalized
  };
}
