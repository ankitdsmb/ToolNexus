const textEncoder = new TextEncoder();

export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

export function getCharacterCount(value) {
  return String(value ?? '').length;
}

export function getByteCount(value) {
  return textEncoder.encode(String(value ?? '')).length;
}

export async function writeClipboard(value) {
  await navigator.clipboard.writeText(value);
}
