export async function runTool(action, input) {
  const normalizedAction = typeof action === 'string' ? action.trim().toLowerCase() : 'validate';
  const normalizedInput = typeof input === 'string' ? input : '';

  if (normalizedAction !== 'validate') {
    return `Unsupported action: ${String(action)}`;
  }

  try {
    JSON.parse(normalizedInput);
    return 'Valid JSON';
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown parsing error.';
    return `Invalid JSON: ${details}`;
  }
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['json-validator'] = { runTool };
