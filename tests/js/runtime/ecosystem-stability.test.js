import { jest } from '@jest/globals';
import { createToolRuntime } from '../../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';
import { detectToolCapabilities } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-capability-matrix.js';

function loadDemoTemplate(_slug, root) {
  root.innerHTML = `
    <div data-runtime-container>
      <article data-tool-root data-tool="demo-tool">
        <header data-tool-header></header>
        <section data-tool-body>
          <section data-tool-input><textarea id="inputEditor"></textarea></section>
          <section data-tool-output><textarea id="outputField"></textarea></section>
        </section>
        <footer data-tool-actions></footer>
      </article>
    </div>`;
}

function createBaseRuntime(overrides = {}) {
  return createToolRuntime({
    loadManifest: async () => ({ slug: 'demo-tool', modulePath: '/demo.js', templatePath: '/demo.html', dependencies: [], uiMode: 'custom', complexityTier: 2 }),
    templateLoader: loadDemoTemplate,
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
    delete window.ToolNexusConfig;
    jest.restoreAllMocks();
  });

  test('modern lifecycle path works', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="demo-tool"></div>';
    const module = {
      create: jest.fn(),
      init: jest.fn(),
      destroy: jest.fn()
    };

    const runtime = createBaseRuntime({ importModule: async () => module });

    await runtime.bootstrapToolRuntime();

    expect(module.create).toHaveBeenCalledTimes(1);
    expect(module.init).toHaveBeenCalledTimes(1);
    expect(document.getElementById('tool-root').children.length).toBeGreaterThan(0);
  });

  test('strict mode blocks execution-only runTool lifecycle bridging', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="demo-tool"></div>';
    const runtime = createBaseRuntime({
      lifecycleAdapter: async () => ({ mounted: false }),
      importModule: async () => ({ runTool: jest.fn((action, input) => ({ action, input })) })
    });

    await expect(runtime.bootstrapToolRuntime())
      .rejects
      .toThrow('Strict runtime mode disallows legacy execution bridge for "demo-tool".');
  });

  test('SSR content remains visible in enhance mode', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="demo-tool"><article id="ssr">SSR</article></div>';

    const runtime = createBaseRuntime({
      importModule: async () => ({ create() {}, init() {}, destroy() {} })
    });

    await runtime.bootstrapToolRuntime();

    expect(document.getElementById('tool-root').children.length).toBeGreaterThan(0);
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

  test('navigation remount works cleanly with modern lifecycle module', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="nav-tool"></div>';

    const runtime = createToolRuntime({
      loadManifest: async () => ({ slug: 'nav-tool', modulePath: '/nav-tool.js', templatePath: '/demo.html', dependencies: [], uiMode: 'custom', complexityTier: 2 }),
      templateLoader: loadDemoTemplate,
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => ({ create() {}, init() {}, destroy() {} })
    });

    await runtime.bootstrapToolRuntime();
    document.getElementById('tool-root').dataset.toolSlug = 'nav-tool';
    await runtime.bootstrapToolRuntime();

    expect(document.getElementById('tool-root').children.length).toBeGreaterThan(0);
  });

  test('broken tool lifecycle crashes surface with explicit error in strict runtime', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="broken-tool"></div>';
    const runtime = createBaseRuntime({
      lifecycleAdapter: async () => { throw new Error('broken mount'); },
      importModule: async () => ({}),
      healRuntime: async () => false
    });

    await expect(runtime.bootstrapToolRuntime()).rejects.toThrow('broken mount');
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
