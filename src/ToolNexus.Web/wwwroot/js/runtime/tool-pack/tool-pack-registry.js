const PACK_CACHE_KEY = '__toolNexusToolPackCache';
const PACK_TOOL_REGISTRY_KEY = '__toolNexusToolPackToolRegistry';

function resolveGlobalScope() {
  if (typeof window !== 'undefined') {
    return window;
  }

  return globalThis;
}

function getPackCache() {
  const scope = resolveGlobalScope();
  if (!(scope[PACK_CACHE_KEY] instanceof Map)) {
    scope[PACK_CACHE_KEY] = new Map();
  }

  return scope[PACK_CACHE_KEY];
}

function getToolRegistry() {
  const scope = resolveGlobalScope();
  if (!(scope[PACK_TOOL_REGISTRY_KEY] instanceof Map)) {
    scope[PACK_TOOL_REGISTRY_KEY] = new Map();
  }

  return scope[PACK_TOOL_REGISTRY_KEY];
}

function normalizeToolPackExport(packModule) {
  if (!packModule || typeof packModule !== 'object') {
    return {};
  }

  const preferredExport = packModule.tools ?? packModule.default ?? packModule;
  if (!preferredExport || typeof preferredExport !== 'object') {
    return {};
  }

  return preferredExport;
}

function normalizeToolEntry(entry) {
  if (typeof entry === 'string') {
    return { modulePath: entry };
  }

  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const modulePath = typeof entry.modulePath === 'string'
    ? entry.modulePath
    : (typeof entry.module === 'string' ? entry.module : null);

  return modulePath
    ? { ...entry, modulePath, module: modulePath }
    : null;
}

export function registerToolPack(packName, packModule) {
  const normalizedPackName = String(packName ?? '').trim();
  if (!normalizedPackName) {
    throw new Error('[ToolPackRegistry] packName is required.');
  }

  const cache = getPackCache();
  const toolRegistry = getToolRegistry();
  cache.set(normalizedPackName, packModule);

  const exportedTools = normalizeToolPackExport(packModule);
  for (const [slug, entry] of Object.entries(exportedTools)) {
    const normalizedEntry = normalizeToolEntry(entry);
    if (!normalizedEntry) {
      continue;
    }

    toolRegistry.set(String(slug).trim(), {
      ...normalizedEntry,
      pack: normalizedPackName
    });
  }

  return packModule;
}

export function isToolPackRegistered(packName) {
  return getPackCache().has(String(packName ?? '').trim());
}

export function resolveToolFromPackRegistry(slug) {
  return getToolRegistry().get(String(slug ?? '').trim()) ?? null;
}

export function __resetToolPackRegistryForTests() {
  getPackCache().clear();
  getToolRegistry().clear();
}
