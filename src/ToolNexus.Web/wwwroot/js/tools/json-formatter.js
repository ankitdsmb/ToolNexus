function sanitizeJsonInput(input) {
  if (typeof input !== 'string') {
    return '';
  }

  return input.trim();
}

export async function runTool(action, input) {
  const sanitized = sanitizeJsonInput(input);
  const payload = JSON.parse(sanitized);

  if (action === 'validate') {
    return 'Valid JSON';
  }

  if (action === 'minify') {
    return JSON.stringify(payload);
  }

  if (action === 'format') {
    return JSON.stringify(payload, null, 2);
  }

  throw new Error(`Action '${action}' is not supported for client-side execution.`);
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['json-formatter'] = { runTool };
