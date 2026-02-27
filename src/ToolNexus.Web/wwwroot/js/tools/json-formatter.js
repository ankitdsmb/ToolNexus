import { createJsonFormatterApp } from './json-formatter.app.js';
import { runJsonFormatter } from './json-formatter.api.js';
import { getToolPlatformKernel, normalizeToolRoot } from './tool-platform-kernel.js';
import { assertRunToolExecutionOnly } from './tool-lifecycle-guard.js';

const TOOL_ID = 'json-formatter';

function resolveRoot(context) {
  if (context?.handle?.id === TOOL_ID && context.handle?.root instanceof Element) {
    return context.handle.root;
  }

  return normalizeToolRoot(context);
}

export function create(context) {
  const rootOrContext = resolveRoot(context);

  if (!rootOrContext) {
    console.warn('[json-formatter] root not found');
    return null;
  }

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root: rootOrContext,
    init: async (root) => {
      const app = createJsonFormatterApp(root);
      await app.init();
      return app;
    },
    destroy: (app) => app?.destroy?.()
  });
}

// lifecycle init (mount only)
// execution handled via runTool
// MOUNT ONLY — DO NOT EXECUTE BUSINESS LOGIC HERE
export async function init(context) {
  const handle = create(context);
  if (!handle) {
    return { mounted: false };
  }

  await handle.init();

  return {
    mounted: true,
    cleanup: () => handle.destroy(),
    handle
  };
}

export function destroy(context) {
  const root = resolveRoot(context);
  if (!root) {
    return;
  }

  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}

export async function runTool(action, input, options = {}) {
  assertRunToolExecutionOnly(TOOL_ID, action, input, options);
  return runJsonFormatter(action, input, options);
}
