import { safeInitScheduler } from './safe-init-scheduler.js';
import { createRuntimeLogger } from './runtime-logger.js';

const logger = createRuntimeLogger({ source: 'tool-execution-normalizer' });

function shouldGuardLifecycleDiagnostics() {
  return Boolean(import.meta?.env?.DEV || window.ToolNexusLogging?.runtimeDebugEnabled === true);
}

function isValidLifecycleResultShape(result) {
  if (!result || typeof result !== 'object') {
    return false;
  }

  const hasMountedFlag = typeof result.mounted === 'boolean';
  const hasValidCleanup = result.cleanup === undefined || typeof result.cleanup === 'function';
  return hasMountedFlag && hasValidCleanup;
}

export function guardInvalidLifecycleResult(result, { slug = 'unknown', mode = 'unknown', phase = 'mount' } = {}) {
  if (!shouldGuardLifecycleDiagnostics() || isValidLifecycleResultShape(result)) {
    return;
  }

  const diagnostics = {
    toolSlug: slug,
    lifecycleMode: mode,
    phase,
    returnedObject: result,
    stack: result?.stack ?? new Error('[ToolRuntimeGuard] Lifecycle result stack capture').stack
  };

  console.error('[ToolRuntimeGuard] Invalid lifecycle result detected', diagnostics);
  logger.error('[ToolRuntimeGuard] Invalid lifecycle result detected', diagnostics);
}

function toCandidates(toolModule) {
  return [toolModule, toolModule?.default, toolModule?.lifecycle, toolModule?.default?.lifecycle].filter(Boolean);
}

function toRuntimeType(value) {
  if (value === 'execution' || value === 'mount') {
    return value;
  }

  return null;
}

function resolveExplicitRuntimeType(target, capability = {}, context = {}) {
  const candidates = [
    target?.toolRuntimeType,
    target?.runtime?.toolRuntimeType,
    capability?.toolRuntimeType,
    context?.manifest?.toolRuntimeType
  ];

  for (const candidate of candidates) {
    const runtimeType = toRuntimeType(candidate);
    if (runtimeType) {
      return runtimeType;
    }
  }

  return null;
}

function resolveTarget(toolModule, capability = {}, slug = '', context = {}) {
  const candidates = toCandidates(toolModule);
  const target = candidates.find((candidate) =>
    ['create', 'init', 'destroy'].every((method) => typeof candidate?.[method] === 'function'));

  if (target) {
    return { target, mode: 'modern.lifecycle' };
  }

  const runToolTarget = candidates.find((candidate) => typeof candidate?.runTool === 'function');
  if (runToolTarget) {
    const explicitRuntimeType = resolveExplicitRuntimeType(runToolTarget, capability, context);
    const executionLikeRunTool = explicitRuntimeType
      ? explicitRuntimeType === 'execution'
      : Number(runToolTarget.runTool.length ?? 0) >= 2;

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
    return resolveTarget(registryTarget, capability, '', context);
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
  const { target, mode } = resolveTarget(toolModule, capability, slug, context);
  logger.debug('Execution target normalized.', { slug, mode });
  const hasDestroy = typeof target?.destroy === 'function';
  let instance = null;

  async function create() {
    if (typeof target?.create === 'function') {
      logger.debug('Invoking normalized create lifecycle.', { slug, mode });
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
      logger.debug('Invoking normalized init lifecycle.', { slug, mode });
      return withDomTracking(root, context, async () => {
        if (shouldGuardLifecycleDiagnostics()) {
          console.debug('[Runtime] lifecycle init context', context);
        }

        if (!(root instanceof Element)) {
          throw new Error('[Runtime] lifecycle init requires DOM root');
        }

        const lifecycleContext = instance ?? context;
        let initValue;
        try {
          initValue = await target.init(lifecycleContext, root, context?.manifest, context);
        } catch (error) {
          const canRetryWithRootFirst = !(lifecycleContext instanceof Element) && (root instanceof Element);
          if (!canRetryWithRootFirst) {
            throw error;
          }

          logger.warn('Retrying normalized init with root-first signature.', {
            slug,
            mode,
            originalError: error?.message ?? String(error)
          });
          initValue = await target.init(root, context?.manifest, context);
        }

        return initValue;
      });
    }

    if (typeof target?.runTool === 'function' && mode !== 'legacy.runTool.execution-only') {
      logger.debug('Invoking normalized runTool lifecycle.', { slug, mode });
      return withDomTracking(root, context, () => target.runTool(root, context?.manifest, context));
    }

    return undefined;
  }

  async function destroy() {
    if (typeof target?.destroy === 'function') {
      logger.debug('Invoking normalized destroy lifecycle.', { slug, mode });
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
