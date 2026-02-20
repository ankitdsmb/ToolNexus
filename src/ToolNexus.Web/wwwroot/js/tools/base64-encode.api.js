const LIMITS = {
  warningBytes: 5 * 1024 * 1024,
  maxBytes: 10 * 1024 * 1024,
  chunkBytes: 0x8000
};

const encoder = new TextEncoder();

export function normalizeTextInput(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function toBase64FromBytes(bytes) {
  const segments = [];
  for (let i = 0; i < bytes.length; i += LIMITS.chunkBytes) {
    const chunk = bytes.subarray(i, i + LIMITS.chunkBytes);
    segments.push(String.fromCharCode(...chunk));
  }

  return btoa(segments.join(''));
}

export function toUrlSafeBase64(base64, removePadding) {
  const replaced = base64.replace(/\+/g, '-').replace(/\//g, '_');
  return removePadding ? replaced.replace(/=+$/, '') : replaced;
}

export function encodeTextToBase64(text) {
  const bytes = encoder.encode(text);
  return {
    bytes,
    base64: toBase64FromBytes(bytes)
  };
}

export function encodeBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  return {
    bytes,
    base64: toBase64FromBytes(bytes)
  };
}

export function applyEncodingOptions(base64, options) {
  if (options.urlSafe) {
    return toUrlSafeBase64(base64, options.removePadding);
  }

  if (options.removePadding) {
    return base64.replace(/=+$/, '');
  }

  return base64;
}

export function createError(title, message, action) {
  return { title, message, action };
}

export function getInputByteLength(value) {
  return encoder.encode(value || '').length;
}

export function getLimits() {
  return LIMITS;
}
