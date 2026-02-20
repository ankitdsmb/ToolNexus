import { jest } from '@jest/globals';
import { createToolRuntime } from '../../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';
import { detectToolCapabilities } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-capability-matrix.js';

function createBaseRuntime(overrides = {}) {
  return createToolRuntime({
    loadManifest: async () => ({ slug: 'demo-tool', modulePath: '/demo.js', templatePath: '/demo.html', dependencies: [] }),
    templateLoader: async (_slug, root) => {
      root.innerHTML = '<div class="tool-page"><div class="tool-layout"><section class="tool-layout__panel"><textarea id="inputEditor"></textarea></section><section class="tool-panel--output"><textarea id="outputField"></textarea></section></div></div>';
    },
    dependencyLoader: { loadDependencies: async () => {} },
    ...overrides
  });
}

describe('ecosystem runtime stability matrix', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    delete window.runTool;
    delete window.init;
    delete window.ToolNexusModules;
    jest.restoreAllMocks();
  });

  test('modern lifecycle path works', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="demo-tool"></div>';
    const mount = jest.fn((root) => { root.innerHTML = '<div data-mounted="modern">ok</div>'; });

    const runtime = createBaseRuntime({
      importModule: async () => ({ mount })
    });

    await runtime.bootstrapToolRuntime();

    expect(mount).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[data-mounted="modern"]')).not.toBeNull();
  });

  test('transitional tool mounts via legacy bridge', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="demo-tool"></div>';
    const runTool = jest.fn((root) => { root.innerHTML = '<div data-mounted="bridge">bridge</div>'; });

    const runtime = createBaseRuntime({
      lifecycleAdapter: async () => ({ mounted: false }),
      importModule: async () => ({ runTool })
    });

    await runtime.bootstrapToolRuntime();

    expect(runTool).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[data-mounted="bridge"]')).not.toBeNull();
  });

  test('legacy runTool executes once per mount cycle (double mount prevented)', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="legacy-tool"></div>';
    const runTool = jest.fn((root) => { root.innerHTML = '<div data-mounted="legacy">legacy</div>'; });
    window.ToolNexusModules = { 'legacy-tool': { runTool } };

    const runtime = createToolRuntime({
      loadManifest: async () => { throw new Error('no manifest'); },
      templateLoader: async () => {},
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => ({}),
      lifecycleAdapter: async () => ({ mounted: false })
    });

    await runtime.bootstrapToolRuntime();
    await runtime.bootstrapToolRuntime();

    expect(runTool).toHaveBeenCalledTimes(2);
  });

  test('SSR content remains visible in enhance mode', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="demo-tool"><article id="ssr">SSR</article></div>';

    const runtime = createBaseRuntime({
      importModule: async () => ({})
    });

    await runtime.bootstrapToolRuntime();

    expect(document.getElementById('ssr')).not.toBeNull();
    expect(document.getElementById('tool-root').dataset.runtimeEnhanced).toBe('true');
  });

  test('destroy cleans listeners through execution context', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="demo-tool"></div>';
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    const runtime = createBaseRuntime({
      lifecycleAdapter: async ({ context }) => {
        context.addEventListener(window, 'resize', () => {});
        return { mounted: true };
      },
      importModule: async () => ({})
    });

    await runtime.bootstrapToolRuntime();
    await runtime.bootstrapToolRuntime();

    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function), undefined);
  });

  test('navigation remount works cleanly', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="nav-tool"></div>';
    const runTool = jest.fn((root) => { root.innerHTML = '<div data-mounted="nav">nav</div>'; });
    window.ToolNexusModules = { 'nav-tool': { runTool } };

    const runtime = createToolRuntime({
      loadManifest: async () => { throw new Error('legacy'); },
      templateLoader: async () => {},
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => ({}),
      lifecycleAdapter: async () => ({ mounted: false })
    });

    await runtime.bootstrapToolRuntime();
    document.getElementById('tool-root').dataset.toolSlug = 'nav-tool';
    await runtime.bootstrapToolRuntime();

    expect(runTool).toHaveBeenCalledTimes(2);
  });

  test('broken tool renders standardized fallback UI', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="broken-tool"></div>';

    const runtime = createBaseRuntime({
      lifecycleAdapter: async () => { throw new Error('broken mount'); },
      importModule: async () => ({}),
      healRuntime: async () => false
    });

    await runtime.bootstrapToolRuntime();

    expect(document.querySelector('[data-tool-runtime-fallback="true"]')).not.toBeNull();
    expect(document.getElementById('tool-root').textContent).toContain('Tool failed to initialize safely.');
  });

  test('capability matrix returns normalized shape', () => {
    const capabilities = detectToolCapabilities({
      slug: 'matrix',
      manifest: { slug: 'matrix', templatePath: '/tool-templates/matrix.html', dependencies: ['/dep.js'] },
      module: { runTool() {} },
      root: document.createElement('div')
    });

    expect(capabilities).toMatchObject({
      slug: 'matrix',
      hasManifest: true,
      hasRunTool: true,
      hasDependencies: true
    });
  });
});
