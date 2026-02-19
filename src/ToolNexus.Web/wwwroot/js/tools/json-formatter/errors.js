export function extractLocation(source, errorMessage) {
  const match = String(errorMessage ?? '').match(/position\s(\d+)/i);
  if (!match) {
    return null;
  }

  const offset = Number.parseInt(match[1], 10);
  if (Number.isNaN(offset) || offset < 0) {
    return null;
  }

  let line = 1;
  let column = 1;
  for (let i = 0; i < offset && i < source.length; i += 1) {
    if (source[i] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column };
}

export function toFormatterError(source, error) {
  const location = extractLocation(source, error?.message);
  return {
    title: 'Invalid JSON',
    message: location
      ? `Invalid JSON near line ${location.line}, column ${location.column}.`
      : 'Invalid JSON. Check quotes, commas, and trailing characters.',
    details: 'The input is parsed with strict JSON rules. No automatic fixes were applied.',
    location
  };
}
