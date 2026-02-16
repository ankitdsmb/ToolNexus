export async function runTool(action, input) {
  // TODO: Implement richer client-side behavior for json-to-yaml.
  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['json-to-yaml'] = { runTool };
