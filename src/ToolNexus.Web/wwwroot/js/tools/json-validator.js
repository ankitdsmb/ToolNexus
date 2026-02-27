import { getToolPlatformKernel } from './tool-platform-kernel.js';
import { assertRunToolExecutionOnly } from './tool-lifecycle-guard.js';

const TOOL_ID = 'json-validator';

function resolveRoot(rootOrContext) {
  return rootOrContext;
}

function requireRuntimeRoot(rootOrContext) {
  return resolveRoot(rootOrContext);
}

export function create(rootOrContext) {
  const root = requireRuntimeRoot(rootOrContext);
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

// lifecycle init (mount only)
// execution handled via runTool
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

export async function runTool(action, input) {
  assertRunToolExecutionOnly(TOOL_ID, action, input);
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

