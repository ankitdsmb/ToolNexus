export async function runTool(action, input) {
  // TODO: Implement richer client-side behavior for regex-tester.
  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['regex-tester'] = { runTool };
