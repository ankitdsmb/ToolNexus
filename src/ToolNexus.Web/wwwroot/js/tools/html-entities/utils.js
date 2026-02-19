export const UNSAFE_HTML_CHARS = new Set(['&', '<', '>', '"', "'"]);

export const NAMED_ENTITY_TO_CHAR = new Map([
  ['amp', '&'], ['lt', '<'], ['gt', '>'], ['quot', '"'], ['apos', "'"], ['nbsp', '\u00A0'],
  ['copy', '©'], ['reg', '®'], ['trade', '™'], ['hellip', '…'], ['mdash', '—'], ['ndash', '–']
]);

export const CHAR_TO_NAMED_ENTITY = new Map(Array.from(NAMED_ENTITY_TO_CHAR.entries(), ([entity, char]) => [char, entity]));

export function toCodePoint(char) {
  return char.codePointAt(0) ?? 0;
}

export function fromCodePoint(codePoint) {
  return String.fromCodePoint(codePoint);
}

export function formatEntity(char, options) {
  const codePoint = toCodePoint(char);

  if (!options.numeric && !options.hex && options.preferNamed) {
    const named = CHAR_TO_NAMED_ENTITY.get(char);
    if (named) return `&${named};`;
  }

  if (options.hex) return `&#x${codePoint.toString(16).toUpperCase()};`;
  return `&#${codePoint};`;
}
