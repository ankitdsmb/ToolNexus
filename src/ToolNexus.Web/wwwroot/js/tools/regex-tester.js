import { createRegexTesterApp } from './regex-tester.app.js';
import {
  RegexToolError,
  normalizeRegexOptions,
  runRegexEvaluation,
  runTool as runRegexTesterTool,
  sanitizeFlags,
  validateRegexInputs
} from './regex-tester.api.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';
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

export function create(root) {
  return { root, handle: null };
}

// lifecycle init (mount only)
// execution handled via runTool
export function init(context) {
  if (!context?.root) {
    return context ?? null;
  }

  return {
    ...context,
    handle: mountRegexTester(context.root)
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
