import { createXmlToJsonApp } from './xml-to-json.app.js';
import { transformXmlToJson, XmlJsonError } from './xml-to-json.api.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'xml-to-json';

function resolveRoot(rootOrContext) {
  if (rootOrContext instanceof Element) return rootOrContext;
  if (rootOrContext?.root instanceof Element) return rootOrContext.root;
  if (rootOrContext?.toolRoot instanceof Element) return rootOrContext.toolRoot;
  return null;
}

function requireRuntimeRoot(rootOrContext) {
  const root = resolveRoot(rootOrContext);
  if (!root) {
    throw new Error('Tool runtime error: missing runtime root. Tool must use runtime lifecycle root.');
  }

  return root;
}

export function create(rootOrContext) {
  const root = requireRuntimeRoot(rootOrContext);
  if (!root) return null;

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => createXmlToJsonApp(root),
    destroy: (app) => app?.destroy?.()
  });
}

export function init(rootOrContext) {
  const root = requireRuntimeRoot(rootOrContext);
  const handle = create(root);
  if (!handle) return null;
  handle.init();
  return handle;
}

export function destroy(rootOrContext) {
  const root = requireRuntimeRoot(rootOrContext);
  if (!root) return;
  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}

export async function runTool(action, input, options = {}) {
  try {
    if (String(action ?? '').trim().toLowerCase() !== 'convert') {
      throw new XmlJsonError('Unsupported action', 'XML to JSON supports only the convert action.');
    }

    const config = { ...options };
    const { output } = await transformXmlToJson(input, config);
    return output;
  } catch (error) {
    throw new Error(error?.message ?? 'Conversion failed. Please verify the XML input and try again.');
  }
}


