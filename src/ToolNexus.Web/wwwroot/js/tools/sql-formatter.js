import { createSqlFormatterApp } from './sql-formatter.app.js';
import { runSqlFormatter } from './sql-formatter.api.js';
import { getToolPlatformKernel, normalizeToolRoot, resolveLifecycleInitRoot } from './tool-platform-kernel.js';
import { assertRunToolExecutionOnly } from './tool-lifecycle-guard.js';

const TOOL_ID = 'sql-formatter';

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
  if (!root) return null;

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => createSqlFormatterApp(root),
    destroy: (app) => app?.destroy?.()
  });
}

// MOUNT ONLY — DO NOT EXECUTE BUSINESS LOGIC HERE
export function init(...args) {
  const { root } = resolveLifecycleInitRoot(args);
  if (!(root instanceof Element)) {
    throw new Error('[Lifecycle] invalid root');
  }

  const handle = create(root);
  if (!handle) return null;
  handle?.init?.();
  return handle;
}

export function destroy(context) {
  const root = requireRuntimeRoot(context);
  if (!root) return;
  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}

export async function runTool(action, input, options = {}) {
  assertRunToolExecutionOnly(TOOL_ID, action, input, options);
  return runSqlFormatter(action, input, options);
}


