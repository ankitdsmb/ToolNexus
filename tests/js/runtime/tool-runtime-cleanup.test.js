import { jest } from '@jest/globals';
import { createToolRuntime } from '../../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';
import { inspectLifecycleContract } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-lifecycle-adapter.js';

describe('tool runtime lifecycle hygiene', () => {
  test('inspects module lifecycle contract support', () => {
    const fullContract = inspectLifecycleContract({
      create: () => {},
      init: () => {},
      destroy: () => {},
      runTool: () => {}
    });

    const mountOnlyContract = inspectLifecycleContract({ mount: () => {} });

    expect(fullContract.compliant).toBe(true);
    expect(mountOnlyContract.compliant).toBe(false);
    expect(mountOnlyContract.supportsMount).toBe(true);
  });

  test('runs previous cleanup before mounting again on same root', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="cleanup-tool"></div>';

    const cleanup = jest.fn();
    const lifecycleAdapter = jest
      .fn()
      .mockResolvedValueOnce({ mounted: true, cleanup })
      .mockResolvedValueOnce({ mounted: true });

    const runtime = createToolRuntime({
      loadManifest: async () => ({ slug: 'cleanup-tool', dependencies: [], modulePath: '/mock/cleanup.js' }),
      templateLoader: async (_slug, root) => {
        root.innerHTML = '<div class="tool-page"><textarea id="inputEditor"></textarea><textarea id="outputField"></textarea></div>';
      },
      templateBinder: () => {},
      dependencyLoader: { loadDependencies: async () => undefined },
      importModule: async () => ({ mount: () => {} }),
      lifecycleAdapter,
      legacyBootstrap: async () => ({ mounted: false }),
      legacyAutoInit: async () => ({ mounted: false })
    });

    await runtime.bootstrapToolRuntime();
    await runtime.bootstrapToolRuntime();

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(lifecycleAdapter).toHaveBeenCalledTimes(2);
  });
});
