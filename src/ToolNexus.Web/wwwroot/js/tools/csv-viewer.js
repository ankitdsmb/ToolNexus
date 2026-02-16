export async function runTool(action, input) {
  // TODO: Implement richer client-side behavior for csv-viewer.
  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['csv-viewer'] = { runTool };
