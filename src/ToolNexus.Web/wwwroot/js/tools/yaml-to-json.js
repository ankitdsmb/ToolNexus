import { createYamlToJsonApp } from './yaml-to-json.app.js';
import { runYamlToJson } from './yaml-to-json.api.js';
import { getToolPlatformKernel, normalizeToolRoot } from './tool-platform-kernel.js';
import { assertRunToolExecutionOnly } from './tool-lifecycle-guard.js';

const TOOL_ID = 'yaml-to-json';

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
    init: () => createYamlToJsonApp(root),
    destroy: (app) => app?.destroy?.()
  });
}

export function init(context) {
  const root = requireRuntimeRoot(context);
  const handle = create(root);
  if (!handle) return null;
  handle.init();
  return handle;
}

export function destroy(context) {
  const root = requireRuntimeRoot(context);
  if (!root) return;
  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}

export async function runTool(action, input, options = {}) {
  assertRunToolExecutionOnly(TOOL_ID, action, input, options);
  try {
    return await runYamlToJson(action, input, options);
  } catch (error) {
    throw new Error(error?.message ?? 'YAML to JSON conversion failed');
  }
}


