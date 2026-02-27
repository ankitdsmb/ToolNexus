import { mountHtmlEntitiesTool, runConversion } from './html-entities/ui.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'html-entities';

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
    init: () => mountHtmlEntitiesTool(root),
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


