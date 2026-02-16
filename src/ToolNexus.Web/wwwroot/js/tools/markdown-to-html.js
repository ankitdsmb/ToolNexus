export async function runTool(action, input) {
  // TODO: Implement richer client-side behavior for markdown-to-html.
  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['markdown-to-html'] = { runTool };
