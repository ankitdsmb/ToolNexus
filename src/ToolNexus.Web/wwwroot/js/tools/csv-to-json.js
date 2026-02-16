export async function runTool(action, input) {
  // TODO: Implement richer client-side behavior for csv-to-json.
  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['csv-to-json'] = { runTool };
