const BASE_KEYWORDS = [
  'select', 'from', 'where', 'group', 'by', 'having', 'order', 'limit', 'offset', 'join', 'left', 'right', 'full', 'outer',
  'inner', 'cross', 'on', 'as', 'and', 'or', 'not', 'in', 'is', 'null', 'like', 'between', 'exists', 'with', 'recursive',
  'case', 'when', 'then', 'else', 'end', 'distinct', 'union', 'all', 'intersect', 'except', 'over', 'partition', 'rows',
  'range', 'preceding', 'following', 'current', 'row', 'insert', 'into', 'values', 'update', 'set', 'delete', 'create',
  'alter', 'drop', 'table', 'view', 'database', 'top', 'fetch', 'next', 'only', 'returning'
];

const DIALECTS = {
  ansi: { name: 'ANSI SQL', identifierQuote: '"', keywords: BASE_KEYWORDS },
  mysql: { name: 'MySQL', identifierQuote: '`', keywords: [...BASE_KEYWORDS, 'straight_join', 'replace'] },
  postgresql: { name: 'PostgreSQL', identifierQuote: '"', keywords: [...BASE_KEYWORDS, 'ilike', 'returning'] },
  sqlserver: { name: 'SQL Server', identifierQuote: '[]', keywords: [...BASE_KEYWORDS, 'go', 'nvarchar', 'merge'] },
  sqlite: { name: 'SQLite', identifierQuote: '"', keywords: [...BASE_KEYWORDS, 'pragma', 'replace'] }
};

export function getDialectConfig(dialect) {
  return DIALECTS[dialect] ?? DIALECTS.ansi;
}
