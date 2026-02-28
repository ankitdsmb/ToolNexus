import { createDocumentConverterApp, TOOL_ID } from './document-converter.app.js';
import { runTool as executeDocumentConversion } from './document-converter.api.js';
import { getToolPlatformKernel, resolveLifecycleInitRoot } from './tool-platform-kernel.js';
import { assertRunToolExecutionOnly } from './tool-lifecycle-guard.js';

export function create(root) {
  return { root, handle: null };
}

export function init(...args) {
  const { lifecycleContext, root } = resolveLifecycleInitRoot(args);
  if (!(root instanceof Element)) {
    throw new Error('[Lifecycle] invalid root');
  }

  return {
    ...(typeof lifecycleContext === 'object' && lifecycleContext ? lifecycleContext : {}),
    root,
    handle: mountDocumentConverter(root)
  };
}

export function destroy(context) {
  context?.handle?.destroy?.();
}

export function mountDocumentConverter(root) {
  if (!root) {
    return null;
  }

  return getToolPlatformKernel().mountTool({
    id: TOOL_ID,
    root,
    init: () => createDocumentConverterApp(root),
    destroy: (app) => app?.destroy?.()
  });
}

export async function runTool(action, input, options = {}) {
  assertRunToolExecutionOnly(TOOL_ID, action, input, options);
  return executeDocumentConversion(action, input);
}
