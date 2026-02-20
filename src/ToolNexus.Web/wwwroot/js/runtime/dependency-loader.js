import { runtimeObserver } from './runtime-observer.js';

export function createDependencyLoader({ observer = runtimeObserver, loadScript } = {}) {
  const cache = new Map();

  const scriptLoader = typeof loadScript === 'function'
    ? loadScript
    : (src) => new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-runtime-dependency="${src}"]`);
      if (existing) {
        if (existing.dataset.runtimeDependencyReady === 'true') {
          resolve();
          return;
        }

        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error(`Failed to load dependency script: ${src}`)), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.src = src;
      script.dataset.runtimeDependency = src;
      script.addEventListener('load', () => {
        script.dataset.runtimeDependencyReady = 'true';
        resolve();
      }, { once: true });
      script.addEventListener('error', () => reject(new Error(`Failed to load dependency script: ${src}`)), { once: true });
      document.head.appendChild(script);
    });

  function emit(event, payload) {
    try {
      observer?.emit?.(event, payload);
    } catch {
      // observability should not impact dependency loading
    }
  }

  async function loadDependency(src, toolSlug) {
    if (cache.has(src)) {
      emit('cache_hit', { toolSlug, metadata: { dependency: src } });
      return cache.get(src);
    }

    const startedAt = globalThis.performance?.now?.() ?? Date.now();
    emit('dependency_script_load_start', { toolSlug, metadata: { dependency: src } });

    const pending = scriptLoader(src)
      .then(() => {
        emit('dependency_script_load_complete', {
          toolSlug,
          duration: (globalThis.performance?.now?.() ?? Date.now()) - startedAt,
          metadata: { dependency: src }
        });
      })
      .catch((error) => {
        cache.delete(src);
        emit('dependency_script_load_failure', {
          toolSlug,
          duration: (globalThis.performance?.now?.() ?? Date.now()) - startedAt,
          error: error?.message ?? String(error),
          metadata: { dependency: src }
        });
        throw error;
      });

    cache.set(src, pending);
    return pending;
  }

  async function loadDependencies({ dependencies = [], toolSlug } = {}) {
    const list = Array.isArray(dependencies) ? dependencies.filter(Boolean) : [];
    await Promise.all(list.map((dependency) => loadDependency(dependency, toolSlug)));
  }

  return {
    loadDependencies
  };
}

export const dependencyLoader = createDependencyLoader();
