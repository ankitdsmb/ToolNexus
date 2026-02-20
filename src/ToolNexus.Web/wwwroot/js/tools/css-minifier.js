import { runCssMinifier, toUserErrorMessage } from './css-minifier.api.js';
import { createCssMinifierApp } from './css-minifier.app.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'css-minifier';

function resolveRoot() {
  return document.querySelector('.tool-page[data-slug="css-minifier"]');
}

export function create(root = resolveRoot()) {
  if (!root) return null;

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => createCssMinifierApp(root),
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
    return await runCssMinifier(action, input, options);
  } catch (error) {
    throw new Error(toUserErrorMessage(error));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules[TOOL_ID] = { runTool, create, init, destroy };
