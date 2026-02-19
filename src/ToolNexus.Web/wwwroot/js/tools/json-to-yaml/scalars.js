const YAML_BOOL_LITERALS = new Set(['true', 'false', 'yes', 'no', 'on', 'off', 'null', '~']);
const YAML_NUMERIC_PATTERN = /^[+-]?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

function requiresQuotes(text) {
  if (!text.length) return true;
  if (/^\s|\s$/.test(text)) return true;
  if (/[:#\[\]{}&,>*!|%@`]/.test(text)) return true;
  if (text.includes('\n')) return true;
  if (text === '-' || text === '?' || text === ':') return true;
  if (YAML_BOOL_LITERALS.has(text.toLowerCase())) return true;
  if (YAML_NUMERIC_PATTERN.test(text)) return true;
  if (/^0\d+$/.test(text)) return true;
  return false;
}

function escapeSingleQuoted(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function escapeDoubleQuoted(value) {
  return `"${value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/"/g, '\\"')}"`;
}

function multilineBlock(value, indentUnit, depth, style) {
  const lines = value.replace(/\r\n/g, '\n').split('\n');
  const blockHeader = style === 'folded' ? '>' : '|';
  const lineIndent = indentUnit.repeat(depth + 1);
  const payload = lines.map(line => `${lineIndent}${line}`).join('\n');
  return `${blockHeader}\n${payload}`;
}

export function formatScalar(value, options, depth) {
  if (value === null) return 'null';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';

  const text = String(value);

  if (text.includes('\n') && options.useMultilineBlock) {
    return multilineBlock(text, options.indentUnit, depth, options.multilineStyle);
  }

  if (options.quoteAllStrings) {
    return escapeDoubleQuoted(text);
  }

  if (!requiresQuotes(text)) {
    return text;
  }

  return text.includes('"') ? escapeSingleQuoted(text) : escapeDoubleQuoted(text);
}
