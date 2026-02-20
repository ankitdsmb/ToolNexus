import { runTool as runUuidGenerator } from './uuid-generator/index.js';
import { initializeUuidGeneratorUi } from './uuid-generator/ui.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'uuid-generator';

function resolveRoot() {
  return document.querySelector('#uuidGeneratorApp');
}

export function create(root = resolveRoot()) {
  if (!root) return null;

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => initializeUuidGeneratorUi(root),
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

export async function runTool(action, input) {
  return runUuidGenerator(action, input);
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules[TOOL_ID] = { runTool, create, init, destroy };
