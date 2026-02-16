export async function runTool(action, input) {
  // TODO: Implement richer client-side behavior for html-formatter.
  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['html-formatter'] = { runTool };
