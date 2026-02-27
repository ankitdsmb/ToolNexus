import { createJsonToYamlApp } from './json-to-yaml.app.js';
import { runJsonToYaml } from './json-to-yaml.api.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';
import { assertRunToolExecutionOnly } from './tool-lifecycle-guard.js';

const TOOL_ID = 'json-to-yaml';

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
  if (!root) return null;

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => createJsonToYamlApp(root),
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
    const { output } = await runJsonToYaml(action, input, options);
    return output;
  } catch (error) {
    throw new Error(error?.message ?? 'JSON to YAML conversion failed');
  }
}


