import { createJsonFormatterApp } from './json-formatter.app.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'json-formatter';

function resolveRoot(rootOrContext) {
  return rootOrContext;
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
