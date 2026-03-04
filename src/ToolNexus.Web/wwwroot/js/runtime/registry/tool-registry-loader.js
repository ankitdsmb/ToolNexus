import { getBundledToolRegistryIndex } from './tool-registry-index.js';
import {
  getCachedToolRegistry,
  getCachedToolRegistryPromise,
  setCachedToolRegistry,
  setCachedToolRegistryPromise,
  resetToolRegistryCache
} from './tool-registry-cache.js';

const REGISTRY_ENDPOINT = '/tool-registry-index.json';
const LEGACY_MANIFEST_ENDPOINT = '/js/tools.manifest.json';

function normalizeToolDefinition(definition) {
  if (!definition || typeof definition !== 'object') {
    return null;
  }

  const modulePath = typeof definition.modulePath === 'string'
    ? definition.modulePath
    : typeof definition.module === 'string'
      ? definition.module
      : null;

  const pack = typeof definition.pack === 'string' ? definition.pack : null;
  const type = typeof definition.type === 'string' ? definition.type : 'module';

  if (!modulePath && !pack && type !== 'schema') {
    return null;
  }

  return {
    ...(pack ? { pack } : {}),
    ...(modulePath ? { modulePath } : {}),
    type
  };
}

function normalizeRegistry(rawRegistry) {
  if (!rawRegistry || typeof rawRegistry !== 'object') {
    return {};
  }

  const normalized = {};
  for (const [slug, definition] of Object.entries(rawRegistry)) {
    const normalizedSlug = String(slug ?? '').trim();
    if (!normalizedSlug) {
      continue;
    }

    const normalizedDefinition = normalizeToolDefinition(definition);
    if (!normalizedDefinition) {
      continue;
    }

    normalized[normalizedSlug] = normalizedDefinition;
  }

  return normalized;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`request_failed_${response.status}`);
  }

  return response.json();
}

function buildRegistryFromLegacyManifest(manifestPayload) {
  const tools = Array.isArray(manifestPayload?.tools)
    ? manifestPayload.tools
    : [];

  const registry = {};
  for (const tool of tools) {
    const slug = String(tool?.slug ?? '').trim();
    if (!slug) {
      continue;
    }

    const normalizedDefinition = normalizeToolDefinition(tool);
    if (!normalizedDefinition) {
      continue;
    }

    registry[slug] = normalizedDefinition;
  }

  return registry;
}

export async function loadToolRegistry() {
  const cachedRegistry = getCachedToolRegistry();
  if (cachedRegistry) {
    return cachedRegistry;
  }

  const cachedPromise = getCachedToolRegistryPromise();
  if (cachedPromise) {
    return cachedPromise;
  }

  const loadPromise = (async () => {
    const bundledRegistry = normalizeRegistry(getBundledToolRegistryIndex());

    try {
      const fetchedRegistryPayload = await fetchJson(REGISTRY_ENDPOINT);
      const fetchedRegistry = normalizeRegistry(fetchedRegistryPayload);
      const mergedRegistry = {
        ...bundledRegistry,
        ...fetchedRegistry
      };

      return setCachedToolRegistry(mergedRegistry);
    } catch (error) {
      try {
        const legacyManifest = await fetchJson(LEGACY_MANIFEST_ENDPOINT);
        const fallbackRegistry = buildRegistryFromLegacyManifest(legacyManifest);
        return setCachedToolRegistry({
          ...bundledRegistry,
          ...fallbackRegistry
        });
      } catch (fallbackError) {
        console.warn('[ToolRegistryLoader] Unable to load precompiled or fallback registry index.', {
          message: fallbackError?.message ?? String(fallbackError)
        });
        return setCachedToolRegistry(bundledRegistry);
      }
    }
  })();

  setCachedToolRegistryPromise(loadPromise);

  try {
    return await loadPromise;
  } finally {
    setCachedToolRegistryPromise(null);
  }
}

export function getToolDefinition(slug) {
  const normalizedSlug = String(slug ?? '').trim();
  if (!normalizedSlug) {
    return null;
  }

  const registry = getCachedToolRegistry();
  if (!registry) {
    return null;
  }

  return registry[normalizedSlug] ?? null;
}

export function __resetToolRegistryForTests() {
  resetToolRegistryCache();
}
