import { minifyJavaScript } from './js-minifier-engine.js';
import { toUserError } from './js-minifier-errors.js';
import { normalizeInput } from './js-minifier-normalizer.js';
import {
  clearError,
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

function boot() {
  ensureUi();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['js-minifier'] = { runTool };
