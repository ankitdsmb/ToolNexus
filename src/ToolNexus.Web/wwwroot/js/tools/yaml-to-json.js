import { createYamlToJsonApp } from './yaml-to-json.app.js';
import { runYamlToJson } from './yaml-to-json.api.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'yaml-to-json';

function resolveRoot() {
  return document.querySelector('.tool-page[data-slug="yaml-to-json"]') ?? document.querySelector('[data-tool="yaml-to-json"]');
}

export function create(root = resolveRoot()) {
  if (!root) return null;

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => createYamlToJsonApp(root),
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

export async function runTool(action, input, options = {}) {
  try {
    return await runYamlToJson(action, input, options);
  } catch (error) {
    throw new Error(error?.message ?? 'YAML to JSON conversion failed');
  }
}


