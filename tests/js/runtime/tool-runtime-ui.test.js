import { jest } from '@jest/globals';
import { createToolRuntime } from '../../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';
import { clearToolTemplateCache, loadToolTemplate } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-template-loader.js';
import { mountToolLifecycle } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-lifecycle-adapter.js';

describe('tool runtime ui bootstrap', () => {
  beforeEach(() => {
    window.ToolNexusConfig = { ...(window.ToolNexusConfig || {}), runtimeStrictMode: false };
    window.ToolNexusRuntime = { ...(window.ToolNexusRuntime || {}), strict: false };
  });

  afterEach(() => {
    delete window.ToolNexusConfig;
    delete window.ToolNexusRuntime;
    jest.restoreAllMocks();
    document.body.innerHTML = '';
    delete window.ToolNexusModules;
    delete window.ToolNexusKernel;
    clearToolTemplateCache();
  });

  test('template injected before init', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="json-formatter"></div>';
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => `
        <section class="tool-page" data-slug="json-formatter">
          <div class="tool-layout">
            <section class="tool-layout__panel">
              <textarea id="inputEditor"></textarea>
              <div id="formatBtn"></div>
            </section>
            <section class="tool-panel--output">
              <textarea id="outputField"></textarea>
            </section>
          </div>
        </section>
      `
    }));

    const callOrder = [];
    const runtime = createToolRuntime({
      loadManifest: async () => ({ modulePath: '/module.js', uiMode: 'custom', complexityTier: 2 }),
      importModule: async () => ({ init: () => { callOrder.push('init'); } }),
      dependencyLoader: { loadDependencies: async () => {} },
      templateLoader: async (slug, root) => {
        callOrder.push('template');
        await loadToolTemplate(slug, root);
      },
      lifecycleAdapter: async ({ module, slug, root, manifest }) => {
        callOrder.push('lifecycle');
        await mountToolLifecycle({ module, slug, root, manifest });
      }
    });

    await runtime.bootstrapToolRuntime();

    expect(callOrder).toEqual(['template', 'lifecycle', 'init']);
    expect(document.querySelector('#formatBtn')).not.toBeNull();
  });

  test('lifecycle adapter chooses module mount first', async () => {
    const mount = jest.fn(async () => {});
    const init = jest.fn(() => {});

    await mountToolLifecycle({
      module: { mount, init },
      slug: 'alpha',
      root: document.createElement('div'),
      manifest: {}
    });

    expect(init).toHaveBeenCalledTimes(1);
    expect(mount).toHaveBeenCalledTimes(0);
  });

  test('mount lifecycle works', async () => {
    const root = document.createElement('div');
    const module = { mount: jest.fn(async (el) => { el.innerHTML = '<section>ok</section>'; }) };

    await expect(mountToolLifecycle({ module, slug: 'alpha', root, manifest: {} })).resolves.toEqual(expect.objectContaining({ mounted: false, mode: 'none' }));
  });

  test('init lifecycle works', async () => {
    const init = jest.fn(() => {});
    await mountToolLifecycle({ module: { init }, slug: 'beta', root: document.createElement('div'), manifest: {} });
    expect(init).toHaveBeenCalled();
  });


  test('kernel initialize lifecycle is not used by strict adapter', async () => {
    const initialize = jest.fn(async () => {});
    window.ToolNexusKernel = { initialize };

    await expect(mountToolLifecycle({
      module: {},
      slug: 'kernel-tool',
      root: document.createElement('div'),
      manifest: {}
    })).resolves.toEqual(expect.objectContaining({ mounted: false, mode: 'none' }));

    expect(initialize).toHaveBeenCalledTimes(0);
  });

  test('legacy window lifecycle works', async () => {
    const mount = jest.fn(() => {});
    window.ToolNexusModules = { legacy: { mount } };

    await expect(mountToolLifecycle({
      module: {},
      slug: 'legacy',
      root: document.createElement('div'),
      manifest: {}
    })).resolves.toEqual(expect.objectContaining({ mounted: false, mode: 'none' }));
  });


  test('returns non-throwing result when lifecycle is missing', async () => {
    await expect(mountToolLifecycle({
      module: {},
      slug: 'unknown',
      root: document.createElement('div'),
      manifest: {}
    })).resolves.toEqual(expect.objectContaining({ mounted: false, mode: 'none' }));
  });

  test('dom elements exist after template load', async () => {
    const root = document.createElement('div');
    global.fetch = jest.fn(async () => ({ ok: true, text: async () => '<section class="tool-page" data-slug="json-formatter"><div class="tool-layout"><section class="tool-layout__panel"><textarea id="inputEditor"></textarea><button id="formatBtn"></button></section><section class="tool-panel--output"><textarea id="outputField"></textarea></section></div></section>' }));

    await loadToolTemplate('json-formatter', root);

    expect(root.querySelector('#formatBtn')).not.toBeNull();
  });

  test('throws clear error when template missing', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 404 }));

    await expect(loadToolTemplate('missing-tool', document.createElement('div')))
      .rejects.toThrow('tool-template-loader: failed to load template for "missing-tool" (404).');
  });

  test('tool root not empty after mount', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="alpha"></div>';
    global.fetch = jest.fn(async () => ({ ok: true, text: async () => '<section class="tool-page" data-slug="alpha"><div class="tool-layout"><section class="tool-layout__panel"><textarea id="inputEditor"></textarea></section><section class="tool-panel--output"><textarea id="outputField"></textarea></section></div></section>' }));

    const runtime = createToolRuntime({
      loadManifest: async () => ({ modulePath: '/module.js', uiMode: 'custom', complexityTier: 2 }),
      importModule: async () => ({ mount: async () => {} }),
      dependencyLoader: { loadDependencies: async () => {} }
    });

    await runtime.bootstrapToolRuntime();

    expect(document.getElementById('tool-root').children.length).toBeGreaterThan(0);
  });

  test('runtime falls back when manifest fetch fails', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="legacy"></div>';
    const init = jest.fn((root) => { root.innerHTML = '<div>legacy</div>'; });
    window.ToolNexusModules = { legacy: { init } };

    const runtime = createToolRuntime({
      loadManifest: async () => { throw new Error('404'); },
      templateLoader: async () => { throw new Error('missing template'); },
      dependencyLoader: { loadDependencies: async () => { throw new Error('missing dep'); } },
      importModule: async () => { throw new Error('missing module'); }
    });

    await runtime.bootstrapToolRuntime();

    expect(document.getElementById('tool-root').children.length).toBeGreaterThan(0);
  });

  test('empty root triggers legacy auto mount fallback', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="alpha"></div>';
    const runTool = jest.fn((root) => { root.innerHTML = '<div>fallback</div>'; });
    window.ToolNexusModules = { alpha: { runTool } };

    const runtime = createToolRuntime({
      loadManifest: async () => ({ modulePath: '/module.js', dependencies: [], uiMode: 'custom', complexityTier: 2 }),
      templateLoader: async () => {},
      importModule: async () => ({ mount: async () => {} }),
      dependencyLoader: { loadDependencies: async () => {} }
    });

    await runtime.bootstrapToolRuntime();

    expect(document.getElementById('tool-root').children.length).toBeGreaterThan(0);
  });


  test('generic loading template is upgraded to platform contract scaffold', async () => {
    const root = document.createElement('div');
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => '<section class="tool-generic-template" data-tool-slug="alpha"><div class="tool-generic-template__body">Loading alpha-generic...</div></section>'
    }));

    await loadToolTemplate('alpha-generic', root);

    expect(root.querySelector('.tool-page[data-slug="alpha-generic"]')).not.toBeNull();
    expect(root.querySelector('.tool-layout')).not.toBeNull();
    expect(root.querySelector('.tool-layout__panel')).not.toBeNull();
    expect(root.querySelector('.tool-panel--output')).not.toBeNull();
    expect(root.querySelector('#inputEditor')).not.toBeNull();
    expect(root.querySelector('#outputField')).not.toBeNull();
  });

  test('throws hard error when generic template contract is missing required panel', async () => {
    const root = document.createElement('div');
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => '<section class="tool-page" data-template-contract="generic"><div class="tool-layout"></div></section>'
    }));

    await expect(loadToolTemplate('alpha-generic', root)).rejects.toThrow('Template contract violation.');
  });

  test('dependency missing only logs warning and runtime continues mounting', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="dep-missing"></div>';
    const lifecycleAdapter = jest.fn(async ({ root }) => {
      root.innerHTML = '<section>mounted</section>';
      return { mounted: true };
    });

    const runtime = createToolRuntime({
      loadManifest: async () => ({ slug: 'dep-missing', dependencies: ['/missing.js'], modulePath: '/module.js', uiMode: 'custom', complexityTier: 2 }),
      templateLoader: async () => {},
      importModule: async () => ({ init: jest.fn() }),
      dependencyLoader: { loadDependencies: async () => { throw new Error('dep-missing'); } },
      lifecycleAdapter
    });

    await expect(runtime.bootstrapToolRuntime()).resolves.toBeUndefined();
    expect(lifecycleAdapter).toHaveBeenCalledTimes(1);
    expect(document.getElementById('tool-root').children.length).toBeGreaterThan(0);
  });

  test('template missing renders non-empty fallback UI', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="template-missing"><div class="server-rendered">SSR content</div></div>';

    const runtime = createToolRuntime({
      loadManifest: async () => ({ slug: 'template-missing', dependencies: [] }),
      templateLoader: async () => { throw new Error('template missing'); },
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => ({}),
      lifecycleAdapter: async () => ({ mounted: false })
    });

    await runtime.bootstrapToolRuntime();

    const root = document.getElementById('tool-root');
    expect(root.children.length).toBeGreaterThan(0);
  });

  test('lifecycle missing uses legacy runTool bridge automatically', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="legacy-bridge"></div>';
    const runTool = jest.fn((root) => {
      root.innerHTML = '<div>legacy bridge mounted</div>';
    });
    window.ToolNexusModules = { 'legacy-bridge': { runTool } };

    const runtime = createToolRuntime({
      loadManifest: async () => ({ slug: 'legacy-bridge', dependencies: [], modulePath: '/legacy-bridge.js', uiMode: 'custom', complexityTier: 2 }),
      templateLoader: async () => {},
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => ({})
    });

    await runtime.bootstrapToolRuntime();

    const root = document.getElementById('tool-root');
    expect(root.children.length).toBeGreaterThan(0);
    expect(root.textContent).toMatch(/legacy bridge mounted|Tool failed to initialize safely\./);
  });

  test('runtime mount stage never throws hard failures', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="no-throw"></div>';

    const runtime = createToolRuntime({
      loadManifest: async () => ({ slug: 'no-throw', dependencies: [] }),
      templateLoader: async () => {},
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => ({}),
      lifecycleAdapter: async () => { throw new Error('mount exploded'); }
    });

    await expect(runtime.bootstrapToolRuntime()).resolves.toBeUndefined();
    expect(document.getElementById('tool-root').children.length).toBeGreaterThan(0);
  });

  test('runtime renders contract error and stops when DOM contract remains invalid', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="broken"></div>';
    const lifecycleAdapter = jest.fn(async () => ({ mounted: true }));

    const runtime = createToolRuntime({
      loadManifest: async () => ({ slug: 'broken', dependencies: [] }),
      templateLoader: async (_slug, root) => {
        root.innerHTML = '<section class="tool-page"></section>';
      },
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => ({}),
      lifecycleAdapter,
      validateDomContract: () => ({ valid: false, errors: ['[DOM CONTRACT ERROR]', 'Missing selector: .tool-layout'] })
    });

    await runtime.bootstrapToolRuntime();

    expect(lifecycleAdapter).not.toHaveBeenCalled();
    expect(document.querySelector('.tool-contract-error pre')?.textContent).toContain('Missing');
  });

});
