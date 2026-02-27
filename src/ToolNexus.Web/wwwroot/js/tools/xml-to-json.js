import { createXmlToJsonApp } from './xml-to-json.app.js';
import { transformXmlToJson, XmlJsonError } from './xml-to-json.api.js';
import { getToolPlatformKernel, normalizeToolRoot, resolveLifecycleInitRoot } from './tool-platform-kernel.js';
import { assertRunToolExecutionOnly } from './tool-lifecycle-guard.js';

const TOOL_ID = 'xml-to-json';

function resolveRoot(context) {
  if (context?.handle?.id === TOOL_ID && context.handle?.root instanceof Element) {
    return context.handle.root;
  }

  return normalizeToolRoot(context);
}

function requireRuntimeRoot(context) {
  const root = resolveRoot(context);
  if (!(root instanceof Element)) {
    throw new Error(`[${TOOL_ID}] invalid lifecycle root`);
  }

  return root;
}

export function create(context) {
  const root = requireRuntimeRoot(context);
  if (!root) return null;

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: (normalizedRoot) => createXmlToJsonApp(normalizedRoot),
    destroy: (app) => app?.destroy?.()
  });
}

export function init(...args) {
  const { root } = resolveLifecycleInitRoot(args);
  if (!(root instanceof Element)) {
    throw new Error('[Lifecycle] invalid root');
  }

  const handle = create(root);
  if (!handle) return null;
  handle?.init?.();
  return handle;
}

export function destroy(context) {
  const root = requireRuntimeRoot(context);
  if (!root) return;
  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}

export async function runTool(action, input, options = {}) {
  assertRunToolExecutionOnly(TOOL_ID, action, input, options);
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


