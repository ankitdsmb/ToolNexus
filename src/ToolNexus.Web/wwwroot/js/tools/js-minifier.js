import { minifyJavaScript } from './js-minifier-engine.js';
import { toUserError } from './js-minifier-errors.js';
import { normalizeInput } from './js-minifier-normalizer.js';
import {
  clearError,
  destroyJsMinifierUi,
  ensureUi,
  getUiOptions,
  renderError,
  renderLargeFileHint,
  setButtonsEnabled,
  setLatestOutput,
  setProcessingState,
  shouldYieldForLargeInput,
  updateMetrics,
  updateStatus
} from './js-minifier-ui.js';
import { byteSize } from './js-minifier-utils.js';
import { getToolPlatformKernel } from './tool-platform-kernel.js';

const TOOL_ID = 'js-minifier';

function resolveRoot() {
  return document.querySelector('.tool-page[data-slug="js-minifier"]');
}

export function create(root = resolveRoot()) {
  if (!root) return null;

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => {
      ensureUi();
      return { destroy: destroyJsMinifierUi };
    },
    destroy: () => destroyJsMinifierUi()
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

export async function runTool(action, input) {
  ensureUi();
  clearError();

  try {
    const normalized = normalizeInput(input);
    const options = getUiOptions();

    renderLargeFileHint(normalized.original);
    setProcessingState(true, byteSize(normalized.original));
    updateStatus('Minifying…', 'info');

    if (shouldYieldForLargeInput(normalized.original)) {
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
    }

    const start = performance.now();
    const minified = await minifyJavaScript(normalized.normalized, options);
    const elapsedMs = Math.max(1, Math.round(performance.now() - start));

    setLatestOutput(minified);
    updateMetrics(normalized.original, minified);
    updateStatus(`Minified successfully in ${elapsedMs}ms`, 'success');

    return minified;
  } catch (error) {
    const userError = toUserError(error);
    setLatestOutput('');
    renderError(userError);
    updateStatus('Minification failed', 'error');
    throw new Error(userError.message);
  } finally {
    setProcessingState(false);
    setButtonsEnabled();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules[TOOL_ID] = { runTool, create, init, destroy };
