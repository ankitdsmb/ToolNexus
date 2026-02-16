export async function runTool(action, input) {
  // TODO: Implement richer client-side behavior for js-minifier.
  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['js-minifier'] = { runTool };
