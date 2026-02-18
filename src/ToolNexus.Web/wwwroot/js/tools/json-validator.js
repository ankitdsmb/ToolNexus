export async function runTool(action, input) {
  const normalizedAction = (action ?? '').trim().toLowerCase();

  if (normalizedAction !== 'validate') {
    throw new Error(`Unsupported action: ${action}`);
  }

  try {
    JSON.parse(input);
    return 'Valid JSON';
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown parsing error.';
    throw new Error(`Invalid JSON: ${details}`);
  }
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['json-validator'] = { runTool };
