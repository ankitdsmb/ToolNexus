import { createMarkdownToHtmlApp } from './markdown-to-html.app.js';
import { runMarkdownToHtml } from './markdown-to-html.api.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'markdown-to-html';

function resolveRoot() {
  return document.querySelector('[data-tool="markdown-to-html"], .markdown-to-html-tool');
}

export function create(root = resolveRoot()) {
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

export function init(root = resolveRoot()) {
  const handle = create(root);
  if (!handle) {
    return null;
  }

  handle.init();
  return handle;
}

export function destroy(root = resolveRoot()) {
  if (!root) {
    return;
  }

  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}

export async function runTool(action, input) {
  return runMarkdownToHtml(action, input);
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['markdown-to-html'] = { runTool, create, init, destroy };
