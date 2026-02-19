import { FORMAT_MODE } from './constants.js';

function sortObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce((accumulator, key) => {
      accumulator[key] = sortObjectKeys(value[key]);
      return accumulator;
    }, {});
}

export function formatJson(parsed, options) {
  const prepared = options.sortKeys ? sortObjectKeys(parsed) : parsed;

  if (options.mode === FORMAT_MODE.MINIFIED) {
    return JSON.stringify(prepared);
  }

  return JSON.stringify(prepared, null, options.indentSize);
}
