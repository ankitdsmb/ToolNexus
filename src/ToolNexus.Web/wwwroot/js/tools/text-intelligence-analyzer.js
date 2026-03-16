import { getToolPlatformKernel, resolveLifecycleInitRoot } from './tool-platform-kernel.js';
import { assertRunToolExecutionOnly } from './tool-lifecycle-guard.js';

const TOOL_ID = 'text-intelligence-analyzer';
const ACTION = 'analyze';
const DEFAULT_EXECUTION_PATH_PREFIX = '/api/v1/tools';

function normalizePathPrefix(pathPrefix) {
  const normalized = (pathPrefix ?? '').toString().trim();
  if (!normalized) {
    return DEFAULT_EXECUTION_PATH_PREFIX;
  }

  return `/${normalized.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}

function buildEndpoint() {
  const apiBase = (window.ToolNexusConfig?.apiBaseUrl ?? '').trim().replace(/\/$/, '');
  const pathPrefix = normalizePathPrefix(window.ToolNexusConfig?.toolExecutionPathPrefix);
  const endpointPath = `${pathPrefix}/${encodeURIComponent(TOOL_ID)}/${encodeURIComponent(ACTION)}`;
  return apiBase ? `${apiBase}${endpointPath}` : endpointPath;
}

function extractText(input) {
  if (typeof input === 'string') {
    return input;
  }

  if (input && typeof input === 'object') {
    return String(input.text ?? input.input ?? '');
  }

  return '';
}

export async function runTool(action, input) {
  assertRunToolExecutionOnly(action, ACTION, TOOL_ID);

  const text = extractText(input).trim();
  if (!text) {
    throw new Error('Input text is required.');
  }

  const response = await fetch(buildEndpoint(), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: JSON.stringify({ text }) })
  });

  const payload = await response.json().catch(() => {
    throw new Error('Invalid response from execution API.');
  });

  if (!response.ok) {
    const detail = payload?.error ?? payload?.detail ?? 'Execution failed.';
    throw new Error(detail);
  }

  return payload;
}

function resolveRoot(context) {
  if (context?.handle?.id === TOOL_ID && context.handle?.root instanceof Element) {
    return context.handle.root;
  }

  const { root } = resolveLifecycleInitRoot([context]);
  return root;
}

function createApp(root) {
  const input = root.querySelector('#inputEditor');
  const output = root.querySelector('#outputViewer');
  const status = root.querySelector('#analysisStatus');
  const button = root.querySelector('#analyzeButton');
  const errorBox = root.querySelector('#errorBox');

  if (!input || !output || !status || !button) {
    throw new Error('[text-intelligence-analyzer] missing required DOM nodes');
  }

  const handleAnalyze = async () => {
    const text = input.value?.trim() ?? '';
    if (!text) {
      status.textContent = 'Provide text before execution.';
      output.textContent = 'Execution failed: input is empty.';
      return;
    }

    status.textContent = 'Analyzing…';
    button.disabled = true;
    if (errorBox) {
      errorBox.hidden = true;
      errorBox.textContent = '';
    }

    try {
      const payload = await runTool(ACTION, { text });
      output.textContent = JSON.stringify(payload, null, 2);
      status.textContent = 'Analysis completed.';
    } catch (error) {
      const message = error?.message || 'Execution failed.';
      output.textContent = message;
      status.textContent = 'Execution failed.';
      if (errorBox) {
        errorBox.hidden = false;
        errorBox.textContent = message;
      }
    } finally {
      button.disabled = false;
    }
  };

  button.addEventListener('click', handleAnalyze);

  return {
    destroy() {
      button.removeEventListener('click', handleAnalyze);
    }
  };
}

export function create(context) {
  const root = resolveRoot(context);
  if (!root) {
    return null;
  }

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => createApp(root),
    destroy: (app) => app?.destroy?.()
  });
}

export async function init(...args) {
  const { root } = resolveLifecycleInitRoot(args);
  if (!(root instanceof Element)) {
    throw new Error('[Lifecycle] invalid root');
  }

  const handle = create(root);
  if (!handle) {
    return { mounted: false };
  }

  await handle?.init?.();

  return {
    mounted: true,
    cleanup: () => handle.destroy(),
    handle
  };
}

export function destroy(context) {
  const root = resolveRoot(context);
  if (!root) {
    return;
  }

  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}
