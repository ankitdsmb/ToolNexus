export function getLineAndColumn(source, index) {
  const safeIndex = Math.max(0, Math.min(source.length, index));
  const slice = source.slice(0, safeIndex);
  const lines = slice.split('\n');
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

export function countSummary(value) {
  const text = value ?? '';
  return `${text.length} chars / ${text.length === 0 ? 0 : text.split(/\r?\n/).length} lines`;
}

export function createIndent(level, size, useTabs) {
  if (level <= 0) return '';
  if (useTabs) return '\t'.repeat(level);
  return ' '.repeat(level * size);
}

export function collapseBlankLines(value) {
  return value.replace(/\n{3,}/g, '\n\n');
}
