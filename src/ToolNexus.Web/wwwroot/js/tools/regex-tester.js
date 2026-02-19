import { createRegexTesterApp } from './regex-tester.app.js';
import {
  RegexToolError,
  normalizeRegexOptions,
  runRegexEvaluation,
  runTool,
  sanitizeFlags,
  validateRegexInputs
} from './regex-tester.api.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const MODULE_KEY = 'regex-tester';
const TOOL_ID = 'regex-tester';

export {
  RegexToolError,
  normalizeRegexOptions,
  runRegexEvaluation,
  runTool,
  sanitizeFlags,
  validateRegexInputs
};

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

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initRegexTesterApp(document), { once: true });
  } else {
    initRegexTesterApp(document);
  }
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules[MODULE_KEY] = { runTool, initRegexTesterApp };
