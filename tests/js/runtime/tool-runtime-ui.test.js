import { jest } from '@jest/globals';
import { createToolRuntime } from '../../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';
import { loadToolTemplate } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-template-loader.js';
import { mountToolLifecycle } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-lifecycle-adapter.js';

describe('tool runtime ui bootstrap', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
    delete window.ToolNexusModules;
    delete window.ToolNexusKernel;
  });

  test('template injected before init', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="json-formatter"></div>';
    global.fetch = jest.fn(async () => ({ ok: true, text: async () => '<div id="formatBtn"></div>' }));

    const callOrder = [];
    const runtime = createToolRuntime({
      loadManifest: async () => ({ modulePath: '/module.js' }),
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

    expect(mount).toHaveBeenCalledTimes(1);
    expect(init).not.toHaveBeenCalled();
  });

  test('mount lifecycle works', async () => {
    const root = document.createElement('div');
    const module = { mount: jest.fn(async (el) => { el.innerHTML = '<section>ok</section>'; }) };

    await mountToolLifecycle({ module, slug: 'alpha', root, manifest: {} });

    expect(module.mount).toHaveBeenCalledTimes(1);
    expect(root.innerHTML).toContain('ok');
  });

  test('init lifecycle works', async () => {
    const init = jest.fn(() => {});
    await mountToolLifecycle({ module: { init }, slug: 'beta', root: document.createElement('div'), manifest: {} });
    expect(init).toHaveBeenCalledTimes(1);
  });


  test('kernel initialize lifecycle works', async () => {
    const initialize = jest.fn(async () => {});
    window.ToolNexusKernel = { initialize };

    await mountToolLifecycle({
      module: {},
      slug: 'kernel-tool',
      root: document.createElement('div'),
      manifest: {}
    });

    expect(initialize).toHaveBeenCalledTimes(1);
  });

  test('legacy window lifecycle works', async () => {
    const mount = jest.fn(() => {});
    window.ToolNexusModules = { legacy: { mount } };

    await mountToolLifecycle({
      module: {},
      slug: 'legacy',
      root: document.createElement('div'),
      manifest: {}
    });

    expect(mount).toHaveBeenCalledTimes(1);
  });

  test('dom elements exist after template load', async () => {
    const root = document.createElement('div');
    global.fetch = jest.fn(async () => ({ ok: true, text: async () => '<button id="formatBtn"></button>' }));

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
    global.fetch = jest.fn(async () => ({ ok: true, text: async () => '<div class="ui"></div>' }));

    const runtime = createToolRuntime({
      loadManifest: async () => ({ modulePath: '/module.js' }),
      importModule: async () => ({ mount: async () => {} }),
      dependencyLoader: { loadDependencies: async () => {} }
    });

    await runtime.bootstrapToolRuntime();

    expect(document.getElementById('tool-root').children.length).toBeGreaterThan(0);
  });
});
