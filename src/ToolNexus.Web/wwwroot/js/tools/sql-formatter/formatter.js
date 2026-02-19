import { KEYWORD_CASE, TOKEN_TYPE } from './constants.js';
import { createIndent, collapseBlankLines } from './utils.js';

const CLAUSE_START = new Set(['SELECT', 'FROM', 'WHERE', 'HAVING', 'LIMIT', 'OFFSET', 'VALUES', 'SET', 'WITH']);
const JOIN_WORDS = new Set(['JOIN', 'LEFT', 'RIGHT', 'FULL', 'INNER', 'OUTER', 'CROSS']);
const LOGICAL_WORDS = new Set(['AND', 'OR']);

function normalizeKeyword(value, keywordCase) {
  if (keywordCase === KEYWORD_CASE.PRESERVE) return value;
  if (keywordCase === KEYWORD_CASE.LOWER) return value.toLowerCase();
  return value.toUpperCase();
}

function isWord(token, word) {
  return token?.type === TOKEN_TYPE.WORD && token.value.toUpperCase() === word;
}

export function formatSqlTokens(tokens, options) {
  const chunks = [];
  let indent = 0;
  let lineStart = true;

  const append = (text) => {
    if (!text) return;
    if (lineStart) {
      chunks.push(createIndent(indent, options.indentSize, options.useTabs));
      lineStart = false;
    }
    chunks.push(text);
  };

  const space = () => {
    if (!lineStart && chunks[chunks.length - 1] !== ' ' && chunks[chunks.length - 1] !== '\n') chunks.push(' ');
  };

  const newline = (extra = 0) => {
    chunks.push('\n');
    lineStart = true;
    if (extra !== 0) indent = Math.max(0, indent + extra);
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const upperWord = token.type === TOKEN_TYPE.WORD ? token.value.toUpperCase() : '';
    const next = tokens[i + 1];

    if (token.type === TOKEN_TYPE.COMMENT) {
      if (!options.preserveComments) continue;
      if (!lineStart) newline();
      append(token.value.trim());
      newline();
      continue;
    }

    if (token.type === TOKEN_TYPE.SEMICOLON) {
      append(';');
      newline();
      newline();
      continue;
    }

    if (token.type === TOKEN_TYPE.PAREN_OPEN) {
      append('(');
      const opensQuery = isWord(next, 'SELECT') || isWord(next, 'WITH');
      if (options.pretty && opensQuery) {
        newline(1);
      }
      continue;
    }

    if (token.type === TOKEN_TYPE.PAREN_CLOSE) {
      if (options.pretty) newline(-1);
      append(')');
      continue;
    }

    if (token.type === TOKEN_TYPE.COMMA) {
      if (!options.pretty) {
        append(',');
        space();
        continue;
      }

      if (options.commaStyle === 'leading') {
        newline();
        append(',');
        space();
      } else {
        append(',');
        newline();
      }
      continue;
    }

    if (token.type === TOKEN_TYPE.WORD) {
      const normalized = normalizeKeyword(token.value, options.keywordCase);
      const previous = tokens[i - 1];

      if (upperWord === 'END') indent = Math.max(0, indent - 1);

      const isGroupBy = upperWord === 'GROUP' && isWord(next, 'BY');
      const isOrderBy = upperWord === 'ORDER' && isWord(next, 'BY');
      const isUnionAll = upperWord === 'UNION' && isWord(next, 'ALL');

      const startsClause = CLAUSE_START.has(upperWord) || JOIN_WORDS.has(upperWord) || isGroupBy || isOrderBy || isUnionAll || upperWord === 'UNION';
      const logical = LOGICAL_WORDS.has(upperWord);

      if (options.pretty && (startsClause || logical || upperWord === 'WHEN' || upperWord === 'ELSE')) {
        if (!lineStart) newline();
      } else if (!lineStart && previous?.type !== TOKEN_TYPE.PAREN_OPEN && previous?.type !== TOKEN_TYPE.DOT) {
        space();
      }

      append(normalized);

      if (upperWord === 'CASE') {
        indent += 1;
        newline();
      } else if (upperWord === 'THEN') {
        newline();
      }

      continue;
    }

    if (!lineStart && token.type !== TOKEN_TYPE.DOT && token.type !== TOKEN_TYPE.PAREN_CLOSE && token.type !== TOKEN_TYPE.OPERATOR) {
      space();
    }

    append(token.value);

    if (token.type === TOKEN_TYPE.OPERATOR) space();
    if (token.type === TOKEN_TYPE.PAREN_CLOSE && options.pretty && next?.type === TOKEN_TYPE.WORD && next.value.toUpperCase() === 'ON') {
      newline();
    }

  }

  let result = chunks.join('').replace(/[ \t]+\n/g, '\n').trim();
  if (!options.preserveBlankLines) result = collapseBlankLines(result);
  return result;
}
