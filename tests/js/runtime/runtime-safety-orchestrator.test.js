import { jest } from '@jest/globals';
import { createToolRuntime } from '../../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';

describe('runtime safety orchestrator', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
    delete window.ToolNexusModules;
    delete window.ToolNexusKernel;
  });

  test('manifest missing routes to legacy mode and keeps UI visible', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="legacy-a"><article id="ssr">server markup</article></div>';
    const runTool = jest.fn((root) => {
      root.innerHTML = '<div>legacy mounted</div>';
    });
    window.ToolNexusModules = { 'legacy-a': { runTool } };

    const runtime = createToolRuntime({
      loadManifest: async () => { throw new Error('manifest missing'); },
      templateLoader: async () => { throw new Error('template missing'); },
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => { throw new Error('module missing'); }
    });

    await expect(runtime.bootstrapToolRuntime()).resolves.toBeUndefined();
    expect(runTool).toHaveBeenCalledTimes(1);
    expect(document.getElementById('tool-root').children.length).toBeGreaterThan(0);
  });

  test('dependency missing is warning-only and runtime continues', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="dep-tool"></div>';

    const runtime = createToolRuntime({
      loadManifest: async () => ({ slug: 'dep-tool', modulePath: '/dep.js', dependencies: ['missing.js'] }),
      templateLoader: async (_slug, root) => { root.innerHTML = '<div class="tool-page"><div class="tool-layout"><section class="tool-layout__panel"><textarea id="inputEditor"></textarea></section><section class="tool-panel--output"><textarea id="outputField"></textarea></section></div></div>'; },
      dependencyLoader: { loadDependencies: async () => { throw new Error('missing dependency'); } },
      importModule: async () => ({ mount: async (root) => { root.innerHTML = '<section>mounted</section>'; } })
    });

    await expect(runtime.bootstrapToolRuntime()).resolves.toBeUndefined();
    expect(document.getElementById('tool-root').children.length).toBeGreaterThan(0);
  });

  test('template missing mounts safe fallback UI', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="template-tool"></div>';

    const runtime = createToolRuntime({
      loadManifest: async () => ({ slug: 'template-tool', modulePath: '/template.js', dependencies: [] }),
      templateLoader: async () => { throw new Error('template missing'); },
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => ({})
    });

    await runtime.bootstrapToolRuntime();
    expect(document.getElementById('tool-root').children.length).toBeGreaterThan(0);
    expect(document.querySelector('[data-tool-input]')).not.toBeNull();
  });

  test('lifecycle missing uses legacy runTool bridge flow', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="bridge-tool"></div>';
    const runTool = jest.fn((root) => {
      root.innerHTML = '<div>bridged legacy</div>';
    });
    window.ToolNexusModules = { 'bridge-tool': { runTool } };

    const runtime = createToolRuntime({
      loadManifest: async () => ({ slug: 'bridge-tool', modulePath: '/bridge.js', dependencies: [] }),
      templateLoader: async () => {},
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => ({})
    });

    await runtime.bootstrapToolRuntime();
    expect(runTool).toHaveBeenCalledTimes(1);
  });

  test('runtime exposes latest diagnostic error without throwing fatal', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="diag-tool"></div>';

    const runtime = createToolRuntime({
      loadManifest: async () => ({ slug: 'diag-tool', modulePath: '/diag.js', dependencies: [] }),
      templateLoader: async () => { throw new Error('template blown'); },
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => ({ mount: async () => { throw new Error('mount blown'); } }),
      healRuntime: async () => false
    });

    await expect(runtime.bootstrapToolRuntime()).resolves.toBeUndefined();
    expect(runtime.getLastError()).toMatchObject({ slug: 'diag-tool' });
    expect(document.getElementById('tool-root').children.length).toBeGreaterThan(0);
  });
});
