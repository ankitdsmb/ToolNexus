import { createJsonValidatorApp } from './ui.js';
import { getToolPlatformKernel } from '../tool-platform-kernel.js';

const TOOL_ID = 'json-validator';

function resolveRoot() {
  return document.querySelector('[data-json-validator]');
}

export function create(root = resolveRoot()) {
  if (!root) {
    return null;
  }

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => createJsonValidatorApp(root),
    destroy: (app) => app?.destroy?.()
  });
}

export function init(root = resolveRoot()) {
  const handle = create(root);
  if (!handle) {
    return null;
  }

  handle.create();
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
