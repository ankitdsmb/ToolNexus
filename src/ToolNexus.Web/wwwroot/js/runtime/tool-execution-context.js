import { createRuntimeMigrationLogger } from './runtime-migration-logger.js';

export function createToolExecutionContext({ slug, root, manifest, dependencies = [], adapters = {} } = {}) {
  const cleanupCallbacks = [];
  const listeners = [];
  const timers = new Set();
  const intervals = new Set();
  const observers = new Set();
  const injectedNodes = new Set();
  const logger = createRuntimeMigrationLogger({ channel: 'runtime' });
  let destroyed = false;

  function safeDispose(candidate) {
    if (!candidate || typeof candidate.dispose !== 'function') {
      return;
    }

    try {
      candidate.dispose();
    } catch {
      // Monaco/editor disposal is best-effort and must remain silent.
    }
  }

  function cleanupEditorReferences() {
    safeDispose(context.editor);
    safeDispose(context.monacoEditor);

    if (context.refs instanceof Map) {
      for (const [key, value] of context.refs.entries()) {
        if (typeof key === 'string' && /editor/i.test(key)) {
          safeDispose(value);
          context.refs.set(key, null);
          continue;
        }

        if (typeof key === 'string' && /container/i.test(key)) {
          context.refs.set(key, null);
        }
      }
    }

    context.editor = null;
    context.monacoEditor = null;
    context.editorContainer = null;
    context.monacoContainer = null;
  }

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
      if (destroyed) {
        return;
      }

      destroyed = true;

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

      cleanupEditorReferences();
      context.refs.clear();
    }
  };

  return context;
}
