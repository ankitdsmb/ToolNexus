import { createXmlToJsonApp } from './xml-to-json.app.js';
import { transformXmlToJson, XmlJsonError } from './xml-to-json.api.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'xml-to-json';

function resolveRoot() {
  return document.querySelector('.tool-page[data-slug="xml-to-json"]');
}

export function create(root = resolveRoot()) {
  if (!root) return null;

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => createXmlToJsonApp(root),
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
  try {
    if ((action ?? '').toLowerCase() !== 'convert') {
      throw new XmlJsonError('Unsupported action', 'XML to JSON supports only the convert action.');
    }

    const config = { ...options };
    const { output } = await transformXmlToJson(input, config);
    return output;
  } catch (error) {
    throw new Error(error?.message ?? 'Conversion failed. Please verify the XML input and try again.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules[TOOL_ID] = { runTool, create, init, destroy };
