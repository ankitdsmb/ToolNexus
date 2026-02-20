import { runtimeObserver } from './runtime/runtime-observer.js';
import { dependencyLoader as defaultDependencyLoader } from './runtime/dependency-loader.js';
import { loadToolTemplate as defaultTemplateLoader } from './runtime/tool-template-loader.js';
import { mountToolLifecycle as defaultLifecycleAdapter } from './runtime/tool-lifecycle-adapter.js';
import { bindTemplateData as defaultTemplateBinder } from './runtime/tool-template-binder.js';

export function createToolRuntime({
  observer = runtimeObserver,
  dependencyLoader = defaultDependencyLoader,
  templateLoader = defaultTemplateLoader,
  lifecycleAdapter = defaultLifecycleAdapter,
  templateBinder = defaultTemplateBinder,
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

      const templateStartedAt = now();
      emit('template_load_start', { toolSlug: slug });
      await templateLoader(slug, root, { templatePath: manifest.templatePath });
      emit('template_load_complete', { toolSlug: slug, duration: now() - templateStartedAt });

      templateBinder(root, window.ToolNexusConfig ?? {});

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
        throw error;
      }

      const modulePath = manifest.modulePath || window.ToolNexusConfig?.runtimeModulePath;
      if (!modulePath) {
        throw new Error(`tool-runtime: no module path found for "${slug}".`);
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
        await lifecycleAdapter({ module, slug, root, manifest });

        if (!root.firstElementChild) {
          throw new Error(`tool-runtime: mounted "${slug}" but #tool-root is empty.`);
        }

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

export { defaultLifecycleAdapter as mountToolModule };

const runtime = createToolRuntime();
runtime.bootstrapToolRuntime();
