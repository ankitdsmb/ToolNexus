import { createMarkdownToHtmlApp } from './markdown-to-html.app.js';
import { runMarkdownToHtml } from './markdown-to-html.api.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';
import { assertRunToolExecutionOnly } from './tool-lifecycle-guard.js';

const TOOL_ID = 'markdown-to-html';

function resolveRoot(context) {
  const root = context?.root || context?.toolRoot || context;
  return root instanceof Element ? root : null;
}

function requireRuntimeRoot(context) {
  const root = resolveRoot(context);
  if (!root) {
    throw new Error(`[${TOOL_ID}] invalid lifecycle root`);
  }

  return root;
}

export function create(context) {
  const root = requireRuntimeRoot(context);
  if (!root) {
    return null;
  }

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => createMarkdownToHtmlApp(root),
    destroy: (app) => app?.destroy?.()
  });
}

export function init(context) {
  const root = requireRuntimeRoot(context);
  const handle = create(root);
  if (!handle) {
    return null;
  }

  handle.init();
  return handle;
}

export function destroy(context) {
  const root = requireRuntimeRoot(context);

  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}

export async function runTool(action, input) {
  assertRunToolExecutionOnly(TOOL_ID, action, input);
  return runMarkdownToHtml(action, input);
}


