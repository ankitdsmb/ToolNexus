import { getToolPlatformKernel, normalizeToolRoot, resolveLifecycleInitRoot } from './tool-platform-kernel.js';
import { assertRunToolExecutionOnly } from './tool-lifecycle-guard.js';

const TOOL_ID = 'json-validator';

function resolveRoot(context) {
  if (context?.handle?.id === TOOL_ID && context.handle?.root instanceof Element) {
    return context.handle.root;
  }

  return normalizeToolRoot(context);
}

function requireRuntimeRoot(context) {
  const root = resolveRoot(context);
  if (!(root instanceof Element)) {
    throw new Error(`[${TOOL_ID}] invalid lifecycle root`);
  }

  return root;
}

export function create(context) {
  const root = requireRuntimeRoot(context);
  if (!root) {
    return null;
  }

  return getToolPlatformKernel().registerTool({
    id: TOOL_ID,
    root,
    init: () => null,
    destroy: () => undefined
  });
}

// lifecycle init (mount only)
// execution handled via runTool
// MOUNT ONLY — DO NOT EXECUTE BUSINESS LOGIC HERE
export function init(...args) {
  const { root } = resolveLifecycleInitRoot(args);
  if (!(root instanceof Element)) {
    throw new Error('[Lifecycle] invalid root');
  }

  const handle = create(root);
  if (!handle) {
    return null;
  }

  handle?.init?.();
  return handle;
}

export function destroy(context) {
  const root = requireRuntimeRoot(context);

  getToolPlatformKernel().destroyToolById(TOOL_ID, root);
}

export async function runTool(action, input) {
  assertRunToolExecutionOnly(TOOL_ID, action, input);
  const normalizedAction = typeof action === 'string' ? action.trim().toLowerCase() : 'validate';
  const normalizedInput = typeof input === 'string' ? input : '';

  if (normalizedAction !== 'validate') {
    return `Unsupported action: ${String(action)}`;
  }

  try {
    JSON.parse(normalizedInput);
    return 'Valid JSON';
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown parsing error.';
    return `Invalid JSON: ${details}`;
  }
}

