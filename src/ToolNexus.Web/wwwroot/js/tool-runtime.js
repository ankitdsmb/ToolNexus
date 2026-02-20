import { runtimeObserver } from './runtime/runtime-observer.js';
import { dependencyLoader as defaultDependencyLoader } from './runtime/dependency-loader.js';
import { loadToolTemplate as defaultTemplateLoader } from './runtime/tool-template-loader.js';
import { mountToolLifecycle as defaultLifecycleAdapter, legacyAutoInit as defaultLegacyAutoInit } from './runtime/tool-lifecycle-adapter.js';
import { bindTemplateData as defaultTemplateBinder } from './runtime/tool-template-binder.js';
import { bootstrapLegacyTool as defaultLegacyBootstrap } from './runtime/legacy-tool-bootstrap.js';
import { validateToolDomContract as defaultDomContractValidator } from './runtime/tool-dom-contract-validator.js';

export function createToolRuntime({
  observer = runtimeObserver,
  dependencyLoader = defaultDependencyLoader,
  templateLoader = defaultTemplateLoader,
  lifecycleAdapter = defaultLifecycleAdapter,
  legacyAutoInit = defaultLegacyAutoInit,
  legacyBootstrap = defaultLegacyBootstrap,
  templateBinder = defaultTemplateBinder,
  validateDomContract = defaultDomContractValidator,
  getRoot = () => document.getElementById('tool-root'),
  loadManifest: loadManifestOverride,
  importModule = (modulePath) => import(modulePath),
  healRuntime = async () => false,
  now = () => (globalThis.performance?.now?.() ?? Date.now())
} = {}) {
  function renderContractError(root, errors) {
    if (!root) {
      return;
    }

    const errorPanel = document.createElement('div');
    errorPanel.className = 'tool-contract-error';
    errorPanel.innerHTML = `<h3>Tool Template Contract Failed</h3><pre>${errors.join('\n')}</pre>`;
    root.replaceChildren(errorPanel);
  }

  function injectContractFallbackLayout(root, slug) {
    if (!root) {
      return;
    }

    const toolPage = root.querySelector('.tool-page') ?? document.createElement('section');
    if (!toolPage.classList.contains('tool-page')) {
      toolPage.classList.add('tool-page');
    }

    if (!toolPage.getAttribute('data-slug')) {
      toolPage.setAttribute('data-slug', slug);
    }

    const layout = document.createElement('div');
    layout.className = 'tool-layout';
    layout.innerHTML = `
      <section class="tool-layout__panel">
        <textarea id="inputEditor"></textarea>
      </section>
      <section class="tool-panel--output">
        <textarea id="outputField"></textarea>
      </section>
    `;

    toolPage.appendChild(layout);
    if (!toolPage.parentElement) {
      root.appendChild(toolPage);
    }
  }

  function ensureDomContract(root, slug) {
    let validation = validateDomContract(root, slug);

    if (validation.valid) {
      return validation;
    }

    injectContractFallbackLayout(root, slug);
    validation = validateDomContract(root, slug);
    return validation;
  }

  function registerDebugValidation(rootProvider) {
    const globalDebug = (window.ToolNexus ??= {});
    globalDebug.debug ??= {};
    globalDebug.debug.validateDom = () => {
      const currentRoot = rootProvider();
      const currentSlug = (currentRoot?.dataset?.toolSlug || '').trim();
      const report = validateDomContract(currentRoot, currentSlug);
      console.info('ToolNexus DOM contract report', report);
      return report;
    };
  }

  function ensureRootFallback(root, slug) {
    if (!root || root.firstElementChild) {
      return false;
    }

    root.innerHTML = `<section class="tool-runtime-fallback" data-tool-runtime-fallback="true"><h2>${slug}</h2><p>Tool UI is loading in compatibility mode.</p></section>`;
    return true;
  }

  function emit(event, payload = {}) {
    try {
      observer?.emit?.(event, payload);
    } catch {
      // observability must never break runtime
    }
  }

  async function bootstrapToolRuntime() {
    const root = getRoot();
    registerDebugValidation(getRoot);
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

    let manifest = {
      slug,
      dependencies: [],
      styles: [],
      modulePath: window.ToolNexusConfig?.runtimeModulePath,
      templatePath: `/tool-templates/${slug}.html`
    };

    try {
      manifest = await (loadManifestOverride ?? loadManifest)(slug);
    } catch (error) {
      emit('manifest_failure', { toolSlug: slug, error: error?.message ?? String(error) });
      console.warn(`tool-runtime: manifest unavailable for "${slug}". Falling back to legacy runtime.`, error);
    }

    const styles = Array.isArray(manifest?.styles)
      ? manifest.styles.filter(Boolean)
      : [manifest?.cssPath].filter(Boolean);

    for (const style of styles) {
      ensureStylesheet(style);
    }

    let templateLoaded = false;
    const templateStartedAt = now();
    emit('template_load_start', { toolSlug: slug });
    try {
      await templateLoader(slug, root, { templatePath: manifest.templatePath });
      templateLoaded = true;
      emit('template_load_complete', { toolSlug: slug, duration: now() - templateStartedAt });
    } catch (error) {
      emit('template_load_failure', { toolSlug: slug, error: error?.message ?? String(error) });
      console.warn(`tool-runtime: template load failed for "${slug}"; continuing with legacy fallback.`, error);
    }

    templateBinder(root, window.ToolNexusConfig ?? {});

    const validation = ensureDomContract(root, slug);
    if (!validation.valid) {
      const message = `tool-runtime: DOM contract invalid for "${slug}"`;
      console.error(message, validation.errors);
      emit('dom_contract_failure', { toolSlug: slug, metadata: { errors: validation.errors } });
      renderContractError(root, validation.errors);
      return;
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
      console.warn(`tool-runtime: dependency loading failed for "${slug}"; continuing with fallback lifecycle.`, error);
    }

    const modulePath = manifest.modulePath || window.ToolNexusConfig?.runtimeModulePath;
    let module = {};

    if (modulePath) {
      const moduleImportStartedAt = now();
      emit('module_import_start', { toolSlug: slug, metadata: { modulePath } });

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
        console.warn(`tool-runtime: module import failed for "${slug}"; trying legacy lifecycle.`, error);
      }
    }

    const mountStartedAt = now();
    emit('mount_start', { toolSlug: slug });

    try {
      const result = await lifecycleAdapter({ module, slug, root, manifest });
      const mounted = Boolean(result?.mounted ?? true);
      const shouldForceLegacyBootstrap = !templateLoaded || !mounted;

      if (shouldForceLegacyBootstrap || !root.firstElementChild) {
        const legacyResult = await legacyBootstrap({
          module,
          slug,
          root,
          manifest,
          modulePath,
          importModule
        });

        if (!legacyResult?.mounted && !root.firstElementChild) {
          const retryLegacyResult = await legacyBootstrap({
            module,
            slug,
            root,
            manifest,
            modulePath,
            importModule
          });

          if (!retryLegacyResult?.mounted && !root.firstElementChild) {
            await legacyAutoInit({ slug, root, manifest });
          }
        }

        if (!root.firstElementChild) {
          throw new Error(`tool-runtime: no lifecycle rendered UI for "${slug}".`);
        }
      }

      if (ensureRootFallback(root, slug)) {
        emit('mount_fallback_content', { toolSlug: slug });
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
          ensureRootFallback(root, slug);
          return;
        }

        emit('healing_failure', { toolSlug: slug });
        emit('tool_unrecoverable_failure', { toolSlug: slug });
      } catch {
        emit('healing_result', { toolSlug: slug, metadata: { healed: false } });
        emit('healing_failure', { toolSlug: slug });
        emit('tool_unrecoverable_failure', { toolSlug: slug });
      }
    }

    if (ensureRootFallback(root, slug)) {
      emit('mount_fallback_content', { toolSlug: slug, metadata: { phase: 'post-bootstrap' } });
    }

    emit('bootstrap_complete', { toolSlug: slug, duration: now() - runtimeStartedAt });
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
