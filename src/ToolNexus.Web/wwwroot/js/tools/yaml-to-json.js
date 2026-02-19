import './yaml-to-json/index.js';

export async function runTool(action, input) {
  return { action, input };
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['yaml-to-json'] = { runTool };
