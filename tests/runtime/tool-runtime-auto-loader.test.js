import { afterEach, describe, expect, test, vi } from 'vitest';
import { createToolRuntime } from '../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';

describe('tool runtime auto/custom loader', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    delete window.ToolNexusConfig;
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

  test('auto UI activates when module import fails', async () => {
    setShell('missing-module');
    window.ToolNexusConfig = { tool: { operationSchema: null }, runtimeUiMode: 'auto', runtimeComplexityTier: 1 };

    const runtime = createToolRuntime({
      loadManifest: async () => ({ slug: 'missing-module', modulePath: '/js/tools/does-not-exist.js', uiMode: 'auto', complexityTier: 1, dependencies: [] }),
      templateLoader: async () => {},
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => {
        throw new Error('module missing');
      }
    });

    await runtime.bootstrapToolRuntime();

    expect(document.querySelector('.tool-auto-runtime')).not.toBeNull();
  });

  test('custom tools still mount unchanged', async () => {
    setShell('custom-tool');
    window.ToolNexusConfig = { tool: {} };
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

    expect(init).toHaveBeenCalled();
    expect(document.getElementById('tool-root').getAttribute('data-custom-mounted')).toBe('true');
    expect(document.querySelector('.tool-auto-runtime')).toBeNull();
  });
});
