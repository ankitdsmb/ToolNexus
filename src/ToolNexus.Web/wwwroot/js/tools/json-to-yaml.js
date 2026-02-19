import './json-to-yaml/index.js';

export async function runTool(action, input) {
  return input;
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['json-to-yaml'] = { runTool };
