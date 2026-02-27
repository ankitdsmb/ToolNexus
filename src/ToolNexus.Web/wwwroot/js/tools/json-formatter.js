import { createJsonFormatterApp } from './json-formatter.app.js';

const TOOL_ID = 'json-formatter';

/**
 * ALWAYS resolve full tool article.
 * Runtime may pass different scopes.
 */
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

/* ===================================================
   RUNTIME LIFECYCLE CONTRACT (FIXED)
=================================================== */

export function create(rootOrContext) {
  const root = resolveRoot(rootOrContext);

  if (!root) {
    console.warn('[json-formatter] root not found');
    return null;
  }

  // IMPORTANT:
  // runtime expects REAL app instance — NOT kernel handle
  const app = createJsonFormatterApp(root);
  return app;
}

export function init(appOrRoot) {
  const app =
    appOrRoot?.init && appOrRoot?.destroy
      ? appOrRoot
      : create(appOrRoot);

  if (!app) return null;

  app.init?.();
  return app;
}

export function destroy(appOrRoot) {
  if (appOrRoot?.destroy) {
    appOrRoot.destroy();
    return;
  }

  const root = resolveRoot(appOrRoot);
  if (!root) return;

  // optional safeguard cleanup
  root.querySelectorAll('.json-formatter-fallback-editor')
    .forEach(el => el.remove());
} 
