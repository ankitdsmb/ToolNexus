const TOOL_SLUG = 'text-intelligence-analyzer';
const ACTION = 'analyze';
const DEFAULT_EXECUTION_PATH_PREFIX = '/api/v1/tools';

export const toolRuntimeType = 'mount';

function normalizePathPrefix(pathPrefix) {
  const normalized = (pathPrefix ?? '').toString().trim();
  if (!normalized) {
    return DEFAULT_EXECUTION_PATH_PREFIX;
  }

  return `/${normalized.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}

function resolveRoot() {
  return document.querySelector(`[data-tool="${TOOL_SLUG}"]`) ?? document.querySelector('.tool-page');
}

function createRuntimeNodes(doc = document) {
  const container = doc.createElement('section');
  container.className = 'tool-panel tool-panel--runtime';
  container.dataset.runtimeContainer = TOOL_SLUG;

  const title = doc.createElement('h2');
  title.textContent = 'Text Intelligence Analyzer';

  const inputLabel = doc.createElement('label');
  inputLabel.htmlFor = `${TOOL_SLUG}-input`;
  inputLabel.textContent = 'Input text';

  const textarea = doc.createElement('textarea');
  textarea.id = `${TOOL_SLUG}-input`;
  textarea.rows = 10;
  textarea.placeholder = 'Paste text to analyze...';

  const analyzeButton = doc.createElement('button');
  analyzeButton.type = 'button';
  analyzeButton.className = 'tool-btn tool-btn--primary';
  analyzeButton.textContent = 'Analyze';

  const status = doc.createElement('p');
  status.className = 'result-indicator result-indicator--idle';
  status.setAttribute('role', 'status');
  status.textContent = 'Ready';

  const result = doc.createElement('pre');
  result.className = 'tool-runtime-output';
  result.setAttribute('aria-live', 'polite');
  result.textContent = 'No output yet.';

  container.append(title, inputLabel, textarea, analyzeButton, status, result);

  return { container, textarea, analyzeButton, status, result };
}

async function executeAnalysis(text) {
  const apiBase = (window.ToolNexusConfig?.apiBaseUrl ?? '').trim().replace(/\/$/, '');
  const pathPrefix = normalizePathPrefix(window.ToolNexusConfig?.toolExecutionPathPrefix);
  const endpointPath = `${pathPrefix}/${encodeURIComponent(TOOL_SLUG)}/${encodeURIComponent(ACTION)}`;
  const endpoint = apiBase ? `${apiBase}${endpointPath}` : endpointPath;

  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: JSON.stringify({ text }) })
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    throw new Error('Invalid response from execution API.');
  }

  if (!response.ok) {
    const detail = payload?.error ?? payload?.detail ?? 'Execution failed.';
    throw new Error(detail);
  }

  return payload;
}

function renderPayload(resultNode, payload) {
  try {
    resultNode.textContent = JSON.stringify(payload, null, 2);
  } catch {
    resultNode.textContent = 'Invalid response payload.';
  }
}

export function create(root = resolveRoot()) {
  if (!root) {
    return null;
  }

  const existing = root.querySelector(`[data-runtime-container="${TOOL_SLUG}"]`);
  if (existing) {
    return { root, mounted: true, nodes: null, removeListeners: () => {} };
  }

  const nodes = createRuntimeNodes(root.ownerDocument || document);
  root.appendChild(nodes.container);

  return {
    root,
    nodes,
    mounted: false,
    removeListeners: () => {}
  };
}

export function mount(context = create()) {
  if (!context?.root || !context?.nodes || context.mounted) {
    return context ?? null;
  }

  const { textarea, analyzeButton, status, result } = context.nodes;

  const onAnalyze = async () => {
    const text = textarea.value?.trim() ?? '';
    if (!text) {
      status.textContent = 'Please provide text before analyzing.';
      result.textContent = 'Execution failed: input is empty.';
      return;
    }

    analyzeButton.disabled = true;
    status.textContent = 'Analyzing…';

    try {
      const payload = await executeAnalysis(text);
      const runtimeStatus = payload?.output && typeof payload.output === 'string'
        ? (() => {
            try {
              return JSON.parse(payload.output)?.status;
            } catch {
              return null;
            }
          })()
        : null;

      if (runtimeStatus === 'runtime-not-enabled') {
        status.textContent = 'Runtime disabled: showing fallback analysis.';
      } else {
        status.textContent = 'Analysis completed.';
      }

      renderPayload(result, payload);
    } catch (error) {
      status.textContent = 'Execution failed.';
      result.textContent = error?.message || 'Execution failed.';
    } finally {
      analyzeButton.disabled = false;
    }
  };

  analyzeButton.addEventListener('click', onAnalyze);

  return {
    ...context,
    mounted: true,
    removeListeners: () => analyzeButton.removeEventListener('click', onAnalyze)
  };
}

export function init(root = resolveRoot()) {
  const created = create(root);
  if (!created) {
    return null;
  }

  return mount(created);
}

export function destroy(context = null, root = resolveRoot()) {
  const effectiveRoot = context?.root ?? root;
  context?.removeListeners?.();

  if (!effectiveRoot) {
    return;
  }

  const container = effectiveRoot.querySelector(`[data-runtime-container="${TOOL_SLUG}"]`);
  container?.remove();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  } else {
    init();
  }
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules[TOOL_SLUG] = {
  toolRuntimeType,
  create,
  mount,
  init,
  destroy,
  runtime: { toolRuntimeType }
};
