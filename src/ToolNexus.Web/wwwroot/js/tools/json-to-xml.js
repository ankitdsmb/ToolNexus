export async function runTool(action, input) {
  // TODO: Implement richer client-side behavior for json-to-xml.
  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['json-to-xml'] = { runTool };
