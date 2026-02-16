export async function runTool(action, input) {
  // TODO: Implement richer client-side behavior for case-converter.
  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['case-converter'] = { runTool };
