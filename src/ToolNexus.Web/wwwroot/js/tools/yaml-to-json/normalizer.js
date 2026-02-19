export function normalizeYamlInput(rawValue) {
  return (rawValue ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\t/g, '  ')
    .trim();
}
