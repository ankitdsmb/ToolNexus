export async function runTool(action, input) {
  // TODO: Implement richer client-side behavior for css-minifier.
  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['css-minifier'] = { runTool };
