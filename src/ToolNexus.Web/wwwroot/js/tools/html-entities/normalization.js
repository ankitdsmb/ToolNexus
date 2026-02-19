export function normalizeInput(rawInput, { trimOuterWhitespace = false, preserveFormatting = true } = {}) {
  let normalized = (rawInput ?? '').toString().replace(/\r\n?/g, '\n').replace(/\u0000/g, '');

  if (trimOuterWhitespace) {
    normalized = normalized.trim();
  }

  if (!preserveFormatting) {
    normalized = normalized.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
  }

  return normalized;
}
