import { LARGE_INPUT_THRESHOLD } from './json-to-yaml/constants.js';
import { buildFormattingOptions } from './json-to-yaml/formatter.js';
import { normalizeInput } from './json-to-yaml/normalizer.js';
import { parseJsonInput } from './json-to-yaml/parser.js';
import { convertJsonToYaml } from './json-to-yaml/engine.js';
import { countJsonNodes, delayFrame } from './json-to-yaml/utils.js';

export function getDefaultJsonToYamlOptions() {
  return {
    indentSize: 2,
    compact: false,
    quoteAllStrings: false,
    sortKeys: false,
    useMultilineBlock: false,
    multilineStyle: 'literal',
    pretty: true
  };
}

function mapOptionsToFormatting(options) {
  const controls = {
    indentSelect: { value: String(options.indentSize) },
    compactToggle: { checked: Boolean(options.compact) },
    quoteAllToggle: { checked: Boolean(options.quoteAllStrings) },
    sortKeysToggle: { checked: Boolean(options.sortKeys) },
    multilineToggle: { checked: Boolean(options.useMultilineBlock) },
    multilineStyle: { value: options.multilineStyle || 'literal' }
  };

  return buildFormattingOptions(controls);
}

export async function runJsonToYaml(action, input, options = {}) {
  const normalizedAction = (action ?? 'convert').toLowerCase();
  if (normalizedAction !== 'convert') {
    throw new Error('Unsupported action for json-to-yaml.');
  }

  const raw = input ?? '';
  const parsed = parseJsonInput(raw);

  const byteSize = new TextEncoder().encode(raw).length;
  if (byteSize > LARGE_INPUT_THRESHOLD) {
    await delayFrame();
  }

  const resolved = { ...getDefaultJsonToYamlOptions(), ...options };
  const formatting = mapOptionsToFormatting(resolved);
  formatting.compact = !resolved.pretty || formatting.compact;

  const normalized = normalizeInput(parsed, formatting);
  return {
    output: convertJsonToYaml(normalized, formatting),
    stats: countJsonNodes(normalized)
  };
}
