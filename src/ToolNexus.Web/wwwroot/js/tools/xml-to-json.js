import { createXmlToJsonApp } from './xml-to-json.app.js';
import { transformXmlToJson, XmlJsonError } from './xml-to-json.api.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'xml-to-json';

function resolveRoot(rootOrContext) {
  return rootOrContext;
}

function requireRuntimeRoot(rootOrContext) {
  return resolveRoot(rootOrContext);
}

export function create(rootOrContext) {
  const root = requireRuntimeRoot(rootOrContext);
  if (!root) return null;

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: (normalizedRoot) => createXmlToJsonApp(normalizedRoot),
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


