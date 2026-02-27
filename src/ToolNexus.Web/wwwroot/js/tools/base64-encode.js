import { createBase64EncodeApp, runClientBase64Encode } from './base64-encode.app.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'base64-encode';

function resolveRoot(rootOrContext) {
  if (rootOrContext instanceof Element) return rootOrContext;
  if (rootOrContext?.root instanceof Element) return rootOrContext.root;
  if (rootOrContext?.toolRoot instanceof Element) return rootOrContext.toolRoot;
  return null;
}

function requireRuntimeRoot(rootOrContext) {
  const root = resolveRoot(rootOrContext);
  if (!root) {
    throw new Error('Tool runtime error: missing runtime root. Tool must use runtime lifecycle root.');
  }

  return root;
}

export function create(rootOrContext) {
  const root = requireRuntimeRoot(rootOrContext);
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

export function init(rootOrContext) {
  const root = requireRuntimeRoot(rootOrContext);
  const handle = create(root);
  if (!handle) {
    return null;
  }

  handle.init();
  return handle;
}

export function destroy(rootOrContext) {
  const root = requireRuntimeRoot(rootOrContext);

  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}

export async function runTool(action, input, options = {}) {
  const normalizedAction = String(action ?? '').trim().toLowerCase();
  if (normalizedAction !== 'encode') {
    throw new Error(`Unsupported action "${action}" for base64-encode.`);
  }

  return runClientBase64Encode(input, options);
}


