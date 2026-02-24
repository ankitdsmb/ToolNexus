import { normalizeSqlInput } from './sql-formatter/normalizer.js';
import { tokenizeSql } from './sql-formatter/tokenizer.js';
import { formatSqlTokens } from './sql-formatter/formatter.js';

const DEFAULT_OPTIONS = Object.freeze({
  keywordCase: 'upper',
  indentSize: 4,
  useTabs: false,
  commaStyle: 'trailing',
  pretty: true,
  preserveComments: true,
  preserveBlankLines: true
});

export async function runSqlFormatter(action, input, options = {}) {
  const normalized = normalizeSqlInput(input);
  const normalizedAction = String(action ?? 'format').trim().toLowerCase();
  if (normalizedAction === 'minify') {
    return normalized.replace(/\s+/g, ' ').trim();
  }

  return formatSqlTokens(tokenizeSql(normalized), {
    ...DEFAULT_OPTIONS,
    ...options
  });
}

export function getDefaultSqlFormatterOptions() {
  return { ...DEFAULT_OPTIONS };
}
