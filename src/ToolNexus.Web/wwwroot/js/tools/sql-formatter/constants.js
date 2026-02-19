export const SQL_FORMATTER_CONFIG = {
  autoFormatDebounceMs: 350,
  largePayloadChars: 40000,
  defaultLineWidth: 120
};

export const TOKEN_TYPE = {
  WORD: 'word',
  NUMBER: 'number',
  STRING: 'string',
  IDENTIFIER: 'identifier',
  COMMENT: 'comment',
  OPERATOR: 'operator',
  PAREN_OPEN: 'paren_open',
  PAREN_CLOSE: 'paren_close',
  COMMA: 'comma',
  SEMICOLON: 'semicolon',
  DOT: 'dot',
  SYMBOL: 'symbol'
};

export const KEYWORD_CASE = {
  UPPER: 'upper',
  LOWER: 'lower',
  PRESERVE: 'preserve'
};
