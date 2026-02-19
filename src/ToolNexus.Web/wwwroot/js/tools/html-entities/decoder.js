import { NAMED_ENTITY_TO_CHAR, fromCodePoint } from './utils.js';

const ENTITY_CAPTURE = /&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z][\w]+);/g;

export function decodeHtmlEntities(input) {
  const source = input ?? '';
  if (!source) return '';

  return source.replace(ENTITY_CAPTURE, (entity, token) => {
    if (token.startsWith('#x') || token.startsWith('#X')) {
      const parsed = Number.parseInt(token.slice(2), 16);
      return isValidCodePoint(parsed) ? fromCodePoint(parsed) : entity;
    }

    if (token.startsWith('#')) {
      const parsed = Number.parseInt(token.slice(1), 10);
      return isValidCodePoint(parsed) ? fromCodePoint(parsed) : entity;
    }

    return NAMED_ENTITY_TO_CHAR.get(token) ?? entity;
  });
}

function isValidCodePoint(codePoint) {
  return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10FFFF;
}
