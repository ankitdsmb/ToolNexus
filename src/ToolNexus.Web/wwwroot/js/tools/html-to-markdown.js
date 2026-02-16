export async function runTool(action, input) {
  // TODO: Implement richer client-side behavior for html-to-markdown.
  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['html-to-markdown'] = { runTool };
