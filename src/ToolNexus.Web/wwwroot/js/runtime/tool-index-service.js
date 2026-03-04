const TOOL_INDEX_URL = '/tool-index.json';
const EMPTY_INDEX = Object.freeze({
  version: '1.0',
  runtimeAbi: null,
  tools: Object.freeze({}),
  routes: Object.freeze({})
});

let cachedIndex = null;
let routeCache = new Map();
let loadPromise = null;

function normalizeToolEntry(toolId, descriptor) {
  if (!descriptor || typeof descriptor !== 'object') {
    return null;
  }

  const normalized = {
    ...descriptor,
    id: String(descriptor.id ?? toolId),
    module: typeof descriptor.module === 'string' ? descriptor.module : null,
    abi: descriptor.abi == null ? null : String(descriptor.abi),
    warmupPriority: Number.isFinite(descriptor.warmupPriority) ? descriptor.warmupPriority : 0,
    permissions: Array.isArray(descriptor.permissions) ? descriptor.permissions : []
  };

  return normalized;
}

function normalizeToolIndex(payload) {
  if (!payload || typeof payload !== 'object') {
    return EMPTY_INDEX;
  }

  const rawTools = payload.tools && typeof payload.tools === 'object' ? payload.tools : {};
  const tools = {};
  const routes = {};

  for (const [toolId, descriptor] of Object.entries(rawTools)) {
    const normalizedDescriptor = normalizeToolEntry(toolId, descriptor);
    if (!normalizedDescriptor) {
      continue;
    }

    tools[toolId] = normalizedDescriptor;

    const toolRoute = typeof normalizedDescriptor.route === 'string'
      ? normalizedDescriptor.route
      : `/${toolId}`;
    routes[toolRoute] = toolId;
  }

  return {
    version: String(payload.version ?? EMPTY_INDEX.version),
    runtimeAbi: payload.runtimeAbi == null ? null : String(payload.runtimeAbi),
    tools,
    routes
  };
}

export async function loadToolIndex() {
  if (cachedIndex) {
    return cachedIndex;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const response = await fetch(TOOL_INDEX_URL, { headers: { Accept: 'application/json' } });
        if (!response.ok) {
          throw new Error(`tool index request failed (${response.status})`);
        }

        cachedIndex = normalizeToolIndex(await response.json());
      } catch (error) {
        console.warn('[ToolIndexService] Failed to load /tool-index.json.', {
          message: error?.message ?? String(error)
        });
        cachedIndex = EMPTY_INDEX;
      }

      routeCache = new Map(Object.entries(cachedIndex.routes ?? {}));
      return cachedIndex;
    })();
  }

  return loadPromise;
}

export function resolveTool(toolId) {
  const slug = String(toolId ?? '').trim();
  if (!slug || !cachedIndex) {
    return null;
  }

  return cachedIndex.tools?.[slug] ?? null;
}

export function resolveRoute(route) {
  const normalizedRoute = String(route ?? '').trim();
  if (!normalizedRoute || !cachedIndex) {
    return null;
  }

  const toolId = routeCache.get(normalizedRoute) ?? null;
  return toolId ? resolveTool(toolId) : null;
}

export function getToolMetadata(toolId) {
  const descriptor = resolveTool(toolId);
  if (!descriptor) {
    return null;
  }

  return {
    abi: descriptor.abi,
    permissions: descriptor.permissions,
    tier: descriptor.tier,
    warmupPriority: descriptor.warmupPriority,
    certification: descriptor.certification ?? null
  };
}

export function __resetToolIndexServiceForTests() {
  cachedIndex = null;
  routeCache = new Map();
  loadPromise = null;
}
