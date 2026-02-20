import { runtimeObserver } from './runtime/runtime-observer.js';
import { dependencyLoader as defaultDependencyLoader } from './runtime/dependency-loader.js';
import { loadToolTemplate as defaultTemplateLoader } from './runtime/tool-template-loader.js';
import { mountToolLifecycle as defaultLifecycleAdapter, legacyAutoInit as defaultLegacyAutoInit, inspectLifecycleContract } from './runtime/tool-lifecycle-adapter.js';
import { bindTemplateData as defaultTemplateBinder } from './runtime/tool-template-binder.js';
import { bootstrapLegacyTool as defaultLegacyBootstrap } from './runtime/legacy-tool-bootstrap.js';
import { validateToolDomContract as defaultDomContractValidator } from './runtime/tool-dom-contract-validator.js';
import { createRuntimeMigrationLogger } from './runtime/runtime-migration-logger.js';

const RUNTIME_CLEANUP_KEY = '__toolNexusRuntimeCleanup';

async function runPreviousCleanup(root) {
  const cleanup = root?.[RUNTIME_CLEANUP_KEY];
  if (typeof cleanup !== 'function') {
    return;
  }

  try {
    await cleanup();
  } catch (error) {
    console.warn('tool-runtime: previous cleanup failed.', error);
  } finally {
    delete root[RUNTIME_CLEANUP_KEY];
  }
}

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
  const logger = createRuntimeMigrationLogger({ channel: 'runtime' });
  const manifestLogger = createRuntimeMigrationLogger({ channel: 'manifest' });
  const dependencyLogger = createRuntimeMigrationLogger({ channel: 'dependency' });
  const lifecycleLogger = createRuntimeMigrationLogger({ channel: 'lifecycle' });
  const fallbackLogger = createRuntimeMigrationLogger({ channel: 'fallback' });
  let lastError = null;

  function setLastError(stage, error, slug, metadata = {}) {
    lastError = {
      stage,
      slug,
      message: error?.message ?? String(error),
      metadata,
      timestamp: new Date().toISOString()
    };
  }

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

    await runPreviousCleanup(root);

    const slug = (root.dataset.toolSlug || '').trim();
    if (!slug) {
      logger.error('Missing tool slug on #tool-root.');
      return;
    }

    logger.info(`Bootstrapping tool runtime for "${slug}".`);

    const runtimeStartedAt = now();
    emit('bootstrap_start', { toolSlug: slug });

    const fallbackManifest = {
      slug,
      dependencies: [],
      styles: [],
      modulePath: window.ToolNexusConfig?.runtimeModulePath,
      templatePath: `/tool-templates/${slug}.html`
    };
    const safeLoadManifest = async () => {
      try {
        const loadedManifest = await (loadManifestOverride ?? loadManifest)(slug);
        return { manifest: { ...fallbackManifest, ...(loadedManifest ?? {}) }, source: 'manifest' };
      } catch (error) {
        setLastError('manifest', error, slug);
        emit('manifest_failure', { toolSlug: slug, error: error?.message ?? String(error) });
        manifestLogger.warn(`Manifest unavailable for "${slug}". Falling back to legacy runtime.`, error);
        return { manifest: fallbackManifest, source: 'fallback' };
      }
    };

    const { manifest, source: manifestSource } = await safeLoadManifest();

    const styles = Array.isArray(manifest?.styles)
      ? manifest.styles.filter(Boolean)
      : [manifest?.cssPath].filter(Boolean);

    for (const style of styles) {
      ensureStylesheet(style);
    }

    const safeLoadTemplate = async () => {
      const templateStartedAt = now();
      emit('template_load_start', { toolSlug: slug });
      try {
        await templateLoader(slug, root, { templatePath: manifest.templatePath });
        emit('template_load_complete', { toolSlug: slug, duration: now() - templateStartedAt });
        return true;
      } catch (error) {
        setLastError('template', error, slug, { templatePath: manifest.templatePath });
        emit('template_load_failure', { toolSlug: slug, error: error?.message ?? String(error) });
        fallbackLogger.warn(`Template load failed for "${slug}"; preserving legacy DOM or fallback container.`, error);
        return false;
      }
    };

    const templateLoaded = await safeLoadTemplate();

    templateBinder(root, window.ToolNexusConfig ?? {});

    const validation = ensureDomContract(root, slug);
    if (!validation.valid) {
      const message = `tool-runtime: DOM contract invalid for "${slug}"`;
      logger.error(message, validation.errors);
      emit('dom_contract_failure', { toolSlug: slug, metadata: { errors: validation.errors } });
      renderContractError(root, validation.errors);
      return;
    }

    const safeLoadDependencies = async () => {
      const dependencyStartedAt = now();
      emit('dependency_start', { toolSlug: slug });
      try {
        await dependencyLoader.loadDependencies({ dependencies: manifest.dependencies, toolSlug: slug });
        emit('dependency_complete', { toolSlug: slug, duration: now() - dependencyStartedAt });
      } catch (error) {
        setLastError('dependency', error, slug, { dependencies: manifest.dependencies ?? [] });
        emit('dependency_failure', {
          toolSlug: slug,
          duration: now() - dependencyStartedAt,
          error: error?.message ?? String(error)
        });
        dependencyLogger.warn(`Dependency loading failed for "${slug}"; continuing execution.`, error);
      }
    };

    await safeLoadDependencies();

    const modulePath = manifest.modulePath || window.ToolNexusConfig?.runtimeModulePath;
    const safeResolveLifecycle = async () => {
      let module = {};
      if (!modulePath) {
        return module;
      }

      const moduleImportStartedAt = now();
      emit('module_import_start', { toolSlug: slug, metadata: { modulePath } });

      try {
        module = await importModule(modulePath);
        const lifecycleContract = inspectLifecycleContract(module);
        emit('lifecycle_contract_evaluated', {
          toolSlug: slug,
          metadata: lifecycleContract
        });

        if (!lifecycleContract.compliant) {
          lifecycleLogger.info(`Non-standard lifecycle for "${slug}", using compatibility adapter.`);
        }

        emit('module_import_complete', {
          toolSlug: slug,
          duration: now() - moduleImportStartedAt,
          metadata: { modulePath }
        });
      } catch (error) {
        setLastError('module-import', error, slug, { modulePath });
        emit('module_import_failure', {
          toolSlug: slug,
          duration: now() - moduleImportStartedAt,
          error: error?.message ?? String(error),
          metadata: { modulePath }
        });
        lifecycleLogger.warn(`Module import failed for "${slug}"; trying legacy lifecycle.`, error);
      }

      return module;
    };

    const module = await safeResolveLifecycle();

    const lifecycleContract = inspectLifecycleContract(module);
    const classification = manifestSource === 'fallback'
      ? 'legacy'
      : lifecycleContract.compliant
        ? 'modern'
        : modulePath
          ? 'transitional'
          : 'broken';
    logger.info(`Runtime classification for "${slug}": ${classification}.`, {
      classification,
      templateLoaded,
      hasModulePath: Boolean(modulePath),
      lifecycle: lifecycleContract
    });

    const safeMount = async () => {
      const mountStartedAt = now();
      emit('mount_start', { toolSlug: slug });

      try {
        const result = await lifecycleAdapter({ module, slug, root, manifest });
        const mounted = Boolean(result?.mounted ?? true);
        if (typeof result?.cleanup === 'function') {
          root[RUNTIME_CLEANUP_KEY] = result.cleanup;
        }
        const shouldForceLegacyBootstrap = !mounted || !root.firstElementChild;

        if (shouldForceLegacyBootstrap) {
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
            fallbackLogger.warn(`No lifecycle rendered UI for "${slug}"; mounting fallback container.`);
          }
        }

        if (ensureRootFallback(root, slug)) {
          emit('mount_fallback_content', { toolSlug: slug });
        }

        emit('mount_success', { toolSlug: slug, duration: now() - mountStartedAt });
        logger.info(`Tool runtime mounted successfully for "${slug}".`);
      } catch (error) {
        setLastError('mount', error, slug, { classification });
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
            logger.info(`Runtime self-healed for "${slug}".`);
            return;
          }

          emit('healing_failure', { toolSlug: slug });
          emit('tool_unrecoverable_failure', { toolSlug: slug });
        } catch {
          emit('healing_result', { toolSlug: slug, metadata: { healed: false } });
          emit('healing_failure', { toolSlug: slug });
          emit('tool_unrecoverable_failure', { toolSlug: slug });
        }

        logger.warn(`Tool runtime entered fallback recovery path for "${slug}".`, error);
      }
    };

    await safeMount();

    if (ensureRootFallback(root, slug)) {
      emit('mount_fallback_content', { toolSlug: slug, metadata: { phase: 'post-bootstrap' } });
    }

    emit('bootstrap_complete', { toolSlug: slug, duration: now() - runtimeStartedAt });
    logger.info(`Bootstrap completed for "${slug}".`);
  }

  return {
    bootstrapToolRuntime,
    getLastError: () => lastError
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
