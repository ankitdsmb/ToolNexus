export async function runTool(action, input) {
  // TODO: Implement richer client-side behavior for base64-decode.
  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['base64-decode'] = { runTool };
