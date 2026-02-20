import { FORMAT_MODE } from './json-formatter/constants.js';
import { formatJson } from './json-formatter/formatter.js';
import { parseNormalizedJson } from './json-formatter/parser.js';
import { getContainerSizeLabel } from './json-formatter/utils.js';

export { FORMAT_MODE };

export function runJsonFormatter(action, rawInput, options = {}) {
  const parsedResult = parseNormalizedJson(rawInput);

  if (!parsedResult.ok) {
    return parsedResult;
  }

  if (action === FORMAT_MODE.VALIDATE) {
    return {
      ok: true,
      parsed: parsedResult.parsed,
      output: '',
      status: `Valid JSON (${getContainerSizeLabel(parsedResult.parsed)}).`
    };
  }

  const output = formatJson(parsedResult.parsed, {
    mode: action,
    indentSize: options.indentSize ?? 2,
    sortKeys: Boolean(options.sortKeys)
  });

  return {
    ok: true,
    parsed: parsedResult.parsed,
    output,
    status: action === FORMAT_MODE.MINIFIED ? 'Minified JSON ready.' : 'Formatted JSON ready.'
  };
}
