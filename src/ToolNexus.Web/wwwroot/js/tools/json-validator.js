import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'json-validator';

function resolveRoot() {
  return document.querySelector(`.tool-page[data-slug="${TOOL_ID}"]`) ?? document.querySelector(`[data-tool="${TOOL_ID}"]`);
}

export function create(root = resolveRoot()) {
  if (!root) {
    return null;
  }

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => null,
    destroy: () => undefined
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
  const normalizedAction = typeof action === 'string' ? action.trim().toLowerCase() : 'validate';
  const normalizedInput = typeof input === 'string' ? input : '';

  if (normalizedAction !== 'validate') {
    return `Unsupported action: ${String(action)}`;
  }

  try {
    JSON.parse(normalizedInput);
    return 'Valid JSON';
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown parsing error.';
    return `Invalid JSON: ${details}`;
  }
}

