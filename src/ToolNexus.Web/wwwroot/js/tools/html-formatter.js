import { createHtmlFormatterApp } from './html-formatter.app.js';
import { getDefaultHtmlFormatterOptions, runHtmlFormatter } from './html-formatter.api.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'html-formatter';

function resolveRoot() {
  return document.querySelector('.tool-page[data-slug="html-formatter"]');
}

export function create(root = resolveRoot()) {
  if (!root) return null;

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => createHtmlFormatterApp(root),
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
  const resolvedOptions = { ...getDefaultHtmlFormatterOptions(), ...options };
  const { output } = await runHtmlFormatter(action, input, resolvedOptions);
  return output;
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules[TOOL_ID] = { runTool, create, init, destroy };
