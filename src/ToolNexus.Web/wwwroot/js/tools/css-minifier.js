import { runCssMinifier, toUserErrorMessage } from './css-minifier.api.js';
import { createCssMinifierApp } from './css-minifier.app.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'css-minifier';

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
  if (!root) return null;

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => createCssMinifierApp(root),
    destroy: (app) => app?.destroy?.()
  });
}

export function init(rootOrContext) {
  const root = requireRuntimeRoot(rootOrContext);
  const handle = create(root);
  if (!handle) return null;
  handle.init();
  return handle;
}

export function destroy(rootOrContext) {
  const root = requireRuntimeRoot(rootOrContext);
  if (!root) return;
  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}

export async function runTool(action, input, options = {}) {
  try {
    return await runCssMinifier(action, input, options);
  } catch (error) {
    throw new Error(toUserErrorMessage(error));
  }
}


