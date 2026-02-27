import { createBase64EncodeApp, runClientBase64Encode } from './base64-encode.app.js';
import { getToolPlatformKernel, normalizeToolRoot } from './tool-platform-kernel.js';
import { assertRunToolExecutionOnly } from './tool-lifecycle-guard.js';

const TOOL_ID = 'base64-encode';

function resolveRoot(context) {
  if (context?.handle?.id === TOOL_ID && context.handle?.root instanceof Element) {
    return context.handle.root;
  }

  return normalizeToolRoot(context);
}

function requireRuntimeRoot(context) {
  const root = resolveRoot(context);
  if (!root) {
    throw new Error(`[${TOOL_ID}] invalid lifecycle root`);
  }

  return root;
}

export function create(context) {
  const root = requireRuntimeRoot(context);
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

export function init(context) {
  const root = requireRuntimeRoot(context);
  const handle = create(root);
  if (!handle) {
    return null;
  }

  handle.init();
  return handle;
}

export function destroy(context) {
  const root = requireRuntimeRoot(context);

  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}

export async function runTool(action, input, options = {}) {
  assertRunToolExecutionOnly(TOOL_ID, action, input, options);
  const normalizedAction = String(action ?? '').trim().toLowerCase();
  if (normalizedAction !== 'encode') {
    throw new Error(`Unsupported action "${action}" for base64-encode.`);
  }

  return runClientBase64Encode(input, options);
}


