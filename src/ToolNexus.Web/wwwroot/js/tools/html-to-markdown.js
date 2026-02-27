import { createHtmlToMarkdownApp } from './html-to-markdown.app.js';
import { getDefaultHtmlToMarkdownOptions, runHtmlToMarkdown } from './html-to-markdown.api.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'html-to-markdown';

function resolveRoot() {
  return document.querySelector('.tool-page[data-slug="html-to-markdown"]');
}

export function create(root = resolveRoot()) {
  if (!root) return null;

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => createHtmlToMarkdownApp(root),
    destroy: (app) => app?.destroy?.()
  });
}

export function init(root = resolveRoot()) {
  const handle = create(root);
  if (!handle) return null;
  handle.init();
  return handle;
}

export function destroy(root = resolveRoot()) {
  if (!root) return;
  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}

export async function runTool(action, input, options = {}) {
  const resolved = { ...getDefaultHtmlToMarkdownOptions(), ...options };
  const { output } = await runHtmlToMarkdown(action, input, resolved);
  return output;
}


