import { safeInitScheduler } from './safe-init-scheduler.js';
import { createRuntimeLogger } from './runtime-logger.js';

const logger = createRuntimeLogger({ source: 'tool-execution-normalizer' });
const LIFECYCLE_SIGNATURE_ERROR_CODE = 'LIFECYCLE_SIGNATURE_INVALID';
let hasLoggedInitContextInjected = false;

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

function createLifecycleSignatureError(slug, details = {}) {
  const error = new Error(`${LIFECYCLE_SIGNATURE_ERROR_CODE}: ${slug}`);
  error.code = LIFECYCLE_SIGNATURE_ERROR_CODE;
  error.details = {
    slug,
    ...details
  };
  return error;
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
    if (typeof target?.create === 'function') {
      logger.debug('Invoking normalized create lifecycle.', { slug, mode });
      instance = await target.create(root, context?.manifest, context);
    } else {
      instance = { root, context };
    }

    return instance;
  }

  async function init(lifecycleContextOverride) {
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
          throw new Error(`[RuntimeLifecycle] init called without valid root for ${slug}`);
        }

        const initSignatureMode = validateLifecycleInitSignature(target.init, slug);

        const manifest = context?.manifest;
        const safeLifecycleContext = lifecycleContextOverride ?? {
          root,
          toolRoot: root,
          manifest,
          executionContext: context,
          runtimeIdentity: context?.runtimeIdentity ?? context?.manifest?.runtimeIdentity ?? { runtimeType: 'unknown', resolutionMode: 'unknown' }
        };

        const missingContextKeys = ['root', 'toolRoot', 'manifest', 'executionContext', 'runtimeIdentity']
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
          return await target.init(safeLifecycleContext);
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
            return result;
          } catch (error) {
            adaptiveErrors.push({
              attemptIndex: index + 1,
              signature: attempt.signature,
              message: error?.message
            });
          }
        }

        throw createLifecycleSignatureError(slug, {
          reason: 'adaptive init attempts failed',
          attempts: adaptiveErrors
        });
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

  const normalized = {
    create,
    init,
    destroy,
    metadata: {
      mode,
      autoDestroyGenerated: !hasDestroy,
      normalized: true
    }
  };

  const originalInit = normalized.init;
  normalized.init = async () => {
    const safeLifecycleContext = {
      root,
      toolRoot: root,
      manifest: context?.manifest,
      executionContext: context,
      runtimeIdentity: context?.runtimeIdentity ?? context?.manifest?.runtimeIdentity ?? { runtimeType: 'unknown', resolutionMode: 'unknown' }
    };

    auditLifecycleCall(slug, 'init', safeLifecycleContext, mode);
    return originalInit(safeLifecycleContext);
  };

  window.ToolNexusLifecycleAudit = () => {
    console.table(__runtimeLifecycleAudit);
    return [...__runtimeLifecycleAudit];
  };

  return normalized;
}
