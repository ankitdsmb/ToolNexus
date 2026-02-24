import { createRuntimeLogger } from './runtime-logger.js';

const logger = createRuntimeLogger({ source: 'legacy-execution-bridge' });

let initializedRoots = new WeakMap();

function isInitialized(root, slug) {
  return initializedRoots.get(root)?.has(slug) === true;
}

function markInitialized(root, slug) {
  const slugs = initializedRoots.get(root) ?? new Set();
  slugs.add(slug);
  initializedRoots.set(root, slugs);
}

function unmarkInitialized(root, slug) {
  const slugs = initializedRoots.get(root);
  if (!slugs) {
    return;
  }

  slugs.delete(slug);
  if (slugs.size === 0) {
    initializedRoots.delete(root);
  }
}

function callLegacyMethod(candidate, method, root, context) {
  if (typeof candidate?.[method] !== 'function') {
    return { invoked: false, value: undefined };
  }

  if (method === 'runTool') {
    const explicitRuntimeType = candidate?.toolRuntimeType ?? candidate?.runtime?.toolRuntimeType ?? context?.manifest?.toolRuntimeType;
    const isExecutionOnly = explicitRuntimeType === 'execution' || Number(candidate[method].length ?? 0) >= 2;
    if (isExecutionOnly) {
      return { invoked: false, value: undefined, skipped: true };
    }
  }

  const fn = candidate[method];
  const value = fn.length > 1 ? fn(root, context) : fn(root);
  return { invoked: true, value };
}

function invokeLegacy(candidate, root, context) {
  if (!candidate) {
    return { invoked: false, cleanup: undefined, mode: 'none' };
  }

  const runToolResult = callLegacyMethod(candidate, 'runTool', root, context);
  if (runToolResult.invoked) {
    return {
      invoked: true,
      cleanup: typeof candidate.destroy === 'function' ? () => candidate.destroy(runToolResult.value, root, context) : undefined,
      mode: 'runTool'
    };
  }

  const initResult = callLegacyMethod(candidate, 'init', root, context);
  if (initResult.invoked) {
    return {
      invoked: true,
      cleanup: typeof candidate.destroy === 'function' ? () => candidate.destroy(initResult.value, root, context) : undefined,
      mode: 'init'
    };
  }

  return { invoked: false, cleanup: undefined, mode: 'none' };
}

export async function legacyExecuteTool({ slug, root, module, context } = {}) {
  if (!root || !slug) {
    logger.warn('Legacy execution skipped due to invalid context.', { slug });
    return { mounted: false, mode: 'invalid-context', cleanup: undefined, alreadyInitialized: false };
  }

  if (isInitialized(root, slug)) {
    logger.debug('Legacy execution lock detected.', { slug });
    return { mounted: true, mode: 'locked', cleanup: undefined, alreadyInitialized: true };
  }

  const candidates = [module, module?.default, module?.lifecycle, module?.default?.lifecycle].filter(Boolean);
  for (const candidate of candidates) {
    const result = invokeLegacy(candidate, root, context);
    if (result.invoked) {
      markInitialized(root, slug);
      logger.info('Legacy module execution path resolved.', { slug, mode: result.mode });
      return { mounted: true, mode: `module.${result.mode}`, cleanup: result.cleanup, alreadyInitialized: false };
    }
  }

  const globalResult = invokeLegacy(window, root, context);
  if (globalResult.invoked) {
    markInitialized(root, slug);
    logger.info('Legacy window execution path resolved.', { slug, mode: globalResult.mode });
    return { mounted: true, mode: `window.${globalResult.mode}`, cleanup: globalResult.cleanup, alreadyInitialized: false };
  }

  const registryCandidate = window.ToolNexusModules?.[slug];
  const registryResult = invokeLegacy(registryCandidate, root, context);
  if (registryResult.invoked) {
    markInitialized(root, slug);
    logger.info('Legacy registry execution path resolved.', { slug, mode: registryResult.mode });
    return { mounted: true, mode: `registry.${registryResult.mode}`, cleanup: registryResult.cleanup, alreadyInitialized: false };
  }

  logger.warn('No legacy execution path resolved.', { slug });
  return { mounted: false, mode: 'none', cleanup: undefined, alreadyInitialized: false };
}

export function releaseLegacyInitialization(root, slug) {
  unmarkInitialized(root, slug);
}

export function resetLegacyBridgeForTesting() {
  initializedRoots = new WeakMap();
}
