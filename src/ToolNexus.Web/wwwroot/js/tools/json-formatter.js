import { createJsonFormatterApp } from './json-formatter.app.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'json-formatter';

function resolveRoot() {
  return document.querySelector('[data-tool="json-formatter"]');
}

export function create(root = resolveRoot()) {
  if (!root) {
    return null;
  }

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => {
      const app = createJsonFormatterApp(root);
      app.init();
      return app;
    },
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

document.addEventListener('DOMContentLoaded', () => {
  init();
});

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['json-formatter'] = { create, init, destroy };
