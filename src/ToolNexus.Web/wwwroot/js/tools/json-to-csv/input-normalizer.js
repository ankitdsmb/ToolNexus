export function normalizeRawInput(rawInput) {
  return typeof rawInput === 'string' ? rawInput.trim() : '';
}

export function normalizeParserRoot(parsed) {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed && typeof parsed === 'object') {
    return [parsed];
  }

  return parsed;
}
