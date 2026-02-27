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
  await normalized.init();

  const normalizedMode = normalized.metadata.mode === 'modern.lifecycle'
    ? 'module.lifecycle-contract'
    : normalized.metadata.mode;

  const executionOnly = normalized.metadata.mode === 'legacy.runTool.execution-only';

  const lifecycleResult = toLifecycleResult({
    mounted: !executionOnly && normalized.metadata.mode !== 'none',
    cleanup: normalized.destroy,
    mode: normalizedMode,
    normalized: normalized.metadata.normalized,
    autoDestroyGenerated: normalized.metadata.autoDestroyGenerated
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
  const normalizedResult = await mountNormalizedLifecycle({ module, slug, root, manifest, context, capabilities });

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
