import { runtimeObserver } from './runtime-observer.js';
import { createRuntimeMigrationLogger } from './runtime-migration-logger.js';

export function createDependencyLoader({
  observer = runtimeObserver,
  loadScript,
  loadCss
} = {}) {

  const logger = createRuntimeMigrationLogger({ channel: 'dependency' });
  const cache = new Map();

  const scriptLoader = typeof loadScript === 'function'
    ? loadScript
    : (src) =>
      new Promise((resolve, reject) => {

        const existing =
          document.querySelector(`script[data-runtime-dependency="${src}"]`);

        if (existing) {
          if (existing.dataset.runtimeDependencyReady === 'true') {
            resolve();
            return;
          }

          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener(
            'error',
            () => reject(new Error(`Failed to load dependency script: ${src}`)),
            { once: true }
          );
          return;
        }

        const script = document.createElement('script');
        script.async = true;
        script.src = src;
        script.dataset.runtimeDependency = src;

        script.addEventListener(
          'load',
          () => {
            script.dataset.runtimeDependencyReady = 'true';

            // Monaco loader auto-config
            if (
              src.endsWith('/lib/monaco/vs/loader.js') &&
              typeof window.require === 'function'
            ) {
              window.require.config({
                paths: { vs: '/lib/monaco/vs' }
              });
            }

            resolve();
          },
          { once: true }
        );

        script.addEventListener(
          'error',
          () =>
            reject(
              new Error(`Failed to load dependency script: ${src}`)
            ),
          { once: true }
        );

        document.head.appendChild(script);
      });

  const cssLoader = typeof loadCss === 'function'
    ? loadCss
    : (href) =>
      new Promise((resolve, reject) => {

        const existing =
          document.querySelector(`link[data-runtime-dependency-css="${href}"]`);

        if (existing) {
          resolve();
          return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.dataset.runtimeDependencyCss = href;

        link.addEventListener('load', resolve, { once: true });
        link.addEventListener(
          'error',
          () =>
            reject(
              new Error(`Failed to load dependency stylesheet: ${href}`)
            ),
          { once: true }
        );

        document.head.appendChild(link);
      });

  function emit(event, payload) {
    try {
      observer?.emit?.(event, payload);
    } catch {
      // observability must never break runtime
    }
  }

  /**
   * TRUE FIX:
   * DO NOT skip remote dependencies on localhost.
   * Runtime must behave same in dev + prod.
   */
  function shouldSkipRemoteDependency() {
    return false;
  }

  async function loadDependency(src, toolSlug) {
    if (shouldSkipRemoteDependency(src)) {
      logger.info(`Skipping dependency "${src}".`, { toolSlug });
      emit('dependency_script_load_skipped', {
        toolSlug,
        metadata: { dependency: src }
      });
      return;
    }

    if (cache.has(src)) {
      emit('cache_hit', {
        toolSlug,
        metadata: { dependency: src }
      });
      return cache.get(src);
    }

    const startedAt = globalThis.performance?.now?.() ?? Date.now();

    emit('dependency_script_load_start', {
      toolSlug,
      metadata: { dependency: src }
    });

    const pending =
      (src.endsWith('.css') ? cssLoader(src) : scriptLoader(src))
        .then(() => {
          logger.info(`Loaded dependency "${src}".`, { toolSlug });

          emit('dependency_script_load_complete', {
            toolSlug,
            duration:
              (globalThis.performance?.now?.() ?? Date.now()) - startedAt,
            metadata: { dependency: src }
          });
        })
        .catch((error) => {
          cache.delete(src);

          logger.warn(`Failed dependency "${src}".`, {
            toolSlug,
            error: error?.message ?? String(error)
          });

          emit('dependency_script_load_failure', {
            toolSlug,
            error: error?.message ?? String(error),
            metadata: { dependency: src }
          });

          throw error;
        });

    cache.set(src, pending);
    return pending;
  }

  async function loadDependencies({ dependencies = [], toolSlug } = {}) {
    const list = Array.isArray(dependencies)
      ? dependencies.filter(Boolean)
      : [];

    await Promise.all(
      list.map((dependency) =>
        loadDependency(dependency, toolSlug)
      )
    );
  }

  return { loadDependencies };
}

export const dependencyLoader = createDependencyLoader();
