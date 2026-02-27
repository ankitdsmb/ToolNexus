import { createJsonFormatterApp } from './json-formatter.app.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'json-formatter';

function resolveRoot() {
  return document.querySelector('[data-tool="json-formatter"]');
}

function resolveRootFromContext(rootOrContext) {
  if (rootOrContext instanceof Element) {
    return rootOrContext;
  }

  if (rootOrContext?.root instanceof Element) {
    return rootOrContext.root;
  }

  if (rootOrContext?.toolRoot instanceof Element) {
    return rootOrContext.toolRoot;
  }

  return resolveRoot();
}

export function create(rootOrContext = resolveRoot()) {
  const root = resolveRootFromContext(rootOrContext);
  if (!root) {
    return null;
  }

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => {
      const app = createJsonFormatterApp(root);
      app.init();
      return app;
    },
    destroy: (app) => app?.destroy?.()
  });
}

export function init(rootOrContext = resolveRoot()) {
  if (rootOrContext?.id === TOOL_ID && typeof rootOrContext?.init === 'function') {
    rootOrContext.init();
    return rootOrContext;
  }

  const handle = create(rootOrContext);
  if (!handle) {
    return null;
  }

  handle.init();
  return handle;
}

export function destroy(rootOrContext = resolveRoot()) {
  const root = resolveRootFromContext(rootOrContext);
  if (!root) {
    return;
  }

  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['json-formatter'] = { create, init, destroy };
