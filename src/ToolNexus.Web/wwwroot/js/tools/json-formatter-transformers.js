function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function sortJsonRecursively(value) {
  if (Array.isArray(value)) {
    return value.map(sortJsonRecursively);
  }

  if (!isObject(value)) {
    return value;
  }

  return Object.keys(value)
    .sort((a, b) => a.localeCompare(b))
    .reduce((accumulator, key) => {
      accumulator[key] = sortJsonRecursively(value[key]);
      return accumulator;
    }, {});
}

export function applyAutoFix(value) {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/([\{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":')
    .replace(/:\s*'([^']*)'/g, ': "$1"')
    .trim();
}

export function escapeJsonText(value) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

export function unescapeJsonText(value) {
  return value
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
}

export function toOutputByAction(action, parsed) {
  switch (action) {
    case 'minify':
      return JSON.stringify(parsed);
    case 'sort':
      return JSON.stringify(sortJsonRecursively(parsed), null, 2);
    case 'format':
    default:
      return JSON.stringify(parsed, null, 2);
  }
}
