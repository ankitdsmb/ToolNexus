export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function byteSize(value) {
  return new TextEncoder().encode(String(value ?? '')).length;
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function computeReduction(originalBytes, minifiedBytes) {
  if (originalBytes <= 0) return 0;
  return ((1 - (minifiedBytes / originalBytes)) * 100);
}

export function debounce(callback, waitMs) {
  let timer = null;

  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => callback(...args), waitMs);
  };
}

export function downloadTextFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
