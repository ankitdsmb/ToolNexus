import { createJsonFormatterApp } from './json-formatter.app.js';

const TOOL_ID = 'json-formatter';

function resolveRoot(rootOrContext) {
  if (rootOrContext instanceof Element) {
    return (
      rootOrContext.closest('[data-tool="json-formatter"]') ||
      rootOrContext
    );
  }

  if (rootOrContext?.root instanceof Element) {
    return resolveRoot(rootOrContext.root);
  }

  if (rootOrContext?.toolRoot instanceof Element) {
    return resolveRoot(rootOrContext.toolRoot);
  }

  return document.querySelector('[data-tool="json-formatter"]');
}

/* ================================
   MODERN LIFECYCLE (CRITICAL)
================================ */

export async function create(context) {
  const root = resolveRoot(context);

  if (!root) {
    console.warn('[json-formatter] root not found');
    return null;
  }

  const app = createJsonFormatterApp(root);

  return {
    mounted: true,
    cleanup: () => app?.destroy?.(),
    app
  };
}

export async function init(context) {
  const root = resolveRoot(context);
  if (!root) return { mounted: false };

  const app = createJsonFormatterApp(root);
  await app.init();

  return {
    mounted: true,
    cleanup: () => app?.destroy?.()
  };
}

export function destroy(context) {
  const root = resolveRoot(context);
  if (!root) return;

  // optional explicit cleanup
} 
