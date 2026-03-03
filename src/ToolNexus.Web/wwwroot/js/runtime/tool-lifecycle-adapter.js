import { createRuntimeMigrationLogger } from './runtime-migration-logger.js';
import { normalizeToolExecution, guardInvalidLifecycleResult } from './tool-execution-normalizer.js';

const EMPTY_LIFECYCLE_RESULT = Object.freeze({
  mounted: false,
  cleanup: undefined,
  mode: 'none',
  normalized: false,
  autoDestroyGenerated: false
});

function toLifecycleResult(result = {}) {
  return {
    ...EMPTY_LIFECYCLE_RESULT,
    ...result,
    mounted: Boolean(result?.mounted)
  };
}

function toCandidates(module) {
  return [
    module,
    module?.default,
    module?.lifecycle,
    module?.default?.lifecycle,
    typeof module === 'function' ? { mount: module } : null,
    typeof module?.default === 'function' ? { mount: module.default } : null
  ].filter(Boolean);
}

function disposeOrphanMonacoEditors() {
  const registry = window.__toolnexus_monaco_registry;
  const editors = registry?.editors;
  if (!(editors instanceof Set) || editors.size === 0) {
    return;
  }

  const orphanEditors = Array.from(editors);
  console.warn('[ToolIsolation] Disposing orphan Monaco editors', orphanEditors.length);

  for (const editor of orphanEditors) {
    try {
      editor.dispose();
    } catch {
      // ignore orphan editor disposal failures
    }
  }

  editors.clear();
}

function isDevIsolationModeEnabled() {
  return window.ToolNexusConfig?.devIsolationMode === true;
}

export function inspectLifecycleContract(module) {
  const candidates = toCandidates(module);

  const compliant = candidates.some((candidate) =>
    ['create', 'init', 'destroy'].every((method) => typeof candidate?.[method] === 'function'));

  const strictSignature = candidates.some((candidate) =>
    typeof candidate?.init === 'function' && Number(candidate.init.length ?? 0) === 1);

  return {
    compliant,
    strictSignature,
    candidates: candidates.length,
    supportsMount: candidates.some((candidate) => typeof candidate?.mount === 'function'),
    supportsCreateInit: candidates.some((candidate) =>
      typeof candidate?.create === 'function' && typeof candidate?.init === 'function')
  };
}

async function mountNormalizedLifecycle({ module, slug, root, manifest, context, capabilities }) {
  const normalized = normalizeToolExecution(module, capabilities, { slug, root, context });
  await normalized.create();

  try {
    if (isDevIsolationModeEnabled() && context && typeof context === 'object') {
      context.__preInitWindowKeys = new Set(Object.getOwnPropertyNames(window));
    }

    await normalized.init();
  } catch (error) {
    try {
      await normalized.destroy();
    } catch (destroyError) {
      console.error(`[RuntimeLifecycle] Destroy rollback failed for "${slug}" after init failure.`, destroyError);
    }

    const lifecycleError = new Error(`[RuntimeLifecycle] init() failed for "${slug}": ${error?.message ?? String(error)}`);
    lifecycleError.code = 'TOOL_INIT_FAILED';
    lifecycleError.stage = 'init';
    lifecycleError.slug = slug;
    lifecycleError.cause = error;
    throw lifecycleError;
  }

  const normalizedMode = normalized.metadata.mode === 'modern.lifecycle'
    ? 'module.lifecycle-contract'
    : normalized.metadata.mode;

  const executionOnly = normalized.metadata.mode === 'legacy.runTool.execution-only';

  const lifecycleResult = toLifecycleResult({
    mounted: !executionOnly && normalized.metadata.mode !== 'none',
    cleanup: async () => {
      try {
        await normalized.destroy?.();
      } finally {
        context?.__executeDisposables?.();
      }
    },
    mode: normalizedMode,
    normalized: normalized.metadata.normalized,
    autoDestroyGenerated: normalized.metadata.autoDestroyGenerated,
    trace: [...(normalized.metadata.lifecycleStages ?? [])]
  });

  guardInvalidLifecycleResult(lifecycleResult, {
    slug,
    mode: normalizedMode,
    phase: 'mountNormalizedLifecycle.result'
  });

  return lifecycleResult;
}

export async function mountToolLifecycle({ module, slug, root, manifest, context, capabilities }) {
  const logger = createRuntimeMigrationLogger({ channel: 'lifecycle' });
  let normalizedResult;
  try {
    normalizedResult = await mountNormalizedLifecycle({ module, slug, root, manifest, context, capabilities });
  } catch (error) {
    logger.error(`Failed normalized lifecycle for "${slug}" at stage "${error?.stage ?? 'unknown'}".`, {
      code: error?.code,
      message: error?.message ?? String(error),
      cause: error?.cause?.message
    });
    throw error;
  }

  if (normalizedResult.mode === 'none') {
    logger.error(`No lifecycle contract found for "${slug}".`);
  } else {
    logger.info(`Mounted normalized lifecycle for "${slug}" via ${normalizedResult.mode}.`);
  }

  return normalizedResult;
}

export async function legacyAutoInit() {
  return toLifecycleResult();
}
