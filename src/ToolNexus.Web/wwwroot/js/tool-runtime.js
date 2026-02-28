import { runtimeObserver } from './runtime/runtime-observer.js';
import { dependencyLoader as defaultDependencyLoader } from './runtime/dependency-loader.js';
import { loadToolTemplate as defaultTemplateLoader } from './runtime/tool-template-loader.js';
import { mountToolLifecycle as defaultLifecycleAdapter, legacyAutoInit as defaultLegacyAutoInit, inspectLifecycleContract } from './runtime/tool-lifecycle-adapter.js';
import { bindTemplateData as defaultTemplateBinder } from './runtime/tool-template-binder.js';
import { bootstrapLegacyTool as defaultLegacyBootstrap } from './runtime/legacy-tool-bootstrap.js';
import { validateToolDom as defaultDomContractValidator } from './runtime/tool-dom-contract-validator.js';
import { adaptToolDom as defaultDomAdapter } from './runtime/tool-dom-adapter.js';
import { LAYOUT_TYPES } from './runtime/tool-dom-contract.js';
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
import { createToolContainerManager, normalizeToolMountMode } from './runtime/tool-container-manager.js';
import { createRuntimeCrashOverlay } from './runtime/runtime-crash-overlay.js';
import { guardInvalidLifecycleResult } from './runtime/tool-execution-normalizer.js';
import { assertDomContractRootsUnchanged, freezeDomContractRoots } from './runtime/tool-dom-contract-guard.js';
import { isModuleContractError, validateModuleContract } from './runtime/module-contract-validator.js';

const RUNTIME_CLEANUP_KEY = '__toolNexusRuntimeCleanup';
const RUNTIME_BOOT_KEY = '__toolNexusRuntimeBootPromise';
const RUNTIME_RESOLUTION_MODES = Object.freeze({
  AUTO_EXPLICIT: 'auto_explicit',
  AUTO_FALLBACK: 'auto_fallback',
  CUSTOM_ACTIVE: 'custom_active',
  CUSTOM_FAILED: 'custom_failed'
});

const RUNTIME_TYPES = Object.freeze({
  AUTO: 'auto',
  CUSTOM: 'custom'
});

function createRuntimeIdentityDescriptor({
  runtimeType = RUNTIME_TYPES.AUTO,
  uiMode = 'auto',
  resolutionMode = 'explicit',
  loaderDecision = 'auto_mode_selected',
  moduleSource = 'module-missing',
  executionLanguage = 'javascript'
} = {}) {
  return {
    runtimeType,
    uiMode,
    resolutionMode,
    loaderDecision,
    moduleSource,
    executionLanguage
  };
}


function isDevelopmentEnvironment() {
  const environment = String(window.ToolNexusConfig?.runtimeEnvironment ?? window.ToolNexusConfig?.environment ?? '').trim().toLowerCase();
  return environment === 'development';
}

function isDevelopmentRuntime() {
  const environment = String(window.ToolNexusConfig?.runtimeEnvironment ?? window.ToolNexusConfig?.environment ?? '').trim().toLowerCase();
  if (environment) {
    return environment === 'development';
  }

  return Boolean(window.ToolNexusLogging?.runtimeDebugEnabled);
}

function isDevOrTestEnvironment() {
  const environment = String(window.ToolNexusConfig?.runtimeEnvironment ?? window.ToolNexusConfig?.environment ?? '').trim().toLowerCase();
  return environment === 'development' || environment === 'test' || environment === 'testing';
}

function shouldExposeRuntimeErrors() {
  return (
    isDevelopmentEnvironment()
    || window.ToolNexusLogging?.runtimeDebugEnabled === true
    || window.ToolNexusConfig?.adminRuntimeDebug === true
  );
}

function shouldShowRuntimeCrashOverlay() {
  return (
    window.ToolNexusConfig?.isAdmin === true
    || window.ToolNexusLogging?.runtimeDebugEnabled === true
    || isDevelopmentEnvironment()
  );
}

function isStrictModeEnabled() {
  if (window.ToolNexusConfig?.runtimeStrictMode === true) {
    return true;
  }

  const runtimeStrictFlag = window.ToolNexusRuntime?.strict === true;
  if (!runtimeStrictFlag) {
    return false;
  }

  return true;
}

const TOOL_MOUNT_MODES = Object.freeze({
  FULLSCREEN: 'fullscreen',
  PANEL: 'panel',
  INLINE: 'inline',
  POPOVER: 'popover',
  COMMAND: 'command'
});

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

function getCanonicalToolRoot() {
  const root = document.getElementById('tool-root');
  if (!root) {
    throw new Error('ToolShell root missing');
  }

  return root;
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
  getRoot = getCanonicalToolRoot,
  loadManifest: loadManifestOverride,
  importModule = (modulePath) => import(modulePath),
  healRuntime = async () => false,
  now = () => (globalThis.performance?.now?.() ?? Date.now()),
  createToolStateRegistry = defaultCreateToolStateRegistry,
  createRuntimeObservability = defaultCreateRuntimeObservability,
  containerManager = createToolContainerManager({ doc: document })
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

  const unsubscribeLifecycleRetryDiagnostics = () => {};

  function setLastError(stage, error, slug, metadata = {}) {
    lastError = {
      stage,
      slug,
      message: error?.message ?? String(error),
      metadata,
      timestamp: new Date().toISOString()
    };
  }

  function showRuntimeCrashOverlay(root, details = {}) {
    if (!shouldShowRuntimeCrashOverlay()) {
      return null;
    }

    const overlayRoot = root ?? getRoot();
    if (!overlayRoot) {
      return null;
    }

    const payload = {
      root: overlayRoot,
      toolSlug: details.toolSlug ?? 'unknown-tool',
      phase: details.phase ?? 'unknown-phase',
      errorMessage: details.errorMessage ?? 'Unknown runtime error',
      stack: details.stack,
      runtimeIdentity: details.runtimeIdentity,
      classification: details.classification ?? 'runtime_error'
    };

    const overlay = createRuntimeCrashOverlay(payload);
    if (overlay) {
      logger.error('[RuntimeCrashOverlay] displayed', {
        toolSlug: payload.toolSlug,
        phase: payload.phase,
        classification: payload.classification,
        runtimeIdentity: payload.runtimeIdentity,
        errorMessage: payload.errorMessage
      });
    }

    return overlay;
  }

  function renderContractError(root, errors) {
    if (!root) {
      return;
    }

    const shell = root.matches?.('[data-tool-shell]') ? root : root.querySelector?.('[data-tool-shell]');
    const outputZone = shell?.querySelector?.('[data-tool-output]') ?? root;
    const errorPanel = document.createElement('div');
    errorPanel.className = 'tool-contract-error';

    const heading = document.createElement('h3');
    heading.textContent = 'Tool Template Contract Failed';
    const detail = document.createElement('pre');
    detail.textContent = errors.join('\n');
    errorPanel.append(heading, detail);

    outputZone.append(errorPanel);
  }



  const TOOL_SHELL_REQUIRED_SELECTORS = Object.freeze([
    '[data-tool-shell]',
    '[data-tool-context]',
    '[data-tool-input]',
    '[data-tool-status]',
    '[data-tool-output]',
    '[data-tool-followup]',
    '[data-tool-content-host]'
  ]);

  function hasToolShellContract(root) {
    if (!root) {
      return false;
    }

    return TOOL_SHELL_REQUIRED_SELECTORS.every((selector) =>
      Boolean(root.matches?.(selector) || root.querySelector?.(selector)));
  }

  async function waitForToolShellContract(root, timeout = 3000) {
    const start = now();
    while ((now() - start) < timeout) {
      if (hasToolShellContract(root)) {
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, 16));
    }

    return hasToolShellContract(root);
  }

  function ensureToolShellAnchors(root) {
    if (!root) {
      return { ready: false, repaired: false, missing: [...TOOL_SHELL_REQUIRED_SELECTORS] };
    }

    const shell = root.matches?.('[data-tool-shell]') ? root : root.querySelector?.('[data-tool-shell]');
    if (!shell) {
      return { ready: false, repaired: false, missing: ['[data-tool-shell]'] };
    }

    const missing = TOOL_SHELL_REQUIRED_SELECTORS.filter((selector) => !shell.querySelector(selector) && !shell.matches(selector));
    if (missing.length > 0) {
      const message = `ToolShell canonical anchors missing: ${missing.join(', ')}`;
      if (isDevOrTestEnvironment()) {
        throw new Error(message);
      }

      logger.warn('[DomContract] canonical anchors missing; continuing in production compatibility mode.', {
        missing,
        runtimeTemplateMountMode: window.ToolNexusConfig?.runtimeTemplateMountMode ?? 'content-host'
      });
    }

    return {
      ready: missing.length === 0,
      repaired: false,
      missing
    };
  }

  function renderRuntimeErrorState(root, { slug, message }) {
    const shell = root?.querySelector?.('[data-tool-shell]');
    if (!shell) {
      logger.warn('[RuntimeError] ToolShell anchors missing; runtime error details could not be rendered.', { slug });
      return;
    }

    shell.dataset.runtimeState = 'error';
    const status = shell.querySelector('[data-tool-status]');
    const output = shell.querySelector('[data-tool-output]');

    if (status) {
      status.textContent = 'Runtime error';
      status.setAttribute('role', 'status');
    }

    if (output) {
      const panel = document.createElement('section');
      panel.className = 'tool-runtime-fallback__error';
      panel.setAttribute('role', 'alert');
      panel.textContent = message;
      output.append(panel);
    }
  }

  function resolveValidationScope(_root, phase = 'unspecified') {
    const scope = getCanonicalToolRoot();

    logger.info('[DomContract] validation scope resolved', {
      phase,
      rootTag: String(scope?.tagName ?? scope?.nodeName ?? '').toLowerCase(),
      rootId: scope?.id ?? '',
      rootClass: scope?.className ?? '',
      isRootToolRoot: scope?.id === 'tool-root',
      scopeTag: String(scope?.tagName ?? scope?.nodeName ?? '').toLowerCase(),
      scopeId: scope?.id ?? '',
      scopeClass: scope?.className ?? '',
      scopeIsToolRoot: scope?.id === 'tool-root',
      runtimeContainerTag: '',
      runtimeContainerId: '',
      toolRootTag: '',
      toolRootId: ''
    });

    return {
      scope
    };
  }

  function validateDomAtPhase(root, phase = 'unspecified') {
    const resolved = resolveValidationScope(root, phase);
    const validation = normalizeDomValidation(validateDomContract(resolved.scope, { phase }));
    return {
      ...resolved,
      validation
    };
  }

  function isToolShell(root) {
    return Boolean(root?.querySelector?.('[data-tool-shell]') || root?.matches?.('[data-tool-shell]'));
  }

  function assertShellIntegrity(root) {
    const required = [
      'data-tool-shell',
      'data-tool-context',
      'data-tool-status',
      'data-tool-followup',
      'data-tool-content-host'
    ];

    const missing = required.filter((attribute) => !root?.querySelector?.(`[${attribute}]`) && !root?.matches?.(`[${attribute}]`));
    if (missing.length > 0) {
      throw new Error(`ToolShell integrity violation: missing ${missing.join(', ')}`);
    }
  }

  function logPostMountFailureDiagnostics({ root, scope, phase, validation, mountPlan }) {
    logger.warn('[DomContract] post-mount contract failure diagnostics', {
      phase,
      missingNodes: validation?.missingNodes ?? [],
      detectedLayoutType: validation?.detectedLayoutType ?? 'UNKNOWN_LAYOUT',
      mountStrategy: mountPlan?.mode ?? 'unknown',
      scopeTag: String(scope?.tagName ?? scope?.nodeName ?? '').toLowerCase(),
      scopeId: scope?.id ?? '',
      scopeClass: scope?.className ?? '',
      outerHtmlSnippet: String(scope?.outerHTML ?? root?.outerHTML ?? '').slice(0, 500)
    });
  }


  function hasCompleteContractAcrossResolvedScopes(root) {
    const resolved = resolveValidationScope(root, 'post-mount-pre-adapter-recheck');
    const rootValidation = normalizeDomValidation(validateDomContract(
      resolved.scope,
      { phase: 'post-mount-root-recheck' }
    ));

    return {
      resolved,
      runtimeContainerValidation: rootValidation,
      toolRootValidation: rootValidation,
      isContractCompliant: rootValidation.isValid
    };
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
    logger.info('[DomContract] validation', { slug, phase: 'pre-mount' });
    let scopedValidation = validateDomAtPhase(root, 'pre-mount');
    let validation = scopedValidation.validation;

    if (validation.isValid) {
      logger.info('[DomAdapter] NO adapter applied', {
        slug,
        phase: 'pre-mount',
        reason: 'dom_contract_valid',
        detectedLayoutType: validation.detectedLayoutType
      });
      return validation;
    }

    if (isToolShell(root)) {
      logger.info('[DomAdapter] NO adapter applied', {
        slug,
        phase: 'pre-mount',
        reason: 'toolshell_runtime',
        detectedLayoutType: validation.detectedLayoutType,
        missingNodes: validation.missingNodes
      });
      return validation;
    }

    if (validation.detectedLayoutType !== LAYOUT_TYPES.LEGACY_LAYOUT) {
      logger.info('[DomAdapter] NO adapter applied', {
        slug,
        phase: 'pre-mount',
        reason: 'non_legacy_layout',
        detectedLayoutType: validation.detectedLayoutType,
        missingNodes: validation.missingNodes
      });
      return validation;
    }

    logger.info('[DomAdapter] legacy layout detected', {
      slug,
      phase: 'pre-mount',
      detectedLayoutType: validation.detectedLayoutType,
      missingNodes: validation.missingNodes
    });

    const adapted = adaptDomContract(scopedValidation.scope ?? root, capability);
    logger.info('[DomAdapter] adapter applied', { slug, phase: 'pre-mount', ...adapted });

    scopedValidation = validateDomAtPhase(root, 'pre-mount-after-adapter');
    validation = scopedValidation.validation;
    return validation;
  }

  function registerDebugValidation(rootProvider) {
    const globalDebug = (window.ToolNexus ??= {});
    globalDebug.debug ??= {};
    globalDebug.debug.validateDom = () => {
      const currentRoot = rootProvider();
      const currentSlug = (currentRoot?.dataset?.toolSlug || '').trim();
      const report = validateDomAtPhase(currentRoot, 'debug-hook').validation;
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

    const shell = root.querySelector('[data-tool-shell]');
    if (!shell) {
      return false;
    }

    if (!force && shell.childElementCount > 0) {
      return false;
    }

    renderRuntimeErrorState(root, {
      slug,
      message: 'Runtime output unavailable.'
    });

    shell.dataset.runtimeFallback = 'true';
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
    runtimeApi.getActiveMounts = () => containerManager.getActiveMounts();
    runtimeApi.unmountTool = async (mountId) => {
      if (!mountId || mountId === 'fullscreen-root') {
        return false;
      }

      return containerManager.unmount(mountId);
    };
    runtimeApi.invokeTool = async (toolId, options = {}) => {
      const slug = String(toolId ?? '').trim();
      if (!slug) {
        throw new Error('toolId is required for invokeTool');
      }

      const mounted = await mountInvocationTarget({ toolId: slug, options, defaults: { mountMode: TOOL_MOUNT_MODES.FULLSCREEN } });
      mounted.root.dataset.toolSlug = slug;
      mounted.root.dataset.mountMode = mounted.mountMode;
      if (options.contextMetadata && typeof options.contextMetadata === 'object') {
        mounted.root.dataset.contextMetadata = JSON.stringify(options.contextMetadata);
      }

      await safeMountTool({ root: mounted.root, slug });

      if (options.initialInput !== undefined) {
        const editor = mounted.root.querySelector('#inputEditor, textarea, input[type="text"], [data-field="payload"]');
        if (editor && 'value' in editor) {
          editor.value = typeof options.initialInput === 'string'
            ? options.initialInput
            : JSON.stringify(options.initialInput);
        }
      }

      if (mounted.mountId !== 'fullscreen-root') {
        containerManager.setCleanup(mounted.mountId, mounted.root[RUNTIME_CLEANUP_KEY]);
      }

      return {
        mountId: mounted.mountId,
        mountMode: mounted.mountMode,
        root: mounted.root,
        unmount: async () => {
          if (mounted.mountId === 'fullscreen-root') {
            await mounted.cleanup();
            return true;
          }

          return containerManager.unmount(mounted.mountId);
        }
      };
    };
  }


  function buildInvocationConfig({ options = {}, defaults = {} } = {}) {
    const mountMode = normalizeToolMountMode(options.mountMode ?? defaults.mountMode ?? TOOL_MOUNT_MODES.FULLSCREEN);
    return {
      mountMode,
      initialInput: options.initialInput ?? null,
      contextMetadata: options.contextMetadata ?? {}
    };
  }

  async function mountInvocationTarget({ toolId, options = {}, defaults = {} } = {}) {
    const invocation = buildInvocationConfig({ options, defaults });
    if (invocation.mountMode === TOOL_MOUNT_MODES.FULLSCREEN) {
      const root = getRoot();
      if (!root) {
        throw new Error('runtime assertion failed: root missing for invocation');
      }

      await runPreviousCleanup(root);
      root.dataset.mountMode = TOOL_MOUNT_MODES.FULLSCREEN;

      return {
        mountId: 'fullscreen-root',
        root,
        mountMode: invocation.mountMode,
        async cleanup() {
          await runPreviousCleanup(root);
        }
      };
    }

    const host = options.host ?? getRoot()?.parentElement ?? document.body;
    const mounted = containerManager.mount({
      host,
      toolId,
      mountMode: invocation.mountMode
    });

    return {
      mountId: mounted.mountId,
      root: mounted.root,
      mountMode: mounted.mountMode,
      async cleanup() {
        await containerManager.unmount(mounted.mountId);
      }
    };
  }

  function detectToolClassification({ hasManifest, lifecycleContract, modulePath, legacyBridgeUsed, mountError, moduleContractInvalid = false }) {
    if (moduleContractInvalid) {
      return 'module_contract_error';
    }

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
        }),
        emitTelemetry: (eventName, payload = {}) => emit(eventName, payload)
      }
    });

    const runtimeResolution = {
      mode: RUNTIME_RESOLUTION_MODES.AUTO_EXPLICIT,
      reason: 'auto_mode_selected'
    };

    const runtimeIdentity = createRuntimeIdentityDescriptor();
    let moduleContractInvalid = false;

    function inferIdentityResolutionMode(mode) {
      if (mode === RUNTIME_RESOLUTION_MODES.AUTO_FALLBACK) {
        return 'fallback';
      }

      return 'explicit';
    }

    function inferIdentityType(mode) {
      return mode === RUNTIME_RESOLUTION_MODES.CUSTOM_ACTIVE ? RUNTIME_TYPES.CUSTOM : RUNTIME_TYPES.AUTO;
    }

    function inferIdentitySource({ mode, modulePath }) {
      if (mode === RUNTIME_RESOLUTION_MODES.CUSTOM_ACTIVE) {
        return 'custom-module';
      }

      if (moduleContractInvalid) {
        return 'module-contract-invalid';
      }

      if (mode === RUNTIME_RESOLUTION_MODES.AUTO_FALLBACK) {
        return modulePath ? 'module-missing' : 'auto-module';
      }

      return modulePath ? 'auto-module' : 'module-missing';
    }

    function buildRuntimeIdentityTelemetry(identity) {
      return {
        'runtime.identity.type': identity.runtimeType,
        'runtime.identity.mode': identity.resolutionMode,
        'runtime.identity.source': identity.moduleSource
      };
    }

    function syncRuntimeIdentity(target, { modulePath } = {}) {
      const resolvedIdentity = createRuntimeIdentityDescriptor({
        runtimeType: inferIdentityType(runtimeResolution.mode),
        uiMode: runtimeIdentity.uiMode,
        resolutionMode: inferIdentityResolutionMode(runtimeResolution.mode),
        loaderDecision: runtimeResolution.reason,
        moduleSource: inferIdentitySource({ mode: runtimeResolution.mode, modulePath }),
        executionLanguage: runtimeIdentity.executionLanguage
      });

      Object.assign(runtimeIdentity, resolvedIdentity);

      const telemetryTags = buildRuntimeIdentityTelemetry(runtimeIdentity);
      executionContext.runtimeMetadata = {
        ...(executionContext.runtimeMetadata ?? {}),
        runtimeResolutionMode: runtimeResolution.mode,
        runtimeResolutionReason: runtimeResolution.reason,
        runtimeIdentity: { ...runtimeIdentity },
        telemetryTags
      };
      executionContext.manifest = executionContext.manifest && typeof executionContext.manifest === 'object'
        ? executionContext.manifest
        : {};
      executionContext.manifest.runtimeResolutionMode = runtimeResolution.mode;
      executionContext.manifest.runtimeResolutionReason = runtimeResolution.reason;
      executionContext.manifest.runtimeIdentity = { ...runtimeIdentity };
      executionContext.runtimeIdentity = { ...runtimeIdentity };
      if (root?.dataset) {
        root.dataset.runtimeResolutionMode = runtimeResolution.mode;
        root.dataset.runtimeResolutionReason = runtimeResolution.reason;
        root.dataset.runtimeIdentityType = runtimeIdentity.runtimeType;
        root.dataset.runtimeIdentityMode = runtimeIdentity.resolutionMode;
        root.dataset.runtimeIdentitySource = runtimeIdentity.moduleSource;
      }

      return telemetryTags;
    }

    function setRuntimeResolution(mode, reason) {
      runtimeResolution.mode = mode;
      runtimeResolution.reason = reason;
    }

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
        const templateTarget = root;
        await templateLoader(slug, templateTarget, { templatePath: manifest.templatePath });
        logger.info('[RuntimeOwnership] template target = content-host', { slug, target: '[data-tool-content-host]' });
        logger.info('[RuntimeOwnership] shell anchors preserved', { slug, immutableAnchors: true });
        logger.info('[RuntimeOwnership] no mutation performed', { slug, mutation: 'none' });
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
    ensureToolShellAnchors(root);

    templateBinder(root, window.ToolNexusConfig ?? {});

    try {
      assertShellIntegrity(root);
    } catch (error) {
      setLastError('dom-contract', error, slug);
      const errorMessage = error?.message ?? String(error);
      emit(isDevOrTestEnvironment() ? 'dom_contract_failure' : 'dom_contract_warning', { toolSlug: slug, metadata: { errors: [errorMessage] } });
      if (isDevOrTestEnvironment()) {
        renderRuntimeErrorState(root, {
          slug,
          message: errorMessage || 'ToolShell integrity validation failed.'
        });
        return;
      }
      logger.warn('[DomContract] ToolShell integrity warning (production compatibility mode).', { slug, error: errorMessage });
    }

    const contractReady = await waitForToolShellContract(root, 3000);
    if (!contractReady) {
      const errors = ['[DOM CONTRACT ERROR]', ...TOOL_SHELL_REQUIRED_SELECTORS.map((selector) => `Missing node: ${selector}`)];
      const message = `tool-runtime: ToolShell anchors unavailable for "${slug}"`;
      logger.warn(message, errors);
      emit(isDevOrTestEnvironment() || isStrictModeEnabled() ? 'dom_contract_failure' : 'dom_contract_warning', { toolSlug: slug, metadata: { errors } });
      if (isDevOrTestEnvironment() || isStrictModeEnabled()) {
        throw new Error(errors.join('\n'));
      }
    }

    let validation = ensureDomContract(root, slug, capabilitiesAtStart);
    if (!validation.isValid) {
      const message = `tool-runtime: DOM contract invalid for "${slug}"`;
      const errors = ['[DOM CONTRACT ERROR]', ...validation.missingNodes.map((nodeName) => `Missing node: ${nodeName}`)];
      logger.error(message, errors);
      emit('dom_contract_failure', { toolSlug: slug, metadata: { errors } });
      showRuntimeCrashOverlay(root, {
        toolSlug: slug,
        phase: 'dom_contract_failure',
        errorMessage: message,
        stack: errors.join('\n'),
        runtimeIdentity: { ...runtimeIdentity },
        classification: 'contract_violation'
      });

      if (isDevOrTestEnvironment() || isStrictModeEnabled()) {
        throw new Error(errors.join('\n'));
      }

      logger.warn('[DomContract] invalid contract tolerated in production compatibility mode.', { slug, errors });
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
    runtimeIdentity.uiMode = uiMode;
    const safeResolveLifecycle = async () => {
      let module = {};
      let lifecycleContract = inspectLifecycleContract(module);
      if (!modulePath) {
        setRuntimeResolution(RUNTIME_RESOLUTION_MODES.AUTO_EXPLICIT, 'auto_mode_no_module_path');
        return { module, lifecycleContract, importFailed: false, autoSelected: true };
      }

      const moduleImportStartedAt = now();
      emit('module_import_start', { toolSlug: slug, metadata: { modulePath } });

      let importFailed = false;
      try {
        module = await importModule(modulePath);
        validateModuleContract(module, [
          'create',
          'init'
        ], slug);

        const kernelModule = await import('./tools/tool-platform-kernel.js');
        validateModuleContract(kernelModule, [
          'normalizeToolRoot',
          'getToolPlatformKernel'
        ], 'tool-platform-kernel');

        runtimeMetrics.moduleImportTimeMs = now() - moduleImportStartedAt;
        lifecycleContract = inspectLifecycleContract(module);
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
        const contractInvalid = isModuleContractError(error);
        moduleContractInvalid = contractInvalid;
        setLastError('module-import', error, slug, { modulePath });
        const reasonPrefix = contractInvalid
          ? 'custom_module_contract_invalid'
          : 'custom_module_import_failed';
        const importReason = `${reasonPrefix}:${error?.message ?? 'unknown_error'}`;
        setRuntimeResolution(RUNTIME_RESOLUTION_MODES.CUSTOM_FAILED, importReason);
        emit('module_import_failure', {
          toolSlug: slug,
          duration: now() - moduleImportStartedAt,
          error: error?.message ?? String(error),
          metadata: {
            modulePath,
            classification: contractInvalid ? 'module_contract_error' : 'runtime_error',
            runtimeResolutionMode: RUNTIME_RESOLUTION_MODES.CUSTOM_FAILED,
            runtimeResolutionReason: importReason
          }
        });
        emit('runtime_resolution', {
          toolSlug: slug,
          metadata: {
            runtimeResolutionMode: RUNTIME_RESOLUTION_MODES.CUSTOM_FAILED,
            runtimeResolutionReason: importReason
          }
        });
        if (isDevelopmentRuntime()) {
          console.warn(`[ToolRuntime] Custom runtime import failed for "${slug}". Falling back to auto runtime.`, {
            modulePath,
            error: error?.message ?? String(error)
          });
        }
        renderRuntimeErrorState(root, {
          slug,
          message: error?.message ?? 'Runtime module failed to load.'
        });
        showRuntimeCrashOverlay(root, {
          toolSlug: slug,
          phase: 'module_import_failure',
          errorMessage: error?.message ?? String(error),
          stack: error?.stack,
          runtimeIdentity: { ...runtimeIdentity },
          classification: contractInvalid ? 'module_contract_error' : 'runtime_error'
        });

        if (contractInvalid && isDevelopmentRuntime()) {
          throw error;
        }

        if (contractInvalid && !isDevelopmentRuntime()) {
          fallbackLogger.warn(`[ModuleContract] Invalid module export contract for "${slug}"; continuing with auto runtime fallback.`, {
            modulePath,
            error: error?.message ?? String(error)
          });
        }

        lifecycleLogger.warn(`Module import failed for "${slug}"; trying legacy lifecycle.`, error);
      }

      return { module, lifecycleContract, importFailed, autoSelected: false };
    };

    const { module: loadedModule, lifecycleContract, importFailed } = await safeResolveLifecycle();

    const enforceCustomForTier = complexityTier >= 4;
    const templateIsLegacyOrMinimal = validation.detectedLayoutType === LAYOUT_TYPES.LEGACY_LAYOUT
      || validation.detectedLayoutType === LAYOUT_TYPES.MINIMAL_LAYOUT;
    const shouldForceImportedLifecycle = Boolean(
      modulePath
      && !importFailed
      && lifecycleContract?.compliant
      && validation.isValid
    );
    const shouldUseAutoModule = !shouldForceImportedLifecycle
      && (importFailed || !modulePath || templateIsLegacyOrMinimal);
    if (shouldUseAutoModule) {
      if (importFailed) {
        setRuntimeResolution(RUNTIME_RESOLUTION_MODES.AUTO_FALLBACK, 'auto_loaded_after_custom_runtime_failure');
      } else if (!modulePath) {
        setRuntimeResolution(RUNTIME_RESOLUTION_MODES.AUTO_EXPLICIT, 'auto_loaded_without_custom_module_path');
      } else if (templateIsLegacyOrMinimal) {
        setRuntimeResolution(RUNTIME_RESOLUTION_MODES.AUTO_EXPLICIT, 'auto_loaded_for_legacy_or_minimal_template');
      } else {
        setRuntimeResolution(RUNTIME_RESOLUTION_MODES.AUTO_EXPLICIT, 'auto_mode_selected');
      }
    } else {
      const resolutionReason = shouldForceImportedLifecycle
        ? 'custom_runtime_forced_lifecycle_contract'
        : 'custom_runtime_loaded';
      setRuntimeResolution(RUNTIME_RESOLUTION_MODES.CUSTOM_ACTIVE, resolutionReason);
    }

    const runtimeIdentityTags = syncRuntimeIdentity(root, { modulePath });

    if (isDevelopmentRuntime()) {
      console.info(`Tool Runtime Identity:\n${runtimeIdentity.runtimeType} / ${runtimeIdentity.resolutionMode} / ${runtimeIdentity.moduleSource}`);
    }

    emit('runtime_resolution', {
      toolSlug: slug,
      metadata: {
        runtimeResolutionMode: runtimeResolution.mode,
        runtimeResolutionReason: runtimeResolution.reason,
        runtimeIdentity: { ...runtimeIdentity },
        ...runtimeIdentityTags
      }
    });

    const module = shouldUseAutoModule
      ? createAutoToolRuntimeModule({
        manifest: {
          ...manifest,
          uiMode,
          complexityTier,
          operationSchema: window.ToolNexusConfig?.tool?.operationSchema,
          runtimeResolutionMode: runtimeResolution.mode,
          runtimeResolutionReason: runtimeResolution.reason,
          runtimeIsDevelopment: isDevelopmentRuntime()
        },
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
      const strictMode = isStrictModeEnabled();
      try {
        const capabilities = detectToolCapabilities({ slug, module, manifest, root });
        const childCountBeforeLifecycle = root?.childElementCount ?? 0;
        const contractRootSnapshot = freezeDomContractRoots(root);
        let result;
        try {
          result = await lifecycleAdapter({ module, slug, root, manifest, context: executionContext, capabilities });
          const shouldAssertLifecycleRoots = strictMode && String(result?.mode ?? '') === 'module.lifecycle-contract';
          if (shouldAssertLifecycleRoots) {
            assertDomContractRootsUnchanged(contractRootSnapshot, 'mount.lifecycle');
          }
          guardInvalidLifecycleResult(result, { slug, mode: result?.mode ?? 'unknown', phase: 'mount.result' });
        } catch (error) {
          if (strictMode || shouldExposeRuntimeErrors()) {
            console.error(`[ToolRuntime DEV] Lifecycle crash for "${slug}"`, error);
            emit('lifecycle_crash_dev', {
              toolSlug: slug,
              error: error?.stack ?? error?.message ?? String(error)
            });
            showRuntimeCrashOverlay(root, {
              toolSlug: slug,
              phase: 'lifecycle_retry_failure',
              errorMessage: error?.message ?? String(error),
              stack: error?.stack,
              runtimeIdentity: { ...runtimeIdentity },
              classification: 'runtime_error'
            });
            throw error;
          }

          throw error;
        }


        const legacyLifecycleMode = String(result?.mode ?? '');
        if (legacyLifecycleMode.startsWith('legacy') || legacyLifecycleMode.startsWith('window.')) {
          runtimeMetrics.legacyAdapterUsage += 1;
          emit('compatibility_mode_used', { toolSlug: slug, modeUsed: 'legacy' });
        }
        if (result?.autoDestroyGenerated) {
          runtimeMetrics.autoDestroyGenerated += 1;
        }
        const executionOnlyLifecycle = String(result?.mode ?? '').includes('execution-only');
        const mounted = executionOnlyLifecycle ? true : Boolean(result?.mounted ?? true);
        if (typeof result?.cleanup !== 'function') {
          result = { ...result, cleanup: executionContext.destroy.bind(executionContext) };
        }
        executionContext.addCleanup(result?.cleanup);
        const lifecycleMode = String(result?.mode ?? '');
        const lifecycleAlreadyExecuted = lifecycleMode.includes('runTool') && !lifecycleMode.includes('execution-only');
        const shouldForceLegacyBootstrap = (!mounted || !root.firstElementChild) && !lifecycleAlreadyExecuted;

        if (shouldForceLegacyBootstrap) {
          if (strictMode) {
            throw new Error(`Strict runtime mode disallows legacy execution bridge for "${slug}".`);
          }
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
              if (!hasToolShellContract(root)) {
                const legacyAutoResult = await legacyAutoInit({ slug, root, manifest, context: executionContext, capabilities });
                executionContext.addCleanup(legacyAutoResult.cleanup);
              } else {
                logger.info('[DomAdapter] legacy adapter skipped', {
                  slug,
                  phase: 'fallback',
                  reason: 'toolshell_contract_present'
                });
              }
            }
          }

          if (!root.firstElementChild) {
            fallbackLogger.warn(`No lifecycle rendered UI for "${slug}"; mounting fallback container.`);
          }
        }

        if (ensureRootFallback(root, slug)) {
          emit('mount_fallback_content', { toolSlug: slug });
        }

        const childCountAfterLifecycle = root?.childElementCount ?? 0;
        ensureToolShellAnchors(root);
        assertShellIntegrity(root);
        const rootBeforePostMount = root;
        const preValidationRootElement = document.getElementById('tool-root');
        const postMountScopedValidation = validateDomAtPhase(root, 'post-mount');
        const postMountValidation = postMountScopedValidation.validation;
        const rootAfterPostMount = root;
        const currentToolRootElement = document.getElementById('tool-root');
        const rootReferenceChanged = rootBeforePostMount !== rootAfterPostMount;
        const toolRootElementChanged = preValidationRootElement !== currentToolRootElement;

        logger.info('[DomContract] post-mount root integrity', {
          slug,
          rootReferenceChanged,
          toolRootElementChanged,
          rootIsCurrentToolRoot: root === currentToolRootElement,
          rootHasChildren: Boolean(root?.firstElementChild),
          childCountBeforeLifecycle,
          childCountAfterLifecycle,
          lifecycleAlteredChildren: childCountBeforeLifecycle !== childCountAfterLifecycle,
          mountStrategy: mountPlan?.mode ?? 'unknown'
        });

        if (!postMountValidation.isValid) {
          const resolvedScopeRecheck = hasCompleteContractAcrossResolvedScopes(root);

          if (resolvedScopeRecheck.isContractCompliant) {
            logger.info('[DomAdapter] post-mount adapter skipped', {
              slug,
              reason: 'resolved_scope_already_valid',
              runtimeContainerValid: resolvedScopeRecheck.runtimeContainerValidation.isValid,
              toolRootValid: resolvedScopeRecheck.toolRootValidation.isValid,
              runtimeContainerLayoutType: resolvedScopeRecheck.runtimeContainerValidation.detectedLayoutType,
              toolRootLayoutType: resolvedScopeRecheck.toolRootValidation.detectedLayoutType
            });
          } else if (isToolShell(root)) {
            logger.info('[DomAdapter] NO adapter applied', {
              slug,
              phase: 'post-mount',
              reason: 'toolshell_runtime',
              detectedLayoutType: postMountValidation.detectedLayoutType,
              missingNodes: postMountValidation.missingNodes
            });
            logPostMountFailureDiagnostics({
              root,
              scope: postMountScopedValidation.scope,
              phase: 'post-mount',
              validation: postMountValidation,
              mountPlan
            });
            throw new Error(`runtime assertion failed: DOM contract incomplete for "${slug}"`);
          } else if (postMountValidation.detectedLayoutType !== LAYOUT_TYPES.LEGACY_LAYOUT) {
            logger.info('[DomAdapter] NO adapter applied', {
              slug,
              phase: 'post-mount',
              reason: 'non_legacy_layout',
              detectedLayoutType: postMountValidation.detectedLayoutType,
              missingNodes: postMountValidation.missingNodes
            });
            logPostMountFailureDiagnostics({
              root,
              scope: postMountScopedValidation.scope,
              phase: 'post-mount',
              validation: postMountValidation,
              mountPlan
            });
            throw new Error(`runtime assertion failed: DOM contract incomplete for "${slug}"`);
          } else {
            logger.info('[DomAdapter] legacy layout detected', {
              slug,
              phase: 'post-mount',
              detectedLayoutType: postMountValidation.detectedLayoutType,
              missingNodes: postMountValidation.missingNodes
            });
            const adapterPrecheck = hasCompleteContractAcrossResolvedScopes(root);
            if (adapterPrecheck.isContractCompliant) {
              logger.warn('[DomAdapter] Adapter applied to contract-compliant DOM', {
                slug,
                phase: 'post-mount',
                runtimeContainerValid: adapterPrecheck.runtimeContainerValidation.isValid,
                toolRootValid: adapterPrecheck.toolRootValidation.isValid
              });
              logger.info('[DomAdapter] post-mount adapter skipped', {
                slug,
                reason: 'adapter_precheck_contract_compliant'
              });
            } else {
              const postMountAdaptation = adaptDomContract(postMountScopedValidation.scope ?? root, capabilities);
              logger.info('[DomAdapter] post-mount adapter applied', { slug, ...postMountAdaptation });
              const postMountRevalidationScoped = validateDomAtPhase(root, 'post-mount-after-adapter');
              const postMountRevalidation = postMountRevalidationScoped.validation;
              if (!postMountRevalidation.isValid) {
                logPostMountFailureDiagnostics({
                  root,
                  scope: postMountRevalidationScoped.scope,
                  phase: 'post-mount-after-adapter',
                  validation: postMountRevalidation,
                  mountPlan
                });
                throw new Error(`runtime assertion failed: DOM contract incomplete for "${slug}"`);
              }
            }
          }
        }

        const lifecycleContract = inspectLifecycleContract(module);
        const classification = detectToolClassification({
          hasManifest,
          lifecycleContract,
          modulePath,
          legacyBridgeUsed,
          mountError: importFailed,
          moduleContractInvalid
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
        logger.info(`[Runtime] Runtime classification: ${classification}`, {
          slug,
          classification
        });

        emit('mount_success', {
          toolSlug: slug,
          duration: now() - mountStartedAt,
          modeUsed: legacyBridgeUsed ? 'legacy' : 'modern',
          runtimeResolutionMode: runtimeResolution.mode,
          runtimeResolutionReason: runtimeResolution.reason,
          metadata: {
            runtimeIdentity: { ...runtimeIdentity },
            ...runtimeIdentityTags
          }
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
          mountError: true,
          moduleContractInvalid
        });
        setLastError('mount', error, slug, { classification });
        stateRegistry.setFailure(stateKey, error?.message ?? String(error));
        emit('mount_failure', {
          toolSlug: slug,
          duration: now() - mountStartedAt,
          error: error?.message ?? String(error),
          modeUsed: legacyBridgeUsed ? 'legacy' : 'fallback',
          runtimeResolutionMode: runtimeResolution.mode,
          runtimeResolutionReason: runtimeResolution.reason,
          metadata: {
            runtimeIdentity: { ...runtimeIdentity },
            ...runtimeIdentityTags
          },
          errorCategory: classifyRuntimeError({ stage: 'mount', message: error?.message, eventName: 'mount_failure' })
        });
        runtimeMetrics.mountTimeMs = now() - mountStartedAt;

        showRuntimeCrashOverlay(root, {
          toolSlug: slug,
          phase: 'mount_failure',
          errorMessage: error?.message ?? String(error),
          stack: error?.stack,
          runtimeIdentity: { ...runtimeIdentity },
          classification: classifyRuntimeError({ stage: 'mount', message: error?.message, eventName: 'mount_failure' })
        });

        if (strictMode) {
          throw error;
        }

        logger.warn(`Tool runtime entered fallback recovery path for "${slug}".`, error);
        ensureRootFallback(root, slug, { force: true });
      }
    };

    await safeMount();

    if (!isStrictModeEnabled() && ensureRootFallback(root, slug)) {
      emit('mount_fallback_content', { toolSlug: slug, metadata: { phase: 'post-bootstrap' } });
    }

    emit('bootstrap_complete', { toolSlug: slug, duration: now() - runtimeStartedAt });
    runtimeMetrics.runtimeBootTimeMs = now() - runtimeStartedAt;
    logger.info(`Bootstrap completed for "${slug}".`);
  }

  async function bootstrapToolRuntime() {
    let root;
    try {
      root = getRoot();
    } catch (error) {
      logger.error(error?.message ?? String(error));
      return;
    }
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
      root.dataset.mountMode = TOOL_MOUNT_MODES.FULLSCREEN;

      try {
        await safeMountTool({ root, slug });
      } catch (error) {
        setLastError('runtime', error, slug);
        if (isStrictModeEnabled()) {
          throw error;
        }
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
    invokeTool: async (toolId, options = {}) => {
      const runtimeApi = (window.ToolNexus ??= {}).runtime;
      if (runtimeApi?.invokeTool) {
        return runtimeApi.invokeTool(toolId, options);
      }

      throw new Error('runtime API unavailable');
    },
    getLastError: () => lastError,
    getDiagnostics: () => ({
      ...runtimeMetrics,
      registry: stateRegistry.summary(),
      observability: observability.getSnapshot().metrics
    }),
    disposeDiagnostics: () => {
      unsubscribeLifecycleRetryDiagnostics();
    }
  };
}

export async function loadManifest(slug) {
  const endpointTemplate = window.ToolNexusConfig?.manifestEndpoint;
  const manifestUrl = endpointTemplate
    ? endpointTemplate.replace("{slug}", encodeURIComponent(slug))
    : `/tools/manifest/${encodeURIComponent(slug)}`;

  const response = await fetch(manifestUrl, {
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

  // ---------------------------------------------------------
  // Runtime bootstrap (FIXED)
  // ---------------------------------------------------------

  const runtime = createToolRuntime();

  /*
   * IMPORTANT FIX
   * ---------------------------------------------------------
   * Some lifecycle modules and legacy tools still rely on
   * global runtime access.
   *
   * This restores compatibility without changing architecture.
   */
  if (typeof window !== 'undefined') {
    window.ToolNexusRuntime ??= runtime;
    window.ToolNexusRuntime.strict = true;
  }

  if (typeof document !== 'undefined' && document.getElementById('tool-root')) {
    scheduleNonCriticalTask(() => {
      runtime.bootstrapToolRuntime().catch((error) => {

        // FIX:
        // runtimeLogger was undefined -> replaced with safe console fallback
        console.warn('[ToolRuntime] bootstrap task failed safely.', {
          message: error?.message ?? String(error)
        });

      });
    });
  } 
