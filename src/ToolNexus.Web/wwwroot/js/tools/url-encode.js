export async function runTool(action, input) {
  // TODO: Implement richer client-side behavior for url-encode.
  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['url-encode'] = { runTool };
