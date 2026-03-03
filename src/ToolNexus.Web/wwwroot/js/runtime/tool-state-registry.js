import { runtimeObserver } from './runtime-observer.js';

const RUNTIME_CLEANUP_KEY = '__toolNexusRuntimeCleanup';

let activeRegistry = null;
let cleanupInFlight = null;

function resolveToolRoot() {
  return document.getElementById('tool-root');
}

async function runActiveToolDestroy() {
  const root = resolveToolRoot();
  const destroy = root?.[RUNTIME_CLEANUP_KEY];
  if (typeof destroy !== 'function') {
    return;
  }

  // Prevent duplicate destroy execution from concurrent calls.
  delete root[RUNTIME_CLEANUP_KEY];

  try {
    await destroy();
  } catch {
    // cleanup is best-effort and must remain silent
  }
}

function installGlobalCleanupHook() {
  if (typeof window === 'undefined') {
    return;
  }

  window.ToolNexusRuntimeCleanup = async function ToolNexusRuntimeCleanup() {
    if (cleanupInFlight) {
      return cleanupInFlight;
    }

    cleanupInFlight = (async () => {
      await runActiveToolDestroy();
      runtimeObserver?.clear?.();
      activeRegistry?.reset?.();
    })();

    try {
      await cleanupInFlight;
    } finally {
      cleanupInFlight = null;
    }
  };
}

export function createToolStateRegistry() {
  const records = new Map();

  function createKey(slug, root) {
    const rootKey = root?.dataset?.toolRootId || root?.id || 'root';
    return `${slug}:${rootKey}`;
  }

  const registry = {
    register({ slug, root, compatibilityMode = 'modern' }) {
      const key = createKey(slug, root);
      if (records.has(key)) {
        return { key, duplicate: true, state: records.get(key) };
      }

      const state = {
        slug,
        lifecyclePhase: 'created',
        compatibilityMode,
        failureReason: null,
        retries: 0,
        mounted: false
      };

      records.set(key, state);
      return { key, duplicate: false, state };
    },
    setPhase(key, phase) {
      const state = records.get(key);
      if (state) {
        state.lifecyclePhase = phase;
        state.mounted = phase === 'mounted';
      }
    },
    incrementRetry(key) {
      const state = records.get(key);
      if (state) {
        state.retries += 1;
      }
    },
    setFailure(key, reason) {
      const state = records.get(key);
      if (state) {
        state.failureReason = reason;
        state.lifecyclePhase = 'failed';
      }
    },
    clear(key) {
      records.delete(key);
    },
    reset() {
      records.clear();
    },
    get(key) {
      return records.get(key) ?? null;
    },
    summary() {
      const states = Array.from(records.values());
      return {
        mountedTools: states.filter((item) => item.mounted).length,
        compatibilityModeUsage: states.reduce((acc, item) => {
          acc[item.compatibilityMode] = (acc[item.compatibilityMode] || 0) + 1;
          return acc;
        }, {}),
        failedTools: states.filter((item) => item.lifecyclePhase === 'failed').length,
        total: states.length
      };
    }
  };

  activeRegistry = registry;
  installGlobalCleanupHook();

  return registry;
}
