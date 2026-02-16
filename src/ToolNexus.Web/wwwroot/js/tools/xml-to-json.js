export async function runTool(action, input) {
  // TODO: Implement richer client-side behavior for xml-to-json.
  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['xml-to-json'] = { runTool };
