export async function runTool(action, input) {
  // TODO: Implement richer client-side behavior for text-diff.
  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['text-diff'] = { runTool };
