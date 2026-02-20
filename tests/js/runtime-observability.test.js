import { classifyRuntimeError } from '../../src/ToolNexus.Web/wwwroot/js/runtime/error-classification-engine.js';
import { createRuntimeObservability } from '../../src/ToolNexus.Web/wwwroot/js/runtime/runtime-observability.js';
import { createToolRuntime } from '../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';

describe('runtime observability system', () => {
  test('classifies runtime failures into stable categories', () => {
    expect(classifyRuntimeError({ stage: 'manifest', message: 'not found' })).toBe('manifest_missing');
    expect(classifyRuntimeError({ stage: 'dependency', message: 'cdn failed' })).toBe('dependency_failure');
    expect(classifyRuntimeError({ eventName: 'dom_contract_failure', message: 'dom contract invalid' })).toBe('dom_contract_issue');
    expect(classifyRuntimeError({ stage: 'mount', message: 'boom' })).toBe('lifecycle_error');
    expect(classifyRuntimeError({ stage: 'other' })).toBe('unknown_runtime_exception');
  });

  test('aggregates telemetry into platform metrics and migration insights', () => {
    let t = 0;
    const observability = createRuntimeObservability({ now: () => (++t) * 10 });

    observability.record('bootstrap_start', { toolSlug: 'json-formatter' });
    observability.record('compatibility_mode_used', { toolSlug: 'json-formatter' });
    observability.record('init_retry', { toolSlug: 'json-formatter' });
    observability.record('dependency_complete', { toolSlug: 'json-formatter', duration: 30 });
    observability.record('mount_failure', { toolSlug: 'json-formatter', duration: 1300, error: 'lifecycle failed' });
    observability.record('mount_fallback_content', { toolSlug: 'json-formatter' });
    observability.record('bootstrap_complete', { toolSlug: 'json-formatter', duration: 1500 });

    const snapshot = observability.getSnapshot();
    expect(snapshot.metrics.totalToolsExecuted).toBe(1);
    expect(snapshot.metrics.fallbackExecutions).toBe(1);
    expect(snapshot.metrics.compatibilityModeCount).toBe(1);
    expect(snapshot.metrics.initRetries).toBe(1);
    expect(snapshot.metrics.successRate).toBe(0);
    expect(snapshot.migrationInsights.legacyBridgeRequiredTools[0].toolSlug).toBe('json-formatter');
    expect(snapshot.dashboardContract[0].errorCategory).toBe('lifecycle_error');
  });

  test('tool runtime exposes observability diagnostics and remains non-blocking with failing observers', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="observability"></div>';
    const root = document.getElementById('tool-root');
    const runtime = createToolRuntime({
      observer: {
        emit() {
          throw new Error('observer downstream failed');
        }
      },
      getRoot: () => root,
      loadManifest: async () => ({ modulePath: '/js/tools/observability.js', dependencies: [], styles: [] }),
      importModule: async () => ({ create() {}, init() {}, destroy() {} }),
      templateLoader: async () => {
        root.innerHTML = '<article class="tool-page"><button id="runBtn" type="button">Run</button></article>';
      },
      dependencyLoader: { loadDependencies: async () => {} },
      lifecycleAdapter: async ({ context }) => ({ mounted: true, cleanup: context.destroy.bind(context) }),
      detectToolCapabilities: () => ({ mountMode: 'replace' }),
      safeDomMount: () => ({ mode: 'replace', hadSsrMarkup: false, ssrSnapshot: [] }),
      validateDomContract: () => ({ isValid: true, missingNodes: [] }),
      createToolExecutionContext: () => ({
        listeners: [],
        cleanupCallbacks: [],
        addCleanup(fn) {
          this.cleanupCallbacks.push(fn);
        },
        async destroy() {
          this.listeners.length = 0;
          this.cleanupCallbacks.length = 0;
        }
      })
    });

    await runtime.bootstrapToolRuntime();

    const snapshot = window.ToolNexus.runtime.getObservabilitySnapshot();
    expect(snapshot.metrics.totalToolsExecuted).toBe(1);
    expect(snapshot.metrics.toolMountSuccess).toBe(1);
    expect(snapshot.dashboardContract[0].mountStatus).toBe('success');
  });
});
