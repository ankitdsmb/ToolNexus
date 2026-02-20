import { runtimeObserver } from './runtime/runtime-observer.js';
import { dependencyLoader as defaultDependencyLoader } from './runtime/dependency-loader.js';

export function createToolRuntime({
  observer = runtimeObserver,
  dependencyLoader = defaultDependencyLoader,
  getRoot = () => document.getElementById('tool-root'),
  loadManifest: loadManifestOverride,
  importModule = (modulePath) => import(modulePath),
  healRuntime = async () => false,
  now = () => (globalThis.performance?.now?.() ?? Date.now())
} = {}) {
  function emit(event, payload = {}) {
    try {
      observer?.emit?.(event, payload);
    } catch {
      // observability must never break runtime
    }
  }

  async function bootstrapToolRuntime() {
    const root = getRoot();
    if (!root) {
      return;
    }

    const slug = (root.dataset.toolSlug || '').trim();
    if (!slug) {
      console.error('tool-runtime: missing tool slug on #tool-root.');
      return;
    }

    const runtimeStartedAt = now();
    emit('bootstrap_start', { toolSlug: slug });

    try {
      const manifest = await (loadManifestOverride ?? loadManifest)(slug);
      if (manifest.cssPath) {
        ensureStylesheet(manifest.cssPath);
      }

      const dependencyStartedAt = now();
      emit('dependency_start', { toolSlug: slug });
      try {
        await dependencyLoader.loadDependencies({ dependencies: manifest.dependencies, toolSlug: slug });
        emit('dependency_complete', { toolSlug: slug, duration: now() - dependencyStartedAt });
      } catch (error) {
        emit('dependency_failure', {
          toolSlug: slug,
          duration: now() - dependencyStartedAt,
          error: error?.message ?? String(error)
        });
      }

      const modulePath = manifest.modulePath || window.ToolNexusConfig?.runtimeModulePath;
      if (!modulePath) {
        console.warn(`tool-runtime: no module path found for "${slug}".`);
        return;
      }

      const moduleImportStartedAt = now();
      emit('module_import_start', { toolSlug: slug, metadata: { modulePath } });

      let module;
      try {
        module = await importModule(modulePath);
        emit('module_import_complete', {
          toolSlug: slug,
          duration: now() - moduleImportStartedAt,
          metadata: { modulePath }
        });
      } catch (error) {
        emit('module_import_failure', {
          toolSlug: slug,
          duration: now() - moduleImportStartedAt,
          error: error?.message ?? String(error),
          metadata: { modulePath }
        });
        throw error;
      }

      const mountStartedAt = now();
      emit('mount_start', { toolSlug: slug });
      try {
        await mountToolModule({ module, slug, root, manifest });
        emit('mount_success', { toolSlug: slug, duration: now() - mountStartedAt });
      } catch (error) {
        emit('mount_failure', {
          toolSlug: slug,
          duration: now() - mountStartedAt,
          error: error?.message ?? String(error)
        });

        emit('healing_attempt', { toolSlug: slug });
        emit('tool_self_heal_triggered', { toolSlug: slug });

        try {
          const healed = await healRuntime({ slug, root, manifest, error });
          emit('healing_result', { toolSlug: slug, metadata: { healed: Boolean(healed) } });
          if (healed) {
            emit('healing_success', { toolSlug: slug });
            emit('tool_self_heal_success', { toolSlug: slug });
            return;
          }

          emit('healing_failure', { toolSlug: slug });
          emit('tool_unrecoverable_failure', { toolSlug: slug });
          throw error;
        } catch {
          emit('healing_result', { toolSlug: slug, metadata: { healed: false } });
          emit('healing_failure', { toolSlug: slug });
          emit('tool_unrecoverable_failure', { toolSlug: slug });
          throw error;
        }
      }

      emit('bootstrap_complete', { toolSlug: slug, duration: now() - runtimeStartedAt });
    } catch (error) {
      console.error(`tool-runtime: failed to initialize "${slug}".`, error);
    }
  }

  return {
    bootstrapToolRuntime
  };
}

export async function loadManifest(slug) {
  const response = await fetch(`/tools/manifest/${encodeURIComponent(slug)}`, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Manifest request failed (${response.status}).`);
  }

  return response.json();
}

export function ensureStylesheet(cssPath) {
  if (!cssPath || document.querySelector(`link[data-tool-css="${cssPath}"]`)) {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = cssPath;
  link.dataset.toolCss = cssPath;
  document.head.appendChild(link);
}

export async function mountToolModule({ module, slug, root, manifest }) {
  if (typeof module.mount === 'function') {
    await module.mount(root, manifest);
    return;
  }

  if (typeof module.default?.mount === 'function') {
    await module.default.mount(root, manifest);
    return;
  }

  if (typeof module.init === 'function') {
    module.init(root, manifest);
    return;
  }

  const legacyModule = window.ToolNexusModules?.[slug];
  if (legacyModule?.mount) {
    legacyModule.mount(root, manifest);
    return;
  }

  if (legacyModule?.init) {
    legacyModule.init(root, manifest);
    return;
  }

  if (legacyModule?.create) {
    const handle = legacyModule.create(root, manifest);
    handle?.init?.();
    return;
  }

  console.warn(`tool-runtime: module loaded for "${slug}" but no mount/init API found.`);
}

const runtime = createToolRuntime();
runtime.bootstrapToolRuntime();
