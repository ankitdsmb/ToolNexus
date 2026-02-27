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
import { getToolPlatformKernel, normalizeToolRoot, resolveLifecycleInitRoot } from './tool-platform-kernel.js';
import { assertRunToolExecutionOnly } from './tool-lifecycle-guard.js';

const TOOL_ID = 'js-minifier';

function resolveRoot(context) {
  if (context?.handle?.id === TOOL_ID && context.handle?.root instanceof Element) {
    return context.handle.root;
  }

  return normalizeToolRoot(context);
}

function requireRuntimeRoot(context) {
  const root = resolveRoot(context);
  if (!root) {
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
    init: () => {
      ensureUi();
      return { destroy: destroyJsMinifierUi };
    },
    destroy: () => destroyJsMinifierUi()
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

export async function runTool(action, input) {
  assertRunToolExecutionOnly(TOOL_ID, action, input);
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


