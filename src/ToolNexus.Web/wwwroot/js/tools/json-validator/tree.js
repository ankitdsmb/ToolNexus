import { escapeHtml } from './utils.js';

export function buildTreeView(value) {
  const lines = [];
  walk(value, '$', 0, lines);
  return escapeHtml(lines.join('\n'));
}

function walk(value, label, level, lines) {
  const indent = '  '.repeat(level);

  if (value === null || typeof value !== 'object') {
    lines.push(`${indent}${label}: ${JSON.stringify(value)}`);
    return;
  }

  if (Array.isArray(value)) {
    lines.push(`${indent}${label}: [${value.length}]`);
    value.forEach((entry, index) => walk(entry, `[${index}]`, level + 1, lines));
    return;
  }

  const keys = Object.keys(value);
  lines.push(`${indent}${label}: {${keys.length}}`);
  keys.forEach((key) => walk(value[key], key, level + 1, lines));
}
