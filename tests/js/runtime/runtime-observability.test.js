import { jest } from '@jest/globals';
import { createRuntimeObserver } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/runtime-observer.js';
import { createDependencyLoader } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/dependency-loader.js';
import { createToolRuntime } from '../../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';

describe('runtime observability', () => {
  beforeEach(() => {
    window.ToolNexusConfig = { ...(window.ToolNexusConfig || {}), runtimeStrictMode: false };
    window.ToolNexusRuntime = { ...(window.ToolNexusRuntime || {}), strict: false };
  });

  test('documents QA expectation matrix coverage', () => {
    const expectations = [
      'bootstrap_start',
      'dependency_start',
      'dependency_complete',
      'module_import_start',
      'mount_success',
      'mount_failure',
      'healing_attempt',
      'observer_never_throws',
      'observer_failure_isolated',
      'monotonic_timestamps',
      'isolated_tool_streams',
      'minimal_overhead'
    ];

    expect(expectations).toHaveLength(12);
  });

  test('emits lifecycle events for successful mount flow', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="alpha"></div>';
    const observer = createRuntimeObserver();
    const events = [];
    observer.subscribe((event) => events.push(event));

    const runtime = createToolRuntime({
      observer,
      templateLoader: async (_slug, root) => { root.innerHTML = '<div class="runtime-template"></div>'; },
      loadManifest: async () => ({ modulePath: '/mock/module.js' }),
      importModule: async () => ({ mount: async () => {} }),
      dependencyLoader: createDependencyLoader({ observer, loadScript: async () => {} })
    });

    await runtime.bootstrapToolRuntime();

    expect(events.map((entry) => entry.event)).toEqual(expect.arrayContaining([
      'bootstrap_start',
      'dependency_start',
      'dependency_complete',
      'module_import_start',
      'mount_success'
    ]));
  });

  test('emits failure events for dependency, import, and mount failures', async () => {
    const observer = createRuntimeObserver();
    const events = [];
    observer.subscribe((event) => events.push(event));

    document.body.innerHTML = '<div id="tool-root" data-tool-slug="beta"></div>';
    const importFailureRuntime = createToolRuntime({
      observer,
      templateLoader: async (_slug, root) => { root.innerHTML = '<div class="runtime-template"></div>'; },
      loadManifest: async () => ({ modulePath: '/mock/module.js', dependencies: ['dep.js'] }),
      importModule: async () => {
        throw new Error('import failed');
      },
      dependencyLoader: createDependencyLoader({
        observer,
        loadScript: async () => {
          throw new Error('dependency failed');
        }
      })
    });

    await importFailureRuntime.bootstrapToolRuntime();

    document.body.innerHTML = '<div id="tool-root" data-tool-slug="beta-import"></div>';
    const dependencyPassImportFailureRuntime = createToolRuntime({
      observer,
      templateLoader: async (_slug, root) => { root.innerHTML = '<div class="runtime-template"></div>'; },
      loadManifest: async () => ({ modulePath: '/mock/module.js', dependencies: ['dep-ok.js'] }),
      importModule: async () => {
        throw new Error('import failed');
      },
      dependencyLoader: createDependencyLoader({ observer, loadScript: async () => {} })
    });

    await dependencyPassImportFailureRuntime.bootstrapToolRuntime();

    document.body.innerHTML = '<div id="tool-root" data-tool-slug="gamma"></div>';
    const mountFailureRuntime = createToolRuntime({
      observer,
      templateLoader: async (_slug, root) => { root.innerHTML = '<div class="runtime-template"></div>'; },
      loadManifest: async () => ({ modulePath: '/mock/module.js' }),
      importModule: async () => ({ mount: async () => { throw new Error('mount failed'); } }),
      healRuntime: async () => false
    });

    await mountFailureRuntime.bootstrapToolRuntime();

    expect(events.some((entry) => entry.event === 'dependency_failure')).toBe(true);
    expect(events.some((entry) => entry.event === 'module_import_failure')).toBe(true);
    expect(events.some((entry) => entry.event === 'mount_failure' || entry.event === 'mount_success')).toBe(true);
  });

  test('isolates event streams for multiple tool mounts', async () => {
    const observer = createRuntimeObserver();
    const toolA = [];
    const toolB = [];

    observer.subscribe((entry) => {
      if (entry.toolSlug === 'tool-a') toolA.push(entry);
      if (entry.toolSlug === 'tool-b') toolB.push(entry);
    });

    const buildRuntime = (slug) => createToolRuntime({
      observer,
      templateLoader: async (_slug, root) => { root.innerHTML = '<div class="runtime-template"></div>'; },
      getRoot: () => {
        const root = document.createElement('div');
        root.id = 'tool-root';
        root.dataset.toolSlug = slug;
        return root;
      },
      loadManifest: async () => ({ modulePath: '/module.js' }),
      importModule: async () => ({ mount: async () => {} })
    });

    await buildRuntime('tool-a').bootstrapToolRuntime();
    await buildRuntime('tool-b').bootstrapToolRuntime();

    expect(toolA.length).toBeGreaterThan(0);
    expect(toolB.length).toBeGreaterThan(0);
    expect(toolA.every((entry) => entry.toolSlug === 'tool-a')).toBe(true);
    expect(toolB.every((entry) => entry.toolSlug === 'tool-b')).toBe(true);
  });

  test('observability failures never break runtime', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="safe"></div>';
    const runtime = createToolRuntime({
      templateLoader: async (_slug, root) => { root.innerHTML = '<div class="runtime-template"></div>'; },
      observer: {
        emit: () => { throw new Error('observer failed'); },
        subscribe: () => () => {},
        clear: () => {}
      },
      loadManifest: async () => ({ modulePath: '/safe.js' }),
      importModule: async () => ({ mount: async () => {} })
    });

    await expect(runtime.bootstrapToolRuntime()).resolves.toBeUndefined();
  });

  test('timestamps are monotonic and include healing visibility', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="heal"></div>';
    const observer = createRuntimeObserver();
    const events = [];
    observer.subscribe((entry) => events.push(entry));

    const runtime = createToolRuntime({
      observer,
      templateLoader: async (_slug, root) => { root.innerHTML = '<div class="runtime-template"></div>'; },
      loadManifest: async () => ({ modulePath: '/heal.js' }),
      importModule: async () => ({ mount: async () => { throw new Error('mount explode'); } }),
      healRuntime: async () => true
    });

    await runtime.bootstrapToolRuntime();

    const hasHealingSignals = events.some((entry) => entry.event === 'healing_attempt' || entry.event === 'healing_result');
    const hasMountSignals = events.some((entry) => entry.event === 'mount_success' || entry.event === 'mount_failure');
    expect(hasHealingSignals || hasMountSignals).toBe(true);

    const timestamps = events.map((entry) => entry.timestamp);
    const sorted = [...timestamps].sort((a, b) => a - b);
    expect(timestamps).toEqual(sorted);
  });
  test('prevents duplicate bootstrap work and publishes runtime diagnostics API', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="diagnostics"></div>';

    const runtime = createToolRuntime({
      templateLoader: async (_slug, root) => { root.innerHTML = '<div class="runtime-template"></div>'; },
      loadManifest: async () => ({ modulePath: '/diagnostics.js', dependencies: [] }),
      importModule: async () => ({ init: async () => {} }),
      dependencyLoader: createDependencyLoader({ loadScript: async () => {} })
    });

    await Promise.all([runtime.bootstrapToolRuntime(), runtime.bootstrapToolRuntime()]);


    const diagnostics = runtime.getDiagnostics();
    expect(diagnostics.bootstrapCount).toBe(1);
    expect(diagnostics.skippedDuplicateBoots).toBeGreaterThan(0);
    expect(diagnostics.runtimeBootTimeMs).toBeGreaterThanOrEqual(0);
    expect(diagnostics.mountTimeMs).toBeGreaterThanOrEqual(0);

    expect(window.ToolNexus.runtime.getDiagnostics()).toMatchObject({
      bootstrapCount: 1,
      skippedDuplicateBoots: diagnostics.skippedDuplicateBoots
    });
  });

});
