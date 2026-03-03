import { safeInitScheduler } from './safe-init-scheduler.js';
import { createRuntimeLogger } from './runtime-logger.js';

const logger = createRuntimeLogger({ source: 'tool-execution-normalizer' });
const LIFECYCLE_SIGNATURE_ERROR_CODE = 'LIFECYCLE_SIGNATURE_INVALID';
const GLOBAL_MUTATION_ALLOWLIST = new Set([
  '__toolnexus_monaco_registry',
  '__toolnexus_monaco_instances',
  '__toolnexus_allowlist_cache'
]);
let hasLoggedInitContextInjected = false;

function shouldGuardLifecycleDiagnostics() {
  return Boolean(import.meta?.env?.DEV || window.ToolNexusLogging?.runtimeDebugEnabled === true);
}

function isDevIsolationModeEnabled() {
  return window.ToolNexusConfig?.devIsolationMode === true;
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

function createLifecycleSignatureError(slug, details = {}) {
  const error = new Error(`${LIFECYCLE_SIGNATURE_ERROR_CODE}: ${slug}`);
  error.code = LIFECYCLE_SIGNATURE_ERROR_CODE;
  error.details = {
    slug,
    ...details
  };
  return error;
}

function beginInitIsolationTracking(context) {
  const scope = typeof window === 'object' ? window : globalThis;
  const tracked = {
    timeoutIds: new Set(),
    intervalIds: new Set(),
    rafIds: new Set(),
    observerInstances: new Set()
  };

  const originals = {
    setTimeout: scope.setTimeout,
    setInterval: scope.setInterval,
    requestAnimationFrame: scope.requestAnimationFrame,
    MutationObserver: scope.MutationObserver,
    ResizeObserver: scope.ResizeObserver,
    IntersectionObserver: scope.IntersectionObserver
  };

  const wrapObserver = (OriginalObserver) => {
    if (typeof OriginalObserver !== 'function') {
      return OriginalObserver;
    }

    function WrappedObserver(...args) {
      const instance = new OriginalObserver(...args);
      tracked.observerInstances.add(instance);
      return instance;
    }

    WrappedObserver.prototype = OriginalObserver.prototype;
    Object.setPrototypeOf(WrappedObserver, OriginalObserver);
    return WrappedObserver;
  };

  if (typeof originals.setTimeout === 'function') {
    scope.setTimeout = (...args) => {
      const id = originals.setTimeout(...args);
      tracked.timeoutIds.add(id);
      return id;
    };
  }

  if (typeof originals.setInterval === 'function') {
    scope.setInterval = (...args) => {
      const id = originals.setInterval(...args);
      tracked.intervalIds.add(id);
      return id;
    };
  }

  if (typeof originals.requestAnimationFrame === 'function') {
    scope.requestAnimationFrame = (...args) => {
      const id = originals.requestAnimationFrame(...args);
      tracked.rafIds.add(id);
      return id;
    };
  }

  scope.MutationObserver = wrapObserver(originals.MutationObserver);
  scope.ResizeObserver = wrapObserver(originals.ResizeObserver);
  scope.IntersectionObserver = wrapObserver(originals.IntersectionObserver);

  if (context && typeof context === 'object') {
    context.toolIsolationTracking = tracked;
  }

  let restored = false;

  return () => {
    if (restored) {
      return;
    }

    restored = true;
    scope.setTimeout = originals.setTimeout;
    scope.setInterval = originals.setInterval;
    scope.requestAnimationFrame = originals.requestAnimationFrame;
    scope.MutationObserver = originals.MutationObserver;
    scope.ResizeObserver = originals.ResizeObserver;
    scope.IntersectionObserver = originals.IntersectionObserver;
  };
}

function cleanupTrackedInitResources(context) {
  const tracked = context?.toolIsolationTracking;
  if (!tracked) {
    return;
  }

  let clearedOrDisconnectedCount = 0;

  for (const timeoutId of tracked.timeoutIds ?? []) {
    try {
      clearTimeout(timeoutId);
      clearedOrDisconnectedCount += 1;
    } catch {
      // ignore timeout cleanup failures
    }
  }

  for (const intervalId of tracked.intervalIds ?? []) {
    try {
      clearInterval(intervalId);
      clearedOrDisconnectedCount += 1;
    } catch {
      // ignore interval cleanup failures
    }
  }

  for (const rafId of tracked.rafIds ?? []) {
    try {
      cancelAnimationFrame(rafId);
      clearedOrDisconnectedCount += 1;
    } catch {
      // ignore RAF cleanup failures
    }
  }

  for (const observer of tracked.observerInstances ?? []) {
    try {
      observer?.disconnect?.();
      clearedOrDisconnectedCount += 1;
    } catch {
      // ignore observer cleanup failures
    }
  }

  if (clearedOrDisconnectedCount > 0) {
    console.warn('[ToolIsolation] Cleared orphan timers', clearedOrDisconnectedCount);
  }

  tracked.timeoutIds?.clear?.();
  tracked.intervalIds?.clear?.();
  tracked.rafIds?.clear?.();
  tracked.observerInstances?.clear?.();
}

function validateLifecycleInitSignature(initFn, slug) {
  if (typeof initFn !== 'function') {
    return 'STRICT';
  }

  if (Number(initFn.length ?? 0) > 1) {
    logger.warn('[LifecycleNormalizer] signature mismatch; using adaptive init', {
      slug,
      declaredArity: Number(initFn.length ?? 0)
    });
    return 'ADAPTIVE';
  }

  return 'STRICT';
}

export function normalizeToolExecution(toolModule, capability = {}, { slug = '', root, context } = {}) {
  const { target, mode } = resolveTarget(toolModule, capability, slug, context);
  logger.debug('Execution target normalized.', { slug, mode });
  const hasDestroy = typeof target?.destroy === 'function';
  let instance = null;
  const __runtimeLifecycleAudit = [];
  const disposables = [];

  function registerDisposable(fn) {
    if (typeof fn === 'function') {
      disposables.push(fn);
    }
  }

  function executeDisposables() {
    for (let i = disposables.length - 1; i >= 0; i -= 1) {
      try {
        disposables[i]();
      } catch (error) {
        console.warn('[ToolIsolation] Disposable execution failed', error);
      }
    }
    disposables.length = 0;
  }

  if (context && typeof context === 'object') {
    context.registerDisposable = registerDisposable;
    context.__executeDisposables = executeDisposables;
  }

  function recordStage(stage, status, metadata = {}) {
    const entry = {
      slug,
      mode,
      stage,
      status,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    __runtimeLifecycleAudit.push(entry);
    logger.debug('[LifecycleStage]', entry);
    return entry;
  }

  function auditLifecycleCall(toolSlug, phase, payload, lifecycleMode) {
    const lifecycleRoot = payload?.root || payload?.toolRoot || payload;
    const signatureValid = Boolean(payload && typeof payload === 'object'
      && lifecycleRoot instanceof Element
      && ('executionContext' in payload)
      && ('manifest' in payload)
      && ('runtimeIdentity' in payload));

    const record = {
      slug: toolSlug,
      phase,
      hasRoot: lifecycleRoot instanceof Element,
      lifecycleMode,
      signatureValid
    };

    __runtimeLifecycleAudit.push(record);

    if (!signatureValid) {
      console.error('[LifecycleAudit] INVALID SIGNATURE', record);
    }
  }

  async function create() {
    recordStage('create', 'start');
    if (typeof target?.create === 'function') {
      logger.debug('Invoking normalized create lifecycle.', { slug, mode });
      instance = await target.create(root, context?.manifest, context);
    } else {
      instance = { root, context };
    }

    recordStage('create', 'success', { hasInstance: Boolean(instance) });

    return instance;
  }

  async function init(lifecycleContextOverride) {
    recordStage('init', 'start');
    if (capability?.needsDOMReady) {
      await safeInitScheduler();
    }

    const restoreInitIsolation = beginInitIsolationTracking(context);

    try {
      if (typeof target?.init === 'function') {
        logger.debug('Invoking normalized init lifecycle.', { slug, mode });
        return withDomTracking(root, context, async () => {
        if (shouldGuardLifecycleDiagnostics()) {
          console.debug('[Runtime] lifecycle init context', context);
        }

        if (!(root instanceof Element)) {
          throw new Error(`[RuntimeLifecycle] init called without valid root for ${slug}`);
        }

        const initSignatureMode = validateLifecycleInitSignature(target.init, slug);

        const manifest = context?.manifest;
        const safeLifecycleContext = lifecycleContextOverride ?? {
          root,
          toolRoot: root,
          manifest,
          executionContext: context,
          runtimeIdentity: context?.runtimeIdentity ?? context?.manifest?.runtimeIdentity ?? { runtimeType: 'unknown', resolutionMode: 'unknown' },
          registerDisposable
        };

        const missingContextKeys = ['root', 'toolRoot', 'manifest', 'executionContext', 'runtimeIdentity', 'registerDisposable']
          .filter((key) => !(key in (safeLifecycleContext ?? {})));

        if (missingContextKeys.length > 0) {
          throw createLifecycleSignatureError(slug, {
            reason: 'missing lifecycleContext fields',
            missingContextKeys
          });
        }

        if (!hasLoggedInitContextInjected) {
          hasLoggedInitContextInjected = true;
          console.info('[RuntimeLifecycle] init context injected');
          logger.info('[RuntimeLifecycle] init context injected', { slug, mode });
        }

        if (initSignatureMode !== 'ADAPTIVE') {
          const strictResult = await target.init(safeLifecycleContext);
          recordStage('init', 'success', { signatureMode: initSignatureMode });
          return strictResult;
        }

        const adaptiveInitAttempts = [
          {
            signature: 'init(context, root, manifest)',
            invoke: () => target.init(context, root, manifest)
          },
          {
            signature: 'init(root, manifest, context)',
            invoke: () => target.init(root, manifest, context)
          },
          {
            signature: 'init({ root, toolRoot: root, context, manifest })',
            invoke: () => target.init({ root, toolRoot: root, context, manifest })
          },
          {
            signature: 'init(root)',
            invoke: () => target.init(root)
          },
          {
            signature: 'init()',
            invoke: () => target.init()
          }
        ];

        const adaptiveErrors = [];

        for (let index = 0; index < adaptiveInitAttempts.length; index += 1) {
          const attempt = adaptiveInitAttempts[index];
          try {
            const result = await attempt.invoke();
            logger.warn('[LifecycleNormalizer] adaptive init path used', {
              slug,
              attemptIndex: index + 1,
              successfulSignature: attempt.signature
            });
            recordStage('init', 'success', {
              signatureMode: 'ADAPTIVE',
              attemptIndex: index + 1,
              successfulSignature: attempt.signature
            });
            return result;
          } catch (error) {
            adaptiveErrors.push({
              attemptIndex: index + 1,
              signature: attempt.signature,
              message: error?.message
            });
          }
        }

        const adaptiveError = createLifecycleSignatureError(slug, {
          reason: 'adaptive init attempts failed',
          attempts: adaptiveErrors
        });
        recordStage('init', 'failed', {
          reason: adaptiveError?.message,
          signatureMode: 'ADAPTIVE'
        });
        throw adaptiveError;
      });
      }

      if (typeof target?.runTool === 'function' && mode !== 'legacy.runTool.execution-only') {
        logger.debug('Invoking normalized runTool lifecycle.', { slug, mode });
        const runToolResult = withDomTracking(root, context, () => target.runTool(root, context?.manifest, context));
        recordStage('init', 'success', { signatureMode: 'runTool' });
        return runToolResult;
      }

      recordStage('init', 'success', { signatureMode: 'none' });

      return undefined;
    } finally {
      restoreInitIsolation();
    }
  }

  async function destroy() {
    recordStage('destroy', 'start');
    try {
      if (typeof target?.destroy === 'function') {
        logger.debug('Invoking normalized destroy lifecycle.', { slug, mode });
        await target.destroy(instance ?? context, root, context?.manifest, context);
      }
    } finally {
      context?.__executeDisposables?.();
      cleanupTrackedInitResources(context);
    }

    await context?.destroy?.();

    if (isDevIsolationModeEnabled()) {
      const preInitWindowKeys = context?.__preInitWindowKeys;
      if (preInitWindowKeys instanceof Set) {
        const postDestroyKeys = new Set(Object.getOwnPropertyNames(window));
        const addedKeys = [];

        for (const key of postDestroyKeys) {
          if (!preInitWindowKeys.has(key) && !GLOBAL_MUTATION_ALLOWLIST.has(key)) {
            addedKeys.push(key);
          }
        }

        if (addedKeys.length > 0) {
          console.warn('[ToolIsolation] Global window pollution detected', { addedKeys });
        }
      }
    }

    recordStage('destroy', 'success');
  }

  const normalized = {
    create,
    init,
    destroy,
    metadata: {
      mode,
      autoDestroyGenerated: !hasDestroy,
      normalized: true,
      lifecycleStages: __runtimeLifecycleAudit
    }
  };

  const originalInit = normalized.init;
  normalized.init = async () => {
    const safeLifecycleContext = {
      root,
      toolRoot: root,
      manifest: context?.manifest,
      executionContext: context,
      runtimeIdentity: context?.runtimeIdentity ?? context?.manifest?.runtimeIdentity ?? { runtimeType: 'unknown', resolutionMode: 'unknown' },
      registerDisposable
    };

    auditLifecycleCall(slug, 'init', safeLifecycleContext, mode);
    try {
      return await originalInit(safeLifecycleContext);
    } catch (error) {
      recordStage('init', 'failed', { reason: error?.message ?? String(error) });
      throw error;
    }
  };

  window.ToolNexusLifecycleAudit = () => {
    console.table(__runtimeLifecycleAudit);
    return [...__runtimeLifecycleAudit];
  };

  return normalized;
}
