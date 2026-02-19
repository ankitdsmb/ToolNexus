import { normalizeSqlInput } from './sql-formatter/normalizer.js';
import { tokenizeSql } from './sql-formatter/tokenizer.js';
import { formatSqlTokens } from './sql-formatter/formatter.js';

export async function runTool(action, input) {
  const normalized = normalizeSqlInput(input);
  if (action === 'minify') {
    return normalized.replace(/\s+/g, ' ').trim();
  }

  return formatSqlTokens(tokenizeSql(normalized), {
    keywordCase: 'upper',
    indentSize: 4,
    useTabs: false,
    commaStyle: 'trailing',
    pretty: true,
    preserveComments: true,
    preserveBlankLines: true
  });
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['sql-formatter'] = { runTool };
