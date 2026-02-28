import { createJsonTransformStudioApp } from './json-transform-studio.app.js';
import { executeTransformation } from './json-transform-studio.api.js';
import { getToolPlatformKernel, resolveLifecycleInitRoot } from './tool-platform-kernel.js';
import { assertRunToolExecutionOnly } from './tool-lifecycle-guard.js';

const TOOL_ID = 'json-transform-studio';

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
    handle: mountJsonTransformStudio(root)
  };
}

export function runTool(action, input, options = {}) {
  assertRunToolExecutionOnly(TOOL_ID, action, input, options);
  return executeTransformation({ action, input, filterText: options.filterText ?? '' });
}

export function destroy(context) {
  context?.handle?.destroy?.();
}

export function mountJsonTransformStudio(root) {
  if (!root) return null;

  return getToolPlatformKernel().mountTool({
    id: TOOL_ID,
    root,
    init: () => {
      const app = createJsonTransformStudioApp(root, (action, input, options) => runTool(action, input, options));
      app.init();
      return app;
    },
    destroy: (app) => app?.destroy?.()
  });
}
