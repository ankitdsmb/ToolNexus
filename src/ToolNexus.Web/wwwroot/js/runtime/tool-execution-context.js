import { createRuntimeMigrationLogger } from './runtime-migration-logger.js';

export function createToolExecutionContext({ slug, root, manifest, dependencies = [], adapters = {} } = {}) {
  const cleanupCallbacks = [];
  const listeners = [];
  const timers = new Set();
  const intervals = new Set();
  const observers = new Set();
  const injectedNodes = new Set();
  const logger = createRuntimeMigrationLogger({ channel: 'runtime' });

  const context = {
    slug,
    root,
    manifest,
    dependencies,
    logger,
    mountTimestamp: new Date().toISOString(),
    cleanupCallbacks,
    listeners,
    eventRegistry: listeners,
    cleanupRegistry: cleanupCallbacks,
    refs: new Map(),
    adapters,
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
    trackInterval(intervalId) {
      if (intervalId !== undefined && intervalId !== null) {
        intervals.add(intervalId);
      }
      return intervalId;
    },
    trackObserver(observer) {
      if (observer?.disconnect) {
        observers.add(observer);
      }
      return observer;
    },
    trackInjectedNode(node) {
      if (node?.parentNode) {
        injectedNodes.add(node);
      }
      return node;
    },
    getCleanupSnapshot() {
      return {
        listeners: listeners.length,
        cleanupCallbacks: cleanupCallbacks.length,
        timers: timers.size,
        intervals: intervals.size,
        observers: observers.size,
        injectedNodes: injectedNodes.size
      };
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

      for (const intervalId of intervals) {
        clearInterval(intervalId);
      }
      intervals.clear();

      for (const observer of observers) {
        observer?.disconnect?.();
      }
      observers.clear();

      for (const node of injectedNodes) {
        if (node?.parentNode) {
          node.parentNode.removeChild(node);
        }
      }
      injectedNodes.clear();

      context.refs.clear();
    }
  };

  return context;
}
