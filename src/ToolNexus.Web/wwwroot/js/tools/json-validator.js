export async function runTool(action, input) {
  // TODO: Implement richer client-side behavior for json-validator.
  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['json-validator'] = { runTool };
