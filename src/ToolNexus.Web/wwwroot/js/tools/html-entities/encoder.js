import { formatEntity, UNSAFE_HTML_CHARS } from './utils.js';

const ENTITY_PATTERN = /&(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z][\w]+);/y;

export function encodeHtmlEntities(input, options) {
  const source = input ?? '';
  if (!source) return '';

  let output = '';

  for (let index = 0; index < source.length;) {
    const current = source[index];

    ENTITY_PATTERN.lastIndex = index;
    const entityMatch = ENTITY_PATTERN.exec(source);
    if (entityMatch?.index === index) {
      output += entityMatch[0];
      index += entityMatch[0].length;
      continue;
    }

    const codePoint = source.codePointAt(index);
    const char = String.fromCodePoint(codePoint);
    const shouldEncode = options.encodeAll || (options.unsafeOnly ? UNSAFE_HTML_CHARS.has(char) : codePoint > 127 || UNSAFE_HTML_CHARS.has(char));

    output += shouldEncode ? formatEntity(char, options) : char;
    index += char.length;
  }

  return output;
}
