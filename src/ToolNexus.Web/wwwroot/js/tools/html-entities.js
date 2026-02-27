import { mountHtmlEntitiesTool, runConversion } from './html-entities/ui.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'html-entities';

function resolveRoot() {
  return document.querySelector('.html-entities-tool');
}

export function create(root = resolveRoot()) {
  if (!root) return null;

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => mountHtmlEntitiesTool(root),
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
  const normalizedAction = (action ?? '').toString().trim().toLowerCase();

  if (normalizedAction !== 'encode' && normalizedAction !== 'decode') {
    throw new Error(`Unsupported action "${action}" for html-entities.`);
  }

  return runConversion(normalizedAction, input, {
    encodeAll: false,
    unsafeOnly: true,
    preferNamed: true,
    numeric: false,
    hex: false,
    preserveFormatting: true
  });
}


