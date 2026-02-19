export function normalizeInput(rawValue) {
  if (typeof rawValue !== 'string') {
    return '';
  }

  return rawValue.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
