import { TOKEN_TYPE } from './constants.js';
import { SqlFormatterError } from './errors.js';
import { getLineAndColumn } from './utils.js';

function isWordStart(char) {
  return /[A-Za-z_]/.test(char);
}

function isWordChar(char) {
  return /[A-Za-z0-9_$]/.test(char);
}

export function tokenizeSql(sql) {
  const tokens = [];
  let index = 0;

  while (index < sql.length) {
    const char = sql[index];
    const next = sql[index + 1] ?? '';

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (char === '-' && next === '-') {
      const start = index;
      index += 2;
      while (index < sql.length && sql[index] !== '\n') index += 1;
      tokens.push({ type: TOKEN_TYPE.COMMENT, value: sql.slice(start, index), index: start });
      continue;
    }

    if (char === '/' && next === '*') {
      const start = index;
      index += 2;
      while (index < sql.length && !(sql[index] === '*' && sql[index + 1] === '/')) index += 1;
      if (index >= sql.length) {
        throw new SqlFormatterError('Unclosed block comment', 'A block comment is missing a closing */ token.', getLineAndColumn(sql, start));
      }
      index += 2;
      tokens.push({ type: TOKEN_TYPE.COMMENT, value: sql.slice(start, index), index: start });
      continue;
    }

    if (char === '\'' || char === '"' || (char === 'E' && next === '\'')) {
      const start = index;
      const quote = char === 'E' ? '\'' : char;
      index += char === 'E' ? 2 : 1;
      let closed = false;
      while (index < sql.length) {
        if (sql[index] === quote) {
          if (sql[index + 1] === quote) {
            index += 2;
            continue;
          }
          index += 1;
          closed = true;
          break;
        }
        if (sql[index] === '\\') {
          index += 2;
          continue;
        }
        index += 1;
      }

      if (!closed) {
        throw new SqlFormatterError('Unclosed string literal', 'A string literal was not terminated.', getLineAndColumn(sql, start));
      }

      tokens.push({ type: char === '"' ? TOKEN_TYPE.IDENTIFIER : TOKEN_TYPE.STRING, value: sql.slice(start, index), index: start });
      continue;
    }

    if (char === '`') {
      const start = index;
      index += 1;
      while (index < sql.length && sql[index] !== '`') index += 1;
      if (index >= sql.length) throw new SqlFormatterError('Unclosed identifier', 'Backtick-quoted identifier was not closed.', getLineAndColumn(sql, start));
      index += 1;
      tokens.push({ type: TOKEN_TYPE.IDENTIFIER, value: sql.slice(start, index), index: start });
      continue;
    }

    if (char === '[') {
      const start = index;
      index += 1;
      while (index < sql.length && sql[index] !== ']') index += 1;
      if (index >= sql.length) throw new SqlFormatterError('Unclosed identifier', 'Bracket-quoted identifier was not closed.', getLineAndColumn(sql, start));
      index += 1;
      tokens.push({ type: TOKEN_TYPE.IDENTIFIER, value: sql.slice(start, index), index: start });
      continue;
    }

    if (isWordStart(char)) {
      const start = index;
      index += 1;
      while (index < sql.length && isWordChar(sql[index])) index += 1;
      tokens.push({ type: TOKEN_TYPE.WORD, value: sql.slice(start, index), index: start });
      continue;
    }

    if (/[0-9]/.test(char)) {
      const start = index;
      index += 1;
      while (index < sql.length && /[0-9._]/.test(sql[index])) index += 1;
      tokens.push({ type: TOKEN_TYPE.NUMBER, value: sql.slice(start, index), index: start });
      continue;
    }

    if (char === '(') tokens.push({ type: TOKEN_TYPE.PAREN_OPEN, value: char, index });
    else if (char === ')') tokens.push({ type: TOKEN_TYPE.PAREN_CLOSE, value: char, index });
    else if (char === ',') tokens.push({ type: TOKEN_TYPE.COMMA, value: char, index });
    else if (char === ';') tokens.push({ type: TOKEN_TYPE.SEMICOLON, value: char, index });
    else if (char === '.') tokens.push({ type: TOKEN_TYPE.DOT, value: char, index });
    else if (/[=<>!+\-*/%]/.test(char)) tokens.push({ type: TOKEN_TYPE.OPERATOR, value: char, index });
    else tokens.push({ type: TOKEN_TYPE.SYMBOL, value: char, index });

    index += 1;
  }

  return tokens;
}
