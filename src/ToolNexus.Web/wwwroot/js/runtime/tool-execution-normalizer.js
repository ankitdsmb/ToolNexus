import { safeInitScheduler } from './safe-init-scheduler.js';

function toCandidates(toolModule) {
  return [toolModule, toolModule?.default, toolModule?.lifecycle, toolModule?.default?.lifecycle].filter(Boolean);
}

function resolveTarget(toolModule, capability = {}, slug = '') {
  const candidates = toCandidates(toolModule);
  const target = candidates.find((candidate) =>
    ['create', 'init', 'destroy'].every((method) => typeof candidate?.[method] === 'function'));

  if (target) {
    return { target, mode: 'modern.lifecycle' };
  }

  const runToolTarget = candidates.find((candidate) => typeof candidate?.runTool === 'function');
  if (runToolTarget) {
    const runToolArity = Number(runToolTarget.runTool.length ?? 0);
    const executionLikeRunTool = runToolArity >= 2;
    return {
      target: runToolTarget,
      mode: executionLikeRunTool ? 'legacy.runTool.execution-only' : 'legacy.runTool'
    };
  }

  const initTarget = candidates.find((candidate) => typeof candidate?.init === 'function');
  if (initTarget) {
    return { target: initTarget, mode: 'legacy.init' };
  }

  const registryTarget = window.ToolNexusModules?.[slug];
  if (registryTarget) {
    return resolveTarget(registryTarget, capability, '');
  }

  return { target: {}, mode: 'none' };
}

function withDomTracking(root, context, callback) {
  if (!root || typeof callback !== 'function') {
    return callback?.();
  }

  const beforeChildren = new Set(Array.from(root.children));
  const originalAppendChild = root.appendChild.bind(root);
  const originalInsertBefore = root.insertBefore.bind(root);

  root.appendChild = (node) => {
    context.trackInjectedNode(node);
    return originalAppendChild(node);
  };

  root.insertBefore = (node, referenceNode) => {
    context.trackInjectedNode(node);
    return originalInsertBefore(node, referenceNode);
  };

  try {
    const value = callback();
    for (const child of Array.from(root.children)) {
      if (!beforeChildren.has(child)) {
        context.trackInjectedNode(child);
      }
    }
    return value;
  } finally {
    root.appendChild = originalAppendChild;
    root.insertBefore = originalInsertBefore;
  }
}

export function normalizeToolExecution(toolModule, capability = {}, { slug = '', root, context } = {}) {
  const { target, mode } = resolveTarget(toolModule, capability, slug);
  const hasDestroy = typeof target?.destroy === 'function';
  let instance = null;

  async function create() {
    if (typeof target?.create === 'function') {
      instance = await target.create(root, context?.manifest, context);
    } else {
      instance = { root, context };
    }

    return instance;
  }

  async function init() {
    if (capability?.needsDOMReady) {
      await safeInitScheduler();
    }

    if (typeof target?.init === 'function') {
      return withDomTracking(root, context, async () => {
        const initValue = await target.init(instance ?? context, root, context?.manifest, context);
        if (mode === 'modern.lifecycle' && typeof target?.runTool === 'function') {
          await target.runTool(instance ?? context, root, context?.manifest, context);
        }
        return initValue;
      });
    }

    if (typeof target?.runTool === 'function' && mode !== 'legacy.runTool.execution-only') {
      return withDomTracking(root, context, () => target.runTool(root, context?.manifest, context));
    }

    return undefined;
  }

  async function destroy() {
    if (typeof target?.destroy === 'function') {
      await target.destroy(instance ?? context, root, context?.manifest, context);
    }

    await context?.destroy?.();
  }

  return {
    create,
    init,
    destroy,
    metadata: {
      mode,
      autoDestroyGenerated: !hasDestroy,
      normalized: true
    }
  };
}
