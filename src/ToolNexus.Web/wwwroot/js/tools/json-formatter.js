import { createJsonFormatterApp } from './json-formatter.app.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'json-formatter';

function isElement(value) {
  return Boolean(value && value.nodeType === Node.ELEMENT_NODE && value instanceof Element);
}

function toHandleRoot(handle) {
  return isElement(handle?.root) ? handle.root : null;
}

function normalizeLifecycleRoot(rootOrContext) {
  if (isElement(rootOrContext)) {
    return rootOrContext.closest(`[data-tool="${TOOL_ID}"]`) || rootOrContext;
  }

  if (isElement(rootOrContext?.root)) {
    return normalizeLifecycleRoot(rootOrContext.root);
  }

  if (isElement(rootOrContext?.toolRoot)) {
    return normalizeLifecycleRoot(rootOrContext.toolRoot);
  }

  if (rootOrContext?.id === TOOL_ID) {
    return toHandleRoot(rootOrContext);
  }

  const scopedHandleRoot = toHandleRoot(rootOrContext?.handle);
  if (scopedHandleRoot) {
    return normalizeLifecycleRoot(scopedHandleRoot);
  }

  return document.querySelector(`[data-tool="${TOOL_ID}"][data-tool-root]`) || document.querySelector(`[data-tool="${TOOL_ID}"]`);
}

function resolveToolRoot(rootOrContext) {
  const normalizedRoot = normalizeLifecycleRoot(rootOrContext);

  if (!normalizedRoot) {
    return null;
  }

  return normalizedRoot.matches?.(`[data-tool="${TOOL_ID}"][data-tool-root]`)
    ? normalizedRoot
    : normalizedRoot.closest?.(`[data-tool="${TOOL_ID}"][data-tool-root]`) || normalizedRoot;
}

export function create(context) {
  const root = resolveToolRoot(context);

  if (!root) {
    console.warn('[json-formatter] root not found');
    return null;
  }

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: async () => {
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
  const root = resolveToolRoot(context);
  if (!root) {
    return;
  }

  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}
