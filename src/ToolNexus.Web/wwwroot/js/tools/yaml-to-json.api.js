import { formatJson } from './yaml-to-json/formatter.js';
import { normalizeYamlInput } from './yaml-to-json/normalizer.js';
import { parseYaml } from './yaml-to-json/parser.js';
import { convertYamlToJsonValue } from './yaml-to-json/engine.js';

const DEFAULT_OPTIONS = Object.freeze({
  pretty: true,
  indent: 2,
  sortKeys: false,
  autoTypes: true,
  strictStrings: false,
  parseDates: true
});

export function getDefaultYamlToJsonOptions() {
  return { ...DEFAULT_OPTIONS };
}

export async function runYamlToJson(action, input, options = {}) {
  const normalizedAction = String(action ?? 'convert').trim().toLowerCase();
  if (normalizedAction !== 'convert') {
    throw new Error('Unsupported action for yaml-to-json.');
  }

  const normalizedInput = normalizeYamlInput(input);
  if (!normalizedInput) {
    throw new Error('Input is empty');
  }

  const resolved = { ...DEFAULT_OPTIONS, ...options };
  if (resolved.strictStrings) {
    resolved.autoTypes = false;
  }

  const parsed = parseYaml(normalizedInput, resolved);
  const value = convertYamlToJsonValue(parsed, resolved);
  return formatJson(value, resolved);
}
