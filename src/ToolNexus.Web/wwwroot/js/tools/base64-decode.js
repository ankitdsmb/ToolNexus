const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

function sanitizeBase64Input(input) {
  if (typeof input !== 'string') {
    return '';
  }

  return input.replace(/\s+/g, '');
}

function fromUtf8Base64(value) {
  if (value.length % 4 !== 0 || !BASE64_PATTERN.test(value)) {
    throw new Error('Invalid Base64 input.');
  }

  const binary = atob(value);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function runTool(action, input) {
  if (action !== 'decode') {
    throw new Error(`Action '${action}' is not supported for client-side execution.`);
  }

  return fromUtf8Base64(sanitizeBase64Input(input));
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['base64-decode'] = { runTool };
