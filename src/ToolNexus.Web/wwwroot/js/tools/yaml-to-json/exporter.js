export async function copyText(value) {
  await navigator.clipboard.writeText(value);
}

export function downloadJson(value) {
  const blob = new Blob([value], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'converted.json';
  anchor.click();
  URL.revokeObjectURL(url);
}
