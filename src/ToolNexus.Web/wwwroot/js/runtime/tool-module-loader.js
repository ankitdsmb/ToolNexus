import { importRuntimeModule, validateRuntimeModulePath } from './runtime-import-integrity.js';
import { resolveTool, resolveToolModule } from './tool-index.js';

const moduleCache = new Map();
const loadPromises = new Map();

export async function loadToolModule(toolId) {
  const slug = String(toolId ?? '').trim();
  if (!slug) {
    throw new Error('[ToolModuleLoader] toolId is required.');
  }

  if (moduleCache.has(slug)) {
    return moduleCache.get(slug);
  }

  if (loadPromises.has(slug)) {
    return loadPromises.get(slug);
  }

  const descriptor = resolveTool(slug);
  const modulePath = resolveToolModule(slug);
  if (!descriptor || !modulePath) {
    throw new Error(`[ToolModuleLoader] Tool descriptor missing for "${slug}".`);
  }

  const loadPromise = (async () => {
    const validation = await validateRuntimeModulePath(modulePath);
    if (!validation.valid) {
      throw new Error(`[RuntimeImportIntegrity] Invalid modulePath: ${modulePath} (${validation.reason ?? 'unknown_reason'})`);
    }

    const module = await importRuntimeModule(modulePath);
    moduleCache.set(slug, module);
    loadPromises.delete(slug);
    return module;
  })().catch((error) => {
    loadPromises.delete(slug);
    throw error;
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
