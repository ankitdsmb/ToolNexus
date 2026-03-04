function stringifyOutput(output) {
  if (typeof output === 'string') {
    return output;
  }

  if (output === undefined) {
    return '';
  }

  if (output === null) {
    return 'null';
  }

  if (typeof output === 'object') {
    try {
      return JSON.stringify(output, null, 2);
    } catch {
      return String(output);
    }
  }

  return String(output);
}

export async function copyToClipboard(text) {
  const value = stringifyOutput(text);

  if (!navigator?.clipboard?.writeText) {
    throw new Error('Clipboard API unavailable in this environment.');
  }

  await navigator.clipboard.writeText(value);
  return true;
}

export function downloadFile(content, filename = 'toolnexus-output.txt') {
  const blob = content instanceof Blob ? content : new Blob([stringifyOutput(content)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  requestAnimationFrame(() => URL.revokeObjectURL(url));
}

export function detectContentType(input) {
  const value = typeof input === 'string' ? input.trim() : stringifyOutput(input);

  if (!value) {
    return 'text/plain';
  }

  if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
    return 'application/json';
  }

  if (value.startsWith('<') && value.endsWith('>')) {
    return 'application/xml';
  }

  if (/^---\s*[\r\n]/.test(value) || /^\w+\s*:\s*.+/m.test(value)) {
    return 'application/x-yaml';
  }

  if (value.includes(',') && /\n/.test(value)) {
    return 'text/csv';
  }

  return 'text/plain';
}

export function formatResult(output) {
  return {
    type: detectContentType(output),
    text: stringifyOutput(output),
    raw: output
  };
}
