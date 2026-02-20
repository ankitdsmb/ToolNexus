import { createJsonToYamlApp } from './json-to-yaml.app.js';
import { runJsonToYaml } from './json-to-yaml.api.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'json-to-yaml';

function resolveRoot() {
  return document.querySelector('.tool-page[data-slug="json-to-yaml"]') ?? document.querySelector('[data-tool="json-to-yaml"]');
}

export function create(root = resolveRoot()) {
  if (!root) return null;

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => createJsonToYamlApp(root),
    destroy: (app) => app?.destroy?.()
  });
}

export function init(root = resolveRoot()) {
  const handle = create(root);
  if (!handle) return null;
  handle.init();
  return handle;
}

export function destroy(root = resolveRoot()) {
  if (!root) return;
  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}

export async function runTool(action, input, options = {}) {
  try {
    const { output } = await runJsonToYaml(action, input, options);
    return output;
  } catch (error) {
    throw new Error(error?.message ?? 'JSON to YAML conversion failed');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules[TOOL_ID] = { runTool, create, init, destroy };
