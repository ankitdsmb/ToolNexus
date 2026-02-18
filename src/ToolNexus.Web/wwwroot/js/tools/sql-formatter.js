const KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET',
  'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'ON', 'AS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'DROP TABLE', 'ALTER TABLE',
  'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT', 'DISTINCT', 'IN', 'NOT IN', 'EXISTS', 'LIKE', 'BETWEEN', 'IS NULL', 'IS NOT NULL'
];

const NEWLINE_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET',
  'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN',
  'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'DROP TABLE', 'ALTER TABLE',
  'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT'
];

function formatSql(sql) {
  if (!sql) return '';

  const placeholders = [];
  const placeholderPrefix = '___SQL_FORMATTER_PLACEHOLDER_';

  // Extract strings and comments to protect them
  // Matches: 'string', "string", -- comment, /* comment */
  let protectedSql = sql.replace(/('([^'\\]|\\.)*'|"([^"\\]|\\.)*"|--[^\n]*|\/\*[\s\S]*?\*\/)/g, (match) => {
    const placeholder = `${placeholderPrefix}${placeholders.length}___`;
    placeholders.push(match);
    return placeholder;
  });

  let formatted = protectedSql.replace(/\s+/g, ' ').trim();

  // Sort keywords by length descending
  const sortedKeywords = [...KEYWORDS].sort((a, b) => b.length - a.length);

  sortedKeywords.forEach(kw => {
    const pattern = kw.replace(/\s+/g, '\\s+');
    const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
    formatted = formatted.replace(regex, kw);
  });

  NEWLINE_KEYWORDS.forEach(kw => {
     const regex = new RegExp(`\\b${kw}\\b`, 'g');
     formatted = formatted.replace(regex, `\n${kw}`);
  });

  formatted = formatted.replace(/\b(AND|OR|ON)\b/g, '\n  $1');

  // Restore placeholders
  placeholders.forEach((content, index) => {
    const placeholder = `${placeholderPrefix}${index}___`;
    let replacement = content;
    // Ensure single-line comments terminate with a newline to prevent commenting out following code
    if (replacement.startsWith('--')) {
        replacement += '\n';
    }
    formatted = formatted.replace(placeholder, replacement);
  });

  return formatted.trim();
}

export async function runTool(action, input) {
  return formatSql(input);
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['sql-formatter'] = { runTool };
