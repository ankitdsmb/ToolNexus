import { importRuntimeModule, validateRuntimeModulePath } from './runtime-import-integrity.js';
import { loadToolIndex, resolveTool } from './tool-index-service.js';
import { runtimeModuleLoaderScheduler } from './module-loader-scheduler.js';
import { validateToolCertification } from './tool-certification-policy.js';

const moduleCache = new Map();
const loadPromises = new Map();

function ensureCompatibleAbi(descriptor, runtimeAbi) {
  if (!descriptor?.abi || !runtimeAbi) {
    return true;
  }

  return String(descriptor.abi) === String(runtimeAbi);
}

export async function loadToolModule(toolId, options = {}) {
  const slug = String(toolId ?? '').trim();
  if (!slug) {
    throw new Error('[ToolModuleLoader] toolId is required.');
  }

  await loadToolIndex();

  if (moduleCache.has(slug)) {
    return moduleCache.get(slug);
  }

  if (loadPromises.has(slug)) {
    return loadPromises.get(slug);
  }

  const descriptor = resolveTool(slug);
  if (!descriptor?.module) {
    throw new Error(`[ToolModuleLoader] Tool descriptor missing for "${slug}".`);
  }

  const runtimeAbi = options.runtimeAbi ?? null;
  if (!ensureCompatibleAbi(descriptor, runtimeAbi)) {
    throw new Error(`[ToolModuleLoader] ABI mismatch for "${slug}" (tool=${descriptor.abi}; runtime=${runtimeAbi}).`);
  }

  const certValidation = validateToolCertification(slug, {
    runtimeAbi,
    allowedTiers: options.allowedCertificationTiers
  });
  if (!certValidation.valid) {
    throw new Error(`[ToolModuleLoader] Certification validation failed for "${slug}": ${certValidation.reason}`);
  }

  const loadPromise = runtimeModuleLoaderScheduler.scheduleLoad(
    slug,
    async () => {
      const validation = await validateRuntimeModulePath(descriptor.module);
      if (!validation.valid) {
        throw new Error(`[RuntimeImportIntegrity] Invalid modulePath: ${descriptor.module} (${validation.reason ?? 'unknown_reason'})`);
      }

      const module = await importRuntimeModule(descriptor.module);
      moduleCache.set(slug, module);
      return module;
    },
    { priority: Number.isFinite(options.priority) ? options.priority : descriptor.warmupPriority }
  ).finally(() => {
    loadPromises.delete(slug);
  });

  loadPromises.set(slug, loadPromise);
  return loadPromise;
}

export function hasLoadedToolModule(toolId) {
  return moduleCache.has(String(toolId ?? '').trim());
}

export function __resetToolModuleLoaderForTests() {
  moduleCache.clear();
  loadPromises.clear();
}
