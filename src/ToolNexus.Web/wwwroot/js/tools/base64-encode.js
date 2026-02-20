import { createBase64EncodeApp, runClientBase64Encode } from './base64-encode.app.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'base64-encode';

function resolveRoot() {
  return document.querySelector('.base64-tool');
}

export function create(root = resolveRoot()) {
  if (!root) {
    return null;
  }

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => createBase64EncodeApp(root),
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
  const normalizedAction = String(action ?? '').trim().toLowerCase();
  if (normalizedAction !== 'encode') {
    throw new Error(`Unsupported action "${action}" for base64-encode.`);
  }

  return runClientBase64Encode(input, options);
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['base64-encode'] = { runTool, create, init, destroy };
