import { createXmlFormatterApp } from './xml-formatter.app.js';
import { runXmlFormatter } from './xml-formatter.api.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';
import { assertRunToolExecutionOnly } from './tool-lifecycle-guard.js';

const TOOL_ID = 'xml-formatter';

function resolveRoot(context) {
  const root = context?.root || context?.toolRoot || context;
  return root instanceof Element ? root : null;
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
    init: () => createXmlFormatterApp(root),
    destroy: (app) => app?.destroy?.()
  });
}

// lifecycle init (mount only)
// execution handled via runTool
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
  try {
    return await runXmlFormatter(action, input, options);
  } catch (error) {
    throw new Error(error?.message ?? 'XML formatting failed');
  }
}


