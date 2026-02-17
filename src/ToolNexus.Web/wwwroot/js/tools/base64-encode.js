function sanitizeTextInput(input) {
  if (typeof input !== 'string') {
    return '';
  }

  return input.replace(/\u0000/g, '');
}

function toUtf8Base64(value) {
  const utf8 = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of utf8) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

export async function runTool(action, input) {
  if (action !== 'encode') {
    throw new Error(`Action '${action}' is not supported for client-side execution.`);
  }

  return toUtf8Base64(sanitizeTextInput(input));
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['base64-encode'] = { runTool };
