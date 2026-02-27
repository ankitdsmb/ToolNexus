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
import { assertRunToolExecutionOnly } from './tool-lifecycle-guard.js';

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
  const root = context?.root || context?.toolRoot || context;
  if (!(root instanceof Element)) {
    throw new Error('Invalid mount root');
  }

  return {
    ...(typeof context === 'object' && context ? context : {}),
    root,
    handle: mountTextDiff(root)
  };
}

export function runTool() {
  assertRunToolExecutionOnly(TOOL_ID);
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

