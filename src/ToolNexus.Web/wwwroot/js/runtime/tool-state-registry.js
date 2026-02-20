export function createToolStateRegistry() {
  const records = new Map();

  function createKey(slug, root) {
    const rootKey = root?.dataset?.toolRootId || root?.id || 'root';
    return `${slug}:${rootKey}`;
  }

  return {
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
}
