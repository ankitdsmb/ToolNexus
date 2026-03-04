const TOOL_INDEX_URL = '/tool-index.json';
const EMPTY_INDEX = Object.freeze({
  version: '1.0',
  runtimeAbi: null,
  tools: Object.freeze({})
});

let cachedIndex = null;
let loadPromise = null;

function normalizeToolIndex(payload) {
  if (!payload || typeof payload !== 'object') {
    return EMPTY_INDEX;
  }

  const tools = payload.tools && typeof payload.tools === 'object'
    ? payload.tools
    : {};

  return {
    version: String(payload.version ?? EMPTY_INDEX.version),
    runtimeAbi: payload.runtimeAbi ?? EMPTY_INDEX.runtimeAbi,
    tools
  };
}

export async function loadToolIndex() {
  if (cachedIndex) {
    return cachedIndex;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const response = await fetch(TOOL_INDEX_URL, {
          headers: { Accept: 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`tool index request failed (${response.status})`);
        }

        const payload = await response.json();
        cachedIndex = normalizeToolIndex(payload);
      } catch (error) {
        console.warn('[ToolIndex] Failed to load tool index. Falling back to manifest discovery.', {
          message: error?.message ?? String(error)
        });
        cachedIndex = EMPTY_INDEX;
      }

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

export function resolveToolModule(toolId) {
  return resolveTool(toolId)?.module ?? null;
}

export function __resetToolIndexForTests() {
  cachedIndex = null;
  loadPromise = null;
}
