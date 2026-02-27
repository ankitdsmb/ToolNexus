import { createRegexTesterApp } from './regex-tester.app.js';
import {
  RegexToolError,
  normalizeRegexOptions,
  runRegexEvaluation,
  runTool as runRegexTesterTool,
  sanitizeFlags,
  validateRegexInputs
} from './regex-tester.api.js';
import { getToolPlatformKernel, normalizeToolRoot, resolveLifecycleInitRoot } from './tool-platform-kernel.js';
import { assertRunToolExecutionOnly } from './tool-lifecycle-guard.js';

const MODULE_KEY = 'regex-tester';
const TOOL_ID = 'regex-tester';

export {
  RegexToolError,
  normalizeRegexOptions,
  runRegexEvaluation,
  sanitizeFlags,
  validateRegexInputs
};

export async function runTool(action, input, options = {}) {
  assertRunToolExecutionOnly(TOOL_ID, action, input, options);
  return runRegexTesterTool(action, input, options);
}

function resolveRoot(context) {
  if (context?.handle?.id === TOOL_ID && context.handle?.root instanceof Element) {
    return context.handle.root;
  }

  return normalizeToolRoot(context);
}

export function create(context) {
  return { root: resolveRoot(context), handle: null };
}

// lifecycle init (mount only)
// execution handled via runTool
// MOUNT ONLY — DO NOT EXECUTE BUSINESS LOGIC HERE
export function init(...args) {
  const { lifecycleContext, root } = resolveLifecycleInitRoot(args);
  if (!(root instanceof Element)) {
    throw new Error('[Lifecycle] invalid root');
  }

  return {
    ...(typeof lifecycleContext === 'object' && lifecycleContext ? lifecycleContext : {}),
    root,
    handle: mountRegexTester(root)
  };
}

export function destroy(context) {
  context?.handle?.destroy?.();
}

export function mountRegexTester(root) {
  if (!root) {
    return null;
  }

  return getToolPlatformKernel().mountTool({
    id: TOOL_ID,
    root,
    init: () => createRegexTesterApp(root),
    destroy: (appInstance) => appInstance?.destroy?.()
  });
}

export function initRegexTesterApp(doc = document) {
  const root = doc.querySelector('[data-tool="regex-tester"]');
  if (!root) {
    return null;
  }

  return mountRegexTester(root);
}

void MODULE_KEY;
