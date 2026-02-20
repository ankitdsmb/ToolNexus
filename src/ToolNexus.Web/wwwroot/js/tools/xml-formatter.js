import { createXmlFormatterApp } from './xml-formatter.app.js';
import { runXmlFormatter } from './xml-formatter.api.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'xml-formatter';

function resolveRoot() {
  return document.querySelector('.tool-page[data-slug="xml-formatter"]');
}

export function create(root = resolveRoot()) {
  if (!root) {
    return null;
  }

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => createXmlFormatterApp(root),
    destroy: (app) => app?.destroy?.()
  });
}

export function init(root = resolveRoot()) {
  const handle = create(root);
  if (!handle) {
    return null;
  }

  handle.init();
  return handle;
}

export function destroy(root = resolveRoot()) {
  if (!root) {
    return;
  }

  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}

export async function runTool(action, input, options = {}) {
  try {
    return await runXmlFormatter(action, input, options);
  } catch (error) {
    throw new Error(error?.message ?? 'XML formatting failed');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules[TOOL_ID] = { runTool, create, init, destroy };
