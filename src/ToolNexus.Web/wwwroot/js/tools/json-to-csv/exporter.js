export function copyToClipboard(value) {
  return navigator.clipboard.writeText(value);
}

export function downloadCsv(content, filename = 'toolnexus-export.csv') {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
