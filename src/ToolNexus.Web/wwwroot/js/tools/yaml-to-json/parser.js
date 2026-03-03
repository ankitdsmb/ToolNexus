import { YamlParseError } from './errors.js';

let yamlModulePromise = null;

function loadYaml() {
  if (!yamlModulePromise) {
    yamlModulePromise = import('../../vendor/js-yaml.mjs');
  }

  return yamlModulePromise;
}

function convertDateStrings(value) {
  if (Array.isArray(value)) {
    return value.map(convertDateStrings);
  }

  if (value && typeof value === 'object') {
    const output = {};
    for (const [key, child] of Object.entries(value)) {
      output[key] = convertDateStrings(child);
    }

    return output;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const utcDatePattern = /^\d{4}-\d{2}-\d{2}(?:[tT ]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:[zZ]|[+-]\d{2}:\d{2})?)?$/;
  if (!utcDatePattern.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

export async function parseYaml(source, options) {
  const yaml = await loadYaml();
  const schema = options.strictStrings
    ? yaml.FAILSAFE_SCHEMA
    : options.autoTypes
      ? yaml.CORE_SCHEMA
      : yaml.JSON_SCHEMA;

  try {
    const parsed = yaml.load(source, {
      schema,
      json: true,
      filename: 'input.yaml',
      onWarning: () => {}
    });

    if (options.parseDates) {
      return convertDateStrings(parsed);
    }

    return parsed;
  } catch (error) {
    const line = error?.mark?.line >= 0 ? error.mark.line + 1 : null;
    const column = error?.mark?.column >= 0 ? error.mark.column + 1 : null;
    const message = error?.reason || error?.message || 'Invalid YAML syntax';
    throw new YamlParseError(message, line, column);
  }
}
