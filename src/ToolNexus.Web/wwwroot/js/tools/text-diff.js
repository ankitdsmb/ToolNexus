import { createTextDiffApp, TOOL_ID } from './text-diff.app.js';
import {
  buildDiffModel,
  LARGE_INPUT_THRESHOLD,
  MAX_RENDER_LINES,
  myersDiff,
  normalizeInput,
  serializeResult,
  summarize
} from './text-diff.api.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const MODULE_KEY = 'text-diff';

export {
  buildDiffModel,
  LARGE_INPUT_THRESHOLD,
  MAX_RENDER_LINES,
  myersDiff,
  normalizeInput,
  serializeResult,
  summarize
};

export function create(root) {
  return { root, handle: null };
}

export function init(context) {
  if (!context?.root) {
    return context ?? null;
  }

  return {
    ...context,
    handle: mountTextDiff(context.root)
  };
}

export function runTool() {
  return undefined;
}

export function destroy(context) {
  context?.handle?.destroy?.();
}

export function mountTextDiff(root) {
  if (!root) return null;

  return getToolPlatformKernel().mountTool({
    id: TOOL_ID,
    root,
    init: () => createTextDiffApp(root),
    destroy: (app) => app?.destroy?.()
  });
}

export function initTextDiffApp(doc = document) {
  const root = doc.querySelector('[data-tool="text-diff"]');
  if (!root) return null;
  return mountTextDiff(root);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initTextDiffApp(document), { once: true });
  } else {
    initTextDiffApp(document);
  }
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules[MODULE_KEY] = { create, init, runTool, destroy, initTextDiffApp };
