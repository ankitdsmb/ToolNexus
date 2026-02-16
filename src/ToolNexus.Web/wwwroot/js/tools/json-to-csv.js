export async function runTool(action, input) {
  // TODO: Implement richer client-side behavior for json-to-csv.
  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['json-to-csv'] = { runTool };
