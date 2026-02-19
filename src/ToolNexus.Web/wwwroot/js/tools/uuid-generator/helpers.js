export const UUID_LIMITS = Object.freeze({
  minQuantity: 1,
  maxQuantity: 1000,
  defaultQuantity: 1,
  maxPreviewRows: 500
});

export function clampQuantity(value) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  if (Number.isNaN(parsed)) return UUID_LIMITS.defaultQuantity;
  return Math.min(UUID_LIMITS.maxQuantity, Math.max(UUID_LIMITS.minQuantity, parsed));
}

export function nowIso() {
  return new Date().toISOString();
}

export function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function supportsCryptoRandom() {
  return Boolean(globalThis.crypto?.getRandomValues);
}
