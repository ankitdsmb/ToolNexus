import { createToolRuntime } from '../../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';
import { adaptToolDom } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-adapter.js';
import { validateToolDom } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-contract-validator.js';

describe('DOM contract stabilization layer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    delete global.fetch;
  });

  test('modern layout does not require adaptation', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <section data-tool-root="true">
        <header data-tool-header="true"></header>
        <div data-tool-body="true">
          <section data-tool-input="true"></section>
          <section data-tool-output="true"></section>
          <div data-tool-actions="true"></div>
        </div>
      </section>
    `;

    const result = adaptToolDom(root, {});

    expect(result.adapted).toBe(false);
    expect(validateToolDom(root).isValid).toBe(true);
  });

  test('legacy layout is adapted automatically', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <section class="tool-page">
        <div class="tool-layout">
          <div class="tool-controls"><textarea id="inputEditor"></textarea></div>
          <div class="tool-result" id="outputField"></div>
        </div>
      </section>
    `;

    const result = adaptToolDom(root, {});

    expect(result.adapted).toBe(true);
    expect(result.detectedLayoutType).toBe('LEGACY_LAYOUT');
    expect(validateToolDom(root).isValid).toBe(true);
  });

  test('missing nodes are injected without deleting SSR content', () => {
    const root = document.createElement('div');
    root.innerHTML = '<article id="ssr-content">Server Rendered</article>';

    adaptToolDom(root, {});

    expect(root.querySelector('#ssr-content')).not.toBeNull();
    expect(validateToolDom(root).isValid).toBe(true);
  });

  test('runtime retries initialization once after DOM adaptation', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="retry-tool"><section class="tool-page"><div class="tool-layout"><div class="tool-controls"></div><div class="tool-result"></div></div></section></div>';

    let calls = 0;
    const runtime = createToolRuntime({
      loadManifest: async () => ({ slug: 'retry-tool', dependencies: [], modulePath: '/module.js' }),
      templateLoader: async () => {},
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => ({}),
      lifecycleAdapter: async ({ root }) => {
        calls += 1;
        if (calls === 1) {
          root.querySelector('[data-tool-input]')?.removeAttribute('data-tool-input');
          throw new Error('dom-bind-failure');
        }

        if (!root.querySelector('[data-tool-input]')) {
          throw new Error('missing adapted input node');
        }

        root.querySelector('[data-tool-output]').textContent = 'mounted';
        return { mounted: true };
      }
    });

    await runtime.bootstrapToolRuntime();

    expect(calls).toBe(2);
    expect(document.querySelector('[data-tool-runtime-fallback="true"]')).toBeNull();
  });

  test('runtime falls back only when adaptation path cannot recover', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="fail-tool"><section data-tool-root="true"><header data-tool-header="true"></header><div data-tool-body="true"><section data-tool-input="true"></section><section data-tool-output="true"></section><div data-tool-actions="true"></div></div></section></div>';

    const runtime = createToolRuntime({
      loadManifest: async () => ({ slug: 'fail-tool', dependencies: [], modulePath: '/module.js' }),
      templateLoader: async () => {},
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => ({}),
      adaptDomContract: () => ({ adapted: false, missingNodes: ['data-tool-input'] }),
      lifecycleAdapter: async ({ root }) => {
        root.querySelector('[data-tool-input]')?.removeAttribute('data-tool-input');
        throw new Error('hard failure');
      }
    });

    await runtime.bootstrapToolRuntime();

    expect(document.querySelector('[data-tool-runtime-fallback="true"]')).not.toBeNull();
  });
});
