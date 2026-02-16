export async function runTool(action, input) {
  // TODO: Implement richer client-side behavior for sql-formatter.
  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['sql-formatter'] = { runTool };
