import { createRuntimeMigrationLogger } from './runtime-migration-logger.js';
import { normalizeToolExecution } from './tool-execution-normalizer.js';

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

async function invokeFirst(candidates, methods, ...args) {
  for (const candidate of candidates) {
    for (const method of methods) {
      if (typeof candidate?.[method] === 'function') {
        if (method === 'runTool') {
          const manifestRuntimeType = args?.[1]?.toolRuntimeType;
          const explicitRuntimeType = candidate?.toolRuntimeType ?? candidate?.runtime?.toolRuntimeType ?? manifestRuntimeType;
          const isExecutionOnly = explicitRuntimeType === 'execution' || Number(candidate[method].length ?? 0) >= 2;
          if (isExecutionOnly) {
            continue;
          }
        }

        const value = await candidate[method](...args);
        return { invoked: true, candidate, method, value };
      }
    }
  }

  return { invoked: false, candidate: null, method: null, value: undefined };
}

export function inspectLifecycleContract(module) {
  const candidates = toCandidates(module);

  const compliant = candidates.some((candidate) =>
    ['create', 'init', 'destroy'].every((method) => typeof candidate?.[method] === 'function'));

  return {
    compliant,
    candidates: candidates.length,
    supportsMount: candidates.some((candidate) => typeof candidate?.mount === 'function'),
    supportsCreateInit: candidates.some((candidate) =>
      typeof candidate?.create === 'function' && typeof candidate?.init === 'function')
  };
}

async function mountNormalizedLifecycle({ module, slug, root, manifest, context, capabilities }) {
  const normalized = normalizeToolExecution(module, capabilities, { slug, root, context });
  await normalized.create();
  await normalized.init();

  const normalizedMode = normalized.metadata.mode === 'modern.lifecycle'
    ? 'module.lifecycle-contract'
    : normalized.metadata.mode;

  const executionOnly = normalized.metadata.mode === 'legacy.runTool.execution-only';

  return toLifecycleResult({
    mounted: !executionOnly && normalized.metadata.mode !== 'none',
    cleanup: normalized.destroy,
    mode: normalizedMode,
    normalized: normalized.metadata.normalized,
    autoDestroyGenerated: normalized.metadata.autoDestroyGenerated
  });
}

async function tryLegacyFallback({ slug, root, manifest, context, capabilities }) {
  const legacyModule = window.ToolNexusModules?.[slug] ?? {};
  const normalized = normalizeToolExecution(legacyModule, capabilities, { slug, root, context });

  if (normalized.metadata.mode !== 'none') {
    await normalized.create();
    await normalized.init();
    const executionOnly = normalized.metadata.mode === 'legacy.runTool.execution-only';
    return toLifecycleResult({
      mounted: !executionOnly,
      cleanup: normalized.destroy,
      mode: `window.${normalized.metadata.mode}`,
      normalized: true,
      autoDestroyGenerated: normalized.metadata.autoDestroyGenerated
    });
  }

  const globalResult = await invokeFirst([window], ['runTool', 'init'], root, manifest);
  if (globalResult.invoked) {
    return toLifecycleResult({ mounted: true, cleanup: context?.destroy?.bind(context), mode: 'window.global', normalized: true, autoDestroyGenerated: true });
  }

  return toLifecycleResult();
}

export async function mountToolLifecycle({ module, slug, root, manifest, context, capabilities }) {
  const logger = createRuntimeMigrationLogger({ channel: 'lifecycle' });

  const normalizedResult = await mountNormalizedLifecycle({ module, slug, root, manifest, context, capabilities });
  if (normalizedResult.mode !== 'none') {
    logger.info(`Mounted normalized lifecycle for "${slug}" via ${normalizedResult.mode}.`);
    return normalizedResult;
  }

  if (typeof window.ToolNexusKernel?.initialize === 'function') {
    logger.info(`Using ToolNexusKernel.initialize fallback for "${slug}".`);
    await window.ToolNexusKernel.initialize({ slug, root, manifest, module });
    return toLifecycleResult({ mounted: true, cleanup: context?.destroy?.bind(context), mode: 'kernel.initialize', normalized: false, autoDestroyGenerated: true });
  }

  logger.warn(`No modern lifecycle found for "${slug}". Switching to legacy fallback.`);
  return tryLegacyFallback({ slug, root, manifest, context, capabilities });
}

export async function legacyAutoInit({ slug, root, manifest, context, capabilities }) {
  const result = await tryLegacyFallback({ slug, root, manifest, context, capabilities });
  return toLifecycleResult({
    mounted: result.mounted,
    cleanup: result.cleanup,
    mode: result.mounted ? 'legacy.auto-init' : 'none',
    normalized: result.normalized,
    autoDestroyGenerated: result.autoDestroyGenerated
  });
}
