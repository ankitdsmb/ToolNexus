export function createToolExecutionContext({ slug, root, manifest, dependencies = [] } = {}) {
  const cleanupCallbacks = [];
  const listeners = [];
  const timers = new Set();

  const context = {
    slug,
    root,
    manifest,
    dependencies,
    mountTimestamp: new Date().toISOString(),
    cleanupCallbacks,
    listeners,
    refs: new Map(),
    addCleanup(callback) {
      if (typeof callback === 'function') {
        cleanupCallbacks.push(callback);
      }
    },
    addEventListener(target, type, handler, options) {
      if (!target?.addEventListener || typeof handler !== 'function') {
        return () => {};
      }

      target.addEventListener(type, handler, options);
      const entry = { target, type, handler, options };
      listeners.push(entry);

      return () => {
        target.removeEventListener(type, handler, options);
        const index = listeners.indexOf(entry);
        if (index >= 0) {
          listeners.splice(index, 1);
        }
      };
    },
    trackTimeout(timeoutId) {
      if (timeoutId !== undefined && timeoutId !== null) {
        timers.add(timeoutId);
      }
      return timeoutId;
    },
    async destroy() {
      while (cleanupCallbacks.length > 0) {
        const callback = cleanupCallbacks.pop();
        await callback?.();
      }

      while (listeners.length > 0) {
        const listener = listeners.pop();
        listener?.target?.removeEventListener?.(listener.type, listener.handler, listener.options);
      }

      for (const timeoutId of timers) {
        clearTimeout(timeoutId);
      }
      timers.clear();
      context.refs.clear();
    }
  };

  return context;
}
