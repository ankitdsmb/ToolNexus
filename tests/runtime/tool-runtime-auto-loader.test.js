import { afterEach, describe, expect, test, vi } from 'vitest';
import { createToolRuntime } from '../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';

describe('tool runtime auto/custom loader', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    delete window.ToolNexusConfig;
    delete window.ToolNexusLogging;
  });

  function setShell(slug = 'auto-tool') {
    document.body.innerHTML = `
      <div data-runtime-container="true">
        <div id="tool-root" data-tool-root="true" data-tool-slug="${slug}">
          <header data-tool-header="true"></header>
          <section data-tool-body="true">
            <section data-tool-input="true"></section>
            <section data-tool-output="true"></section>
            <div data-tool-actions="true"></div>
          </section>
        </div>
      </div>`;
  }

  test('custom runtime success resolves to custom_active mode', async () => {
    setShell('custom-tool');
    window.ToolNexusConfig = { tool: {}, runtimeUiMode: 'custom', runtimeEnvironment: 'Production' };
    const init = vi.fn((root) => {
      root.setAttribute('data-custom-mounted', 'true');
      return { root };
    });

    const runtime = createToolRuntime({
      loadManifest: async () => ({ slug: 'custom-tool', modulePath: '/js/tools/custom-tool.js', uiMode: 'custom', complexityTier: 3, dependencies: [] }),
      templateLoader: async () => {},
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => ({
        create: (root) => ({ root }),
        init,
        destroy: () => {}
      })
    });

    await runtime.bootstrapToolRuntime();

    const root = document.getElementById('tool-root');
    expect(init).toHaveBeenCalled();
    expect(root.children.length).toBeGreaterThan(0);
    expect(root.dataset.runtimeResolutionMode).toBe('custom_active');
    expect(root.dataset.runtimeResolutionReason).toBeTruthy();
    expect(root.dataset.runtimeIdentityType).toBe('custom');
    expect(root.dataset.runtimeIdentityMode).toBe('explicit');
    expect(root.dataset.runtimeIdentitySource).toBe('custom-module');
  });

  test('custom import failure falls back to auto mode with metadata and telemetry', async () => {
    setShell('missing-module');
    window.ToolNexusConfig = { tool: { operationSchema: null }, runtimeUiMode: 'custom', runtimeComplexityTier: 1, runtimeEnvironment: 'Development' };
    const observerEmit = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const runtime = createToolRuntime({
      observer: { emit: observerEmit },
      loadManifest: async () => ({ slug: 'missing-module', modulePath: '/js/tools/does-not-exist.js', uiMode: 'custom', complexityTier: 1, dependencies: [] }),
      templateLoader: async () => {},
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => {
        throw new Error('module missing');
      }
    });

    await runtime.bootstrapToolRuntime();

    const root = document.getElementById('tool-root');
    expect(document.querySelector('.tool-auto-runtime') || document.querySelector('.tool-runtime-fallback')).not.toBeNull();
    expect(root.dataset.runtimeResolutionMode).toBe('auto_fallback');
    expect(root.dataset.runtimeResolutionReason).toBe('auto_loaded_after_custom_runtime_failure');
    expect(root.dataset.runtimeIdentityType).toBe('auto');
    expect(root.dataset.runtimeIdentityMode).toBe('fallback');
    expect(root.dataset.runtimeIdentitySource).toBe('module-missing');

    expect(warnSpy).toHaveBeenCalled();
    expect(observerEmit).toHaveBeenCalledWith('runtime_resolution', expect.objectContaining({
      toolSlug: 'missing-module',
      metadata: expect.objectContaining({
        runtimeResolutionMode: expect.any(String),
        runtimeResolutionReason: expect.any(String)
      })
    }));

    const snapshot = window.ToolNexus.runtime.getObservabilitySnapshot();
    const resolutionEvents = snapshot.recentTelemetry.filter((entry) => entry.eventName === 'runtime_resolution');
    const resolutionEvent = resolutionEvents[resolutionEvents.length - 1];
    expect(resolutionEvent.runtimeResolutionMode).toBeTruthy();
    expect(resolutionEvent.runtimeResolutionReason).toBeTruthy();
  });

  test('auto explicit mode is tagged when auto runtime is intentionally selected', async () => {
    setShell('auto-tool');
    window.ToolNexusConfig = { tool: { operationSchema: null }, runtimeUiMode: 'auto', runtimeComplexityTier: 1, runtimeEnvironment: 'Production' };

    const runtime = createToolRuntime({
      loadManifest: async () => ({ slug: 'auto-tool', modulePath: '/js/tools/custom-tool.js', uiMode: 'auto', complexityTier: 1, dependencies: [] }),
      templateLoader: async () => {},
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => ({ create: (root) => ({ root }), init: () => {}, destroy: () => {} })
    });

    await runtime.bootstrapToolRuntime();

    const root = document.getElementById('tool-root');
    expect(['auto_explicit', 'custom_active']).toContain(root.dataset.runtimeResolutionMode);
    expect(root.dataset.runtimeResolutionReason).toBeTruthy();
    expect(['auto', 'custom']).toContain(root.dataset.runtimeIdentityType);
    expect(root.dataset.runtimeIdentityMode).toBeTruthy();
    expect(root.dataset.runtimeIdentitySource).toBeTruthy();
  });

  test('metadata propagation includes runtime resolution tags for mount telemetry', async () => {
    setShell('meta-tool');
    window.ToolNexusConfig = { tool: {}, runtimeUiMode: 'custom', runtimeEnvironment: 'Production' };

    const runtime = createToolRuntime({
      loadManifest: async () => ({ slug: 'meta-tool', modulePath: '/js/tools/meta-tool.js', uiMode: 'custom', complexityTier: 2, dependencies: [] }),
      templateLoader: async () => {},
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => ({ create: (root) => ({ root }), init: () => {}, destroy: () => {} })
    });

    await runtime.bootstrapToolRuntime();

    const snapshot = window.ToolNexus.runtime.getObservabilitySnapshot();
    const mountEvent = snapshot.recentTelemetry.find((entry) => entry.eventName === 'mount_success');
    expect(mountEvent.runtimeResolutionMode).toBe('custom_active');
    expect(['custom_runtime_loaded', 'custom_runtime_forced_lifecycle_contract']).toContain(mountEvent.runtimeResolutionReason);
    expect(mountEvent.metadata.runtimeIdentity).toEqual(expect.objectContaining({
      runtimeType: 'custom',
      uiMode: 'custom',
      resolutionMode: 'explicit',
      loaderDecision: expect.any(String),
      moduleSource: 'custom-module',
      executionLanguage: 'javascript'
    }));
    expect(mountEvent.metadata['runtime.identity.type']).toBe('custom');
    expect(mountEvent.metadata['runtime.identity.mode']).toBe('explicit');
    expect(mountEvent.metadata['runtime.identity.source']).toBe('custom-module');
  });
});
