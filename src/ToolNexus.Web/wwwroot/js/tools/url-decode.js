import { decodeUrlInput } from './url-decode/decoder.js';
import { mountUrlDecodeTool } from './url-decode/ui.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'url-decode';

function resolveRoot() {
  return document.querySelector('.url-decode-tool');
}

export function create(root = resolveRoot()) {
  if (!root) {
    return null;
  }

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => mountUrlDecodeTool(root),
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

export async function runTool(action, input) {
  const normalizedAction = String(action ?? '').trim().toLowerCase();
  if (normalizedAction !== 'decode') {
    throw new Error(`Unsupported action "${action}" for url-decode.`);
  }

  return decodeUrlInput(input, {
    plusAsSpace: false,
    strictMode: true
  }).output;
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules[TOOL_ID] = { runTool, create, init, destroy };
