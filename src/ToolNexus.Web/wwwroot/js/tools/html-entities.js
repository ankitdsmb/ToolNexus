export async function runTool(action, input) {
  // TODO: Implement richer client-side behavior for html-entities.
  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['html-entities'] = { runTool };
