import { runtimeObserver } from './runtime/runtime-observer.js';
import { dependencyLoader as defaultDependencyLoader } from './runtime/dependency-loader.js';
import { loadToolTemplate as defaultTemplateLoader } from './runtime/tool-template-loader.js';
import { mountToolLifecycle as defaultLifecycleAdapter, legacyAutoInit as defaultLegacyAutoInit, inspectLifecycleContract } from './runtime/tool-lifecycle-adapter.js';
import { bindTemplateData as defaultTemplateBinder } from './runtime/tool-template-binder.js';
import { bootstrapLegacyTool as defaultLegacyBootstrap } from './runtime/legacy-tool-bootstrap.js';
import { validateToolDom as defaultDomContractValidator } from './runtime/tool-dom-contract-validator.js';
import { adaptToolDom as defaultDomAdapter } from './runtime/tool-dom-adapter.js';
import { createRuntimeMigrationLogger } from './runtime/runtime-migration-logger.js';
import { detectToolCapabilities as defaultDetectToolCapabilities } from './runtime/tool-capability-matrix.js';
import { safeDomMount as defaultSafeDomMount } from './runtime/safe-dom-mount.js';
import { createToolExecutionContext as defaultCreateToolExecutionContext } from './runtime/tool-execution-context.js';
import { legacyExecuteTool as defaultLegacyExecuteTool, releaseLegacyInitialization as defaultReleaseLegacyInitialization } from './runtime/legacy-execution-bridge.js';
import { createToolStateRegistry as defaultCreateToolStateRegistry } from './runtime/tool-state-registry.js';
import { createRuntimeObservability as defaultCreateRuntimeObservability } from './runtime/runtime-observability.js';
import { classifyRuntimeError } from './runtime/error-classification-engine.js';
import { runtimeIncidentReporter } from './runtime/runtime-incident-reporter.js';
import { createAutoToolRuntimeModule } from './runtime/tool-auto-runtime.js';
import { useUnifiedToolControl as useUnifiedControlAdapter } from './runtime/tool-unified-control-runtime.js';

const RUNTIME_CLEANUP_KEY = '__toolNexusRuntimeCleanup';
const RUNTIME_BOOT_KEY = '__toolNexusRuntimeBootPromise';

function scheduleNonCriticalTask(task) {
  if (typeof task !== 'function') {
    return;
  }

  if (typeof globalThis.requestIdleCallback === 'function') {
    globalThis.requestIdleCallback(() => {
      task();
    }, { timeout: 180 });
    return;
  }

  setTimeout(task, 0);
}

async function runPreviousCleanup(root) {
  const cleanup = root?.[RUNTIME_CLEANUP_KEY];
  if (typeof cleanup !== 'function') {
    return;
  }

  try {
    await cleanup();
  } catch (error) {
    createRuntimeMigrationLogger({ channel: 'fallback' }).warn('Previous runtime cleanup failed; continuing with fresh bootstrap.', { error: error?.message ?? String(error) });
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
  adaptDomContract = defaultDomAdapter,
  detectToolCapabilities = defaultDetectToolCapabilities,
  safeDomMount = defaultSafeDomMount,
  createToolExecutionContext = defaultCreateToolExecutionContext,
  legacyExecuteTool = defaultLegacyExecuteTool,
  releaseLegacyInitialization = defaultReleaseLegacyInitialization,
  getRoot = () => document.getElementById('tool-root'),
  loadManifest: loadManifestOverride,
  importModule = (modulePath) => import(modulePath),
  healRuntime = async () => false,
  now = () => (globalThis.performance?.now?.() ?? Date.now()),
  createToolStateRegistry = defaultCreateToolStateRegistry,
  createRuntimeObservability = defaultCreateRuntimeObservability
} = {}) {
  const logger = createRuntimeMigrationLogger({ channel: 'runtime' });
  const manifestLogger = createRuntimeMigrationLogger({ channel: 'manifest' });
  const dependencyLogger = createRuntimeMigrationLogger({ channel: 'dependency' });
  const lifecycleLogger = createRuntimeMigrationLogger({ channel: 'lifecycle' });
  const fallbackLogger = createRuntimeMigrationLogger({ channel: 'fallback' });
  let lastError = null;
  const stateRegistry = createToolStateRegistry();
  const observability = createRuntimeObservability({ now });
  const runtimeMetrics = {
    toolsMountedSuccessfully: 0,
    legacyAdapterUsage: 0,
    autoDestroyGenerated: 0,
    initRetriesPerformed: 0,
    bootstrapCount: 0,
    skippedDuplicateBoots: 0,
    manifestLoadTimeMs: 0,
    dependencyLoadTimeMs: 0,
    mountTimeMs: 0,
    moduleImportTimeMs: 0,
    runtimeBootTimeMs: 0
  };

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
    layout.className = 'tool-layout tn-tool-body';
    layout.innerHTML = `
      <section class="tool-layout__panel tn-tool-panel" aria-label="Tool input panel">
        <textarea id="inputEditor"></textarea>
      </section>
      <section class="tool-layout__panel tool-panel--output tn-tool-panel" id="outputField" aria-label="Tool output panel"></section>
    `;

    toolPage.appendChild(layout);
    if (!toolPage.parentElement) {
      root.appendChild(toolPage);
    }
  }


  function normalizeDomValidation(validation) {
    if (validation && typeof validation.isValid === 'boolean') {
      return validation;
    }

    if (validation && typeof validation.valid === 'boolean') {
      const missingNodes = Array.isArray(validation.errors)
        ? validation.errors
          .filter((entry) => typeof entry === 'string' && entry.startsWith('Missing '))
          .map((entry) => entry.replace(/^Missing (selector: |node: )/, ''))
        : [];

      return {
        isValid: validation.valid,
        missingNodes,
        detectedLayoutType: validation.detectedLayoutType ?? 'UNKNOWN_LAYOUT',
        mountSafe: true
      };
    }

    return {
      isValid: false,
      missingNodes: [],
      detectedLayoutType: 'UNKNOWN_LAYOUT',
      mountSafe: false
    };
  }

  function ensureDomContract(root, slug, capability = {}) {
    logger.info('[DomContract] validating layout', { slug });
    let validation = normalizeDomValidation(validateDomContract(root));

    if (validation.isValid) {
      return validation;
    }

    logger.info('[DomAdapter] legacy layout detected', {
      slug,
      detectedLayoutType: validation.detectedLayoutType,
      missingNodes: validation.missingNodes
    });

    const adapted = adaptDomContract(root, capability);
    logger.info('[DomAdapter] adapter applied', { slug, ...adapted });

    validation = normalizeDomValidation(validateDomContract(root));
    if (!validation.isValid) {
      injectContractFallbackLayout(root, slug);
      validation = normalizeDomValidation(validateDomContract(root));
    }

    return validation;
  }

  function registerDebugValidation(rootProvider) {
    const globalDebug = (window.ToolNexus ??= {});
    globalDebug.debug ??= {};
    globalDebug.debug.validateDom = () => {
      const currentRoot = rootProvider();
      const currentSlug = (currentRoot?.dataset?.toolSlug || '').trim();
      const report = normalizeDomValidation(validateDomContract(currentRoot));
      logger.info('[DomContract] report generated via debug hook', report);
      return report;
    };
  }

  function normalizeUiMode(uiMode) {
    return String(uiMode ?? 'auto').trim().toLowerCase() === 'custom' ? 'custom' : 'auto';
  }

  function normalizeComplexityTier(complexityTier) {
    const parsed = Number.parseInt(complexityTier ?? 1, 10);
    if (Number.isNaN(parsed)) {
      return 1;
    }

    return Math.min(5, Math.max(1, parsed));
  }

  function ensureRootFallback(root, slug, { force = false } = {}) {
    if (!root) {
      return false;
    }

    if (!force && root.firstElementChild) {
      return false;
    }

    root.innerHTML = `<section class="tool-runtime-fallback tn-tool-shell" data-tool-runtime-fallback="true"><header class="tn-tool-header"><h2>${slug}</h2><p>Tool failed to initialize safely.</p></header><div class="tn-tool-body"><section class="tn-tool-panel" aria-label="Input panel unavailable"></section><section class="tn-tool-panel" aria-label="Output panel unavailable"></section></div><footer class="tn-tool-footer"><p>SSR content still available.</p><p class="tool-runtime-fallback__warning">Non-blocking warning: runtime entered compatibility mode.</p></footer></section>`;
    return true;
  }

  function restoreSsrSnapshot(root, mountPlan) {
    if (!root || mountPlan?.mode !== 'enhance' || !mountPlan?.hadSsrMarkup) {
      return;
    }

    const hasSnapshotContent = Array.isArray(mountPlan.ssrSnapshot) && mountPlan.ssrSnapshot.length > 0;
    if (!hasSnapshotContent) {
      return;
    }

    const hasOriginalSsr = mountPlan.ssrSnapshot.some((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return false;
      }

      return node.id && !document.getElementById(node.id);
    });

    if (!hasOriginalSsr) {
      return;
    }

    const preserved = document.createElement('section');
    preserved.hidden = true;
    preserved.dataset.ssrPreserved = 'true';
    for (const node of mountPlan.ssrSnapshot) {
      preserved.appendChild(node.cloneNode(true));
    }
    root.appendChild(preserved);
  }

  function assertPostMount({ root, context, slug, state, lifecycleResult }) {
    if (!root) {
      throw new Error(`runtime assertion failed: root missing for "${slug}"`);
    }

    if (!root.firstElementChild) {
      throw new Error(`runtime assertion failed: root is empty for "${slug}"`);
    }

    if (!context) {
      throw new Error(`runtime assertion failed: execution context missing for "${slug}"`);
    }

    if (!lifecycleResult || typeof lifecycleResult.cleanup !== 'function') {
      throw new Error(`runtime assertion failed: cleanup unavailable for "${slug}"`);
    }

    if (!state || state.lifecyclePhase === 'created') {
      throw new Error(`runtime assertion failed: state not registered for "${slug}"`);
    }
  }

  function assertPostDestroy(context, slug, state) {
    if (!context) {
      return;
    }

    if (context.listeners.length > 0 || context.cleanupCallbacks.length > 0) {
      throw new Error(`runtime assertion failed: cleanup incomplete for "${slug}"`);
    }

    if (state) {
      throw new Error(`runtime assertion failed: registry uncleared for "${slug}"`);
    }
  }

  function emit(event, payload = {}) {
    observability.record(event, payload);
    try {
      observer?.emit?.(event, payload);
    } catch {
      // observability must never break runtime
    }

    try {
      const incidentEvents = {
        manifest_failure: { phase: 'bootstrap', errorType: 'runtime_error' },
        template_load_failure: { phase: 'bootstrap', errorType: 'runtime_error' },
        dom_contract_failure: { phase: 'mount', errorType: 'contract_violation' },
        module_import_failure: { phase: 'mount', errorType: 'runtime_error' },
        mount_failure: { phase: 'mount', errorType: 'runtime_error' },
        tool_unrecoverable_failure: { phase: 'mount', errorType: 'runtime_error' }
      };

      const definition = incidentEvents[event];
      if (definition) {
        runtimeIncidentReporter.report({
          toolSlug: payload.toolSlug ?? 'unknown-tool',
          phase: definition.phase,
          errorType: definition.errorType,
          message: payload.error ?? payload.metadata?.errors?.join('; ') ?? String(event),
          payloadType: 'runtime_event',
          timestamp: new Date().toISOString()
        });
      }
    } catch {
      // incident reporting is best-effort and isolated from runtime lifecycle
    }
  }

  function exposeDiagnosticsApi() {
    if (typeof window === 'undefined') {
      return;
    }

    const toolNexus = (window.ToolNexus ??= {});
    const runtimeApi = (toolNexus.runtime ??= {});
    runtimeApi.getDiagnostics = () => ({
      ...runtimeMetrics,
      registry: stateRegistry.summary(),
      observability: observability.getSnapshot().metrics
    });
    runtimeApi.getLastError = () => lastError;
    runtimeApi.getObservabilitySnapshot = () => observability.getSnapshot();
    runtimeApi.getMigrationInsights = () => observability.getMigrationInsights();
    runtimeApi.getDashboardContract = () => observability.getDashboardContract();
  }

  function detectToolClassification({ hasManifest, lifecycleContract, modulePath, legacyBridgeUsed, mountError }) {
    if (!hasManifest || legacyBridgeUsed) {
      return 'legacy';
    }

    if (lifecycleContract?.compliant) {
      return 'modern';
    }

    if (modulePath) {
      return 'transitional';
    }

    if (mountError) {
      return 'broken';
    }

    return 'transitional';
  }

  async function safeMountTool({ root, slug }) {
    const runtimeStartedAt = now();
    runtimeMetrics.bootstrapCount += 1;
    emit('bootstrap_start', { toolSlug: slug });

    const registration = stateRegistry.register({ slug, root, compatibilityMode: 'normalizing' });
    const stateKey = registration.key;
    if (registration.duplicate && registration.state?.mounted) {
      runtimeMetrics.skippedDuplicateBoots += 1;
      logger.warn(`Skipping duplicate mount attempt for "${slug}".`);
      return;
    }

    stateRegistry.setPhase(stateKey, 'initializing');

    const fallbackManifest = {
      slug,
      dependencies: [],
      styles: [],
      modulePath: window.ToolNexusConfig?.runtimeModulePath,
      templatePath: `/tool-templates/${slug}.html`,
      uiMode: window.ToolNexusConfig?.runtimeUiMode ?? 'auto',
      complexityTier: window.ToolNexusConfig?.runtimeComplexityTier ?? 1
    };

    const safeLoadManifest = async () => {
      const manifestStartedAt = now();
      try {
        const loadedManifest = await (loadManifestOverride ?? loadManifest)(slug);
        runtimeMetrics.manifestLoadTimeMs = now() - manifestStartedAt;
        return {
          manifest: { ...fallbackManifest, ...(loadedManifest ?? {}) },
          source: 'manifest',
          hasManifest: true
        };
      } catch (error) {
        runtimeMetrics.manifestLoadTimeMs = now() - manifestStartedAt;
        setLastError('manifest', error, slug);
        emit('manifest_failure', { toolSlug: slug, error: error?.message ?? String(error) });
        manifestLogger.warn(`Manifest unavailable for "${slug}". Falling back to legacy runtime.`, error);
        return { manifest: fallbackManifest, source: 'fallback', hasManifest: false };
      }
    };

    const { manifest, hasManifest } = await safeLoadManifest();

    const executionContext = createToolExecutionContext({
      slug,
      root,
      manifest,
      adapters: {
        useUnifiedToolControl: (options = {}) => useUnifiedControlAdapter(root, {
          slug,
          manifest,
          ...options
        })
      }
    });

    const capabilitiesAtStart = detectToolCapabilities({ slug, manifest, root });
    const mountPlan = safeDomMount(root, capabilitiesAtStart.mountMode);

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
    restoreSsrSnapshot(root, mountPlan);

    templateBinder(root, window.ToolNexusConfig ?? {});

    const validation = ensureDomContract(root, slug, capabilitiesAtStart);
    if (!validation.isValid) {
      const message = `tool-runtime: DOM contract invalid for "${slug}"`;
      const errors = ['[DOM CONTRACT ERROR]', ...validation.missingNodes.map((nodeName) => `Missing node: ${nodeName}`)];
      logger.error(message, errors);
      emit('dom_contract_failure', { toolSlug: slug, metadata: { errors } });
      renderContractError(root, errors);
      return;
    }

    const safeLoadDependencies = async () => {
      const dependencyStartedAt = now();
      emit('dependency_start', { toolSlug: slug });
      try {
        await dependencyLoader.loadDependencies({ dependencies: manifest.dependencies, toolSlug: slug });
        runtimeMetrics.dependencyLoadTimeMs = now() - dependencyStartedAt;
        emit('dependency_complete', { toolSlug: slug, duration: now() - dependencyStartedAt });
      } catch (error) {
        runtimeMetrics.dependencyLoadTimeMs = now() - dependencyStartedAt;
        setLastError('dependency', error, slug, { dependencies: manifest.dependencies ?? [] });
        emit('dependency_failure', {
          toolSlug: slug,
          duration: now() - dependencyStartedAt,
          error: error?.message ?? String(error),
          errorCategory: classifyRuntimeError({ stage: 'dependency', message: error?.message, eventName: 'dependency_failure' })
        });
        dependencyLogger.warn(`Dependency loading failed for "${slug}"; continuing execution.`, error);
      }
    };

    await safeLoadDependencies();

    const uiMode = normalizeUiMode(manifest.uiMode ?? window.ToolNexusConfig?.runtimeUiMode);
    const complexityTier = normalizeComplexityTier(manifest.complexityTier ?? window.ToolNexusConfig?.runtimeComplexityTier);
    const modulePath = manifest.modulePath || window.ToolNexusConfig?.runtimeModulePath;
    const safeResolveLifecycle = async () => {
      let module = {};
      if (!modulePath) {
        return { module, importFailed: false, autoSelected: true };
      }

      const moduleImportStartedAt = now();
      emit('module_import_start', { toolSlug: slug, metadata: { modulePath } });

      let importFailed = false;
      try {
        module = await importModule(modulePath);
        runtimeMetrics.moduleImportTimeMs = now() - moduleImportStartedAt;
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
        runtimeMetrics.moduleImportTimeMs = now() - moduleImportStartedAt;
        importFailed = true;
        setLastError('module-import', error, slug, { modulePath });
        emit('module_import_failure', {
          toolSlug: slug,
          duration: now() - moduleImportStartedAt,
          error: error?.message ?? String(error),
          metadata: { modulePath }
        });
        lifecycleLogger.warn(`Module import failed for "${slug}"; trying legacy lifecycle.`, error);
      }

      return { module, importFailed, autoSelected: false };
    };

    const { module: loadedModule, importFailed } = await safeResolveLifecycle();
    const enforceCustomForTier = complexityTier >= 4;
    const shouldUseAutoModule = uiMode === 'auto' || importFailed || !modulePath;
    const module = shouldUseAutoModule
      ? createAutoToolRuntimeModule({
        manifest: { ...manifest, uiMode, complexityTier, operationSchema: window.ToolNexusConfig?.tool?.operationSchema },
        slug
      })
      : loadedModule;

    if (enforceCustomForTier && uiMode === 'auto') {
      lifecycleLogger.warn(`Tool "${slug}" has complexity tier ${complexityTier} requiring custom UI; auto mode blocked.`);
    }

    const safeMount = async () => {
      const mountStartedAt = now();
      emit('mount_start', { toolSlug: slug });

      let legacyBridgeUsed = false;
      try {
        const capabilities = detectToolCapabilities({ slug, module, manifest, root });
        let result;
        try {
          result = await lifecycleAdapter({ module, slug, root, manifest, context: executionContext, capabilities });
        } catch (error) {
          stateRegistry.incrementRetry(stateKey);
          runtimeMetrics.initRetriesPerformed += 1;
          emit('init_retry', { toolSlug: slug, metadata: { phase: 'lifecycle-init' } });

          const preRetryValidation = normalizeDomValidation(validateDomContract(root));
          if (!preRetryValidation.isValid) {
            adaptDomContract(root, capabilities);
            const retryValidation = normalizeDomValidation(validateDomContract(root));
            if (retryValidation.isValid) {
              result = await lifecycleAdapter({ module, slug, root, manifest, context: executionContext, capabilities });
              logger.info('[DomAdapter] init retry success', { slug });
            } else {
              throw error;
            }
          } else {
            throw error;
          }
        }

        if (result?.normalized) {
          runtimeMetrics.legacyAdapterUsage += 1;
          emit('compatibility_mode_used', { toolSlug: slug, modeUsed: 'legacy' });
        }
        if (result?.autoDestroyGenerated) {
          runtimeMetrics.autoDestroyGenerated += 1;
        }
        const mounted = Boolean(result?.mounted ?? true);
        if (typeof result?.cleanup !== 'function') {
          result = { ...result, cleanup: executionContext.destroy.bind(executionContext) };
        }
        executionContext.addCleanup(result?.cleanup);
        const shouldForceLegacyBootstrap = !mounted || !root.firstElementChild;

        if (shouldForceLegacyBootstrap) {
          legacyBridgeUsed = true;
          emit('compatibility_mode_used', { toolSlug: slug, modeUsed: 'fallback' });
          const legacyExecution = await legacyExecuteTool({ slug, root, module, context: executionContext });
          executionContext.addCleanup(legacyExecution.cleanup);
          if (legacyExecution.mounted) {
            executionContext.addCleanup(() => releaseLegacyInitialization(root, slug));
          }
          const legacyResult = legacyExecution.mounted ? legacyExecution : await legacyBootstrap({
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
              const legacyAutoResult = await legacyAutoInit({ slug, root, manifest, context: executionContext, capabilities });
              executionContext.addCleanup(legacyAutoResult.cleanup);
            }
          }

          if (!root.firstElementChild) {
            fallbackLogger.warn(`No lifecycle rendered UI for "${slug}"; mounting fallback container.`);
          }
        }

        if (ensureRootFallback(root, slug)) {
          emit('mount_fallback_content', { toolSlug: slug });
        }

        const postMountValidation = normalizeDomValidation(validateDomContract(root));
        if (!postMountValidation.isValid) {
          const postMountAdaptation = adaptDomContract(root, capabilities);
          logger.info('[DomAdapter] post-mount adapter applied', { slug, ...postMountAdaptation });
          const postMountRevalidation = normalizeDomValidation(validateDomContract(root));
          if (!postMountRevalidation.isValid) {
            throw new Error(`runtime assertion failed: DOM contract incomplete for "${slug}"`);
          }
        }

        const lifecycleContract = inspectLifecycleContract(module);
        const classification = detectToolClassification({
          hasManifest,
          lifecycleContract,
          modulePath,
          legacyBridgeUsed,
          mountError: importFailed
        });
        logger.info(`Runtime classification for "${slug}": ${classification}.`, {
          classification,
          mountPlan,
          templateLoaded,
          hasManifest,
          hasModulePath: Boolean(modulePath),
          legacyBridgeUsed,
          lifecycle: lifecycleContract
        });

        emit('mount_success', {
          toolSlug: slug,
          duration: now() - mountStartedAt,
          modeUsed: legacyBridgeUsed ? 'legacy' : 'modern'
        });
        runtimeMetrics.mountTimeMs = now() - mountStartedAt;
        stateRegistry.setPhase(stateKey, 'mounted');
        runtimeMetrics.toolsMountedSuccessfully += 1;
        const currentState = stateRegistry.get(stateKey);
        assertPostMount({ root, context: executionContext, slug, state: currentState, lifecycleResult: result });
        root[RUNTIME_CLEANUP_KEY] = async () => {
          await executionContext.destroy();
          stateRegistry.clear(stateKey);
          assertPostDestroy(executionContext, slug, stateRegistry.get(stateKey));
        };
        logger.info(`Tool runtime mounted successfully for "${slug}".`);
      } catch (error) {
        const lifecycleContract = inspectLifecycleContract(module);
        const classification = detectToolClassification({
          hasManifest,
          lifecycleContract,
          modulePath,
          legacyBridgeUsed,
          mountError: true
        });
        setLastError('mount', error, slug, { classification });
        stateRegistry.setFailure(stateKey, error?.message ?? String(error));
        emit('mount_failure', {
          toolSlug: slug,
          duration: now() - mountStartedAt,
          error: error?.message ?? String(error),
          modeUsed: legacyBridgeUsed ? 'legacy' : 'fallback',
          errorCategory: classifyRuntimeError({ stage: 'mount', message: error?.message, eventName: 'mount_failure' })
        });
        runtimeMetrics.mountTimeMs = now() - mountStartedAt;

        emit('healing_attempt', { toolSlug: slug });
        emit('tool_self_heal_triggered', { toolSlug: slug });

        let healedByCompatibilityFlow = false;
        try {
          adaptDomContract(root, detectToolCapabilities({ slug, module, manifest, root }));
          const retried = await lifecycleAdapter({ module, slug, root, manifest, context: executionContext, capabilities: detectToolCapabilities({ slug, module, manifest, root }) });
          if (retried?.mounted) {
            healedByCompatibilityFlow = true;
          }
        } catch {}

        if (!healedByCompatibilityFlow) {
          try {
            const bridged = await legacyExecuteTool({ slug, root, module, context: executionContext });
            healedByCompatibilityFlow = Boolean(bridged?.mounted);
          } catch {}
        }

        if (!healedByCompatibilityFlow) {
          await new Promise((resolve) => setTimeout(resolve, 0));
          stateRegistry.incrementRetry(stateKey);
          runtimeMetrics.initRetriesPerformed += 1;
          emit('init_retry', { toolSlug: slug, metadata: { phase: 'healing-loop' } });
        }

        if (healedByCompatibilityFlow) {
          stateRegistry.setPhase(stateKey, 'mounted');
          runtimeMetrics.toolsMountedSuccessfully += 1;
          emit('healing_success', { toolSlug: slug });
          return;
        }

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
        ensureRootFallback(root, slug, { force: true });
      }
    };

    await safeMount();

    if (ensureRootFallback(root, slug)) {
      emit('mount_fallback_content', { toolSlug: slug, metadata: { phase: 'post-bootstrap' } });
    }

    emit('bootstrap_complete', { toolSlug: slug, duration: now() - runtimeStartedAt });
    runtimeMetrics.runtimeBootTimeMs = now() - runtimeStartedAt;
    logger.info(`Bootstrap completed for "${slug}".`);
  }

  async function bootstrapToolRuntime() {
    const root = getRoot();
    registerDebugValidation(getRoot);
    exposeDiagnosticsApi();
    if (!root) {
      return;
    }

    if (root[RUNTIME_BOOT_KEY]) {
      runtimeMetrics.skippedDuplicateBoots += 1;
      await root[RUNTIME_BOOT_KEY];
      return;
    }

    root[RUNTIME_BOOT_KEY] = (async () => {
      await runPreviousCleanup(root);

      const slug = (root.dataset.toolSlug || '').trim();
      if (!slug) {
        logger.error('Missing tool slug on #tool-root.');
        return;
      }

      logger.info(`Bootstrapping tool runtime for "${slug}".`);

      try {
        await safeMountTool({ root, slug });
      } catch (error) {
        setLastError('runtime', error, slug);
        fallbackLogger.warn(`Unexpected runtime failure for "${slug}"; using fallback container.`, error);
        ensureRootFallback(root, slug);
      }
    })();

    try {
      await root[RUNTIME_BOOT_KEY];
    } finally {
      delete root[RUNTIME_BOOT_KEY];
    }
  }

  return {
    bootstrapToolRuntime,
    getLastError: () => lastError,
    getDiagnostics: () => ({
      ...runtimeMetrics,
      registry: stateRegistry.summary(),
      observability: observability.getSnapshot().metrics
    })
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
if (typeof document !== 'undefined' && document.getElementById('tool-root')) {
  scheduleNonCriticalTask(() => {
    runtime.bootstrapToolRuntime().catch((error) => {
      runtimeLogger.warn('[ToolRuntime] bootstrap task failed safely.', {
        message: error?.message ?? String(error)
      });
    });
  });
}
