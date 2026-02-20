export function createRuntimeObserver({ now } = {}) {
  const listeners = new Set();
  const timestampNow = typeof now === 'function'
    ? now
    : () => (globalThis.performance?.now?.() ?? Date.now());
  let lastTimestamp = 0;

  function nextTimestamp() {
    const current = Number(timestampNow());
    const safeCurrent = Number.isFinite(current) ? current : lastTimestamp;
    if (safeCurrent <= lastTimestamp) {
      lastTimestamp += 0.001;
      return lastTimestamp;
    }

    lastTimestamp = safeCurrent;
    return lastTimestamp;
  }

  function emit(event, payload = {}) {
    try {
      const entry = {
        event,
        timestamp: nextTimestamp(),
        toolSlug: payload.toolSlug ?? null,
        duration: payload.duration,
        error: payload.error,
        metadata: payload.metadata
      };

      const snapshot = Array.from(listeners);
      queueMicrotask(() => {
        for (const listener of snapshot) {
          try {
            listener(entry);
          } catch {
            // observability listeners must be isolated from runtime
          }
        }

        try {
          if (globalThis.window?.ToolRuntimeDebug === true) {
            console.log('[tool-runtime-observer]', entry);
          }
        } catch {
          // debug logging must never throw
        }
      });

      return entry;
    } catch {
      return null;
    }
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function clear() {
    listeners.clear();
  }

  return {
    emit,
    subscribe,
    clear
  };
}

export const runtimeObserver = createRuntimeObserver();
