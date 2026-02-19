import { sortObjectKeys, toSafeJsonValue } from './helpers.js';

export function convertYamlToJsonValue(parsedYaml, options) {
  const normalizedRoot = parsedYaml === undefined ? null : toSafeJsonValue(parsedYaml);

  if (options.sortKeys) {
    return sortObjectKeys(normalizedRoot);
  }

  return normalizedRoot;
}
