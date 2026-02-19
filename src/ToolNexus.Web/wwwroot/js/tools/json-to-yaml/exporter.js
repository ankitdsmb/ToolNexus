export async function copyText(value) {
  await navigator.clipboard.writeText(value);
}

export function downloadYaml(value) {
  const blob = new Blob([value], { type: 'application/x-yaml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'converted.yaml';
  link.click();
  URL.revokeObjectURL(url);
}
