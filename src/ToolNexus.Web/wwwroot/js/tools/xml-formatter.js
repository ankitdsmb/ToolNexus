export async function runTool(action, input) {
  // TODO: Implement richer client-side behavior for xml-formatter.
  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['xml-formatter'] = { runTool };
