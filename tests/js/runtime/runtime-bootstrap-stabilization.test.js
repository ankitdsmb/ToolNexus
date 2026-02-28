import { createToolRuntime } from '../../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';

function createShellMarkup() {
  return `
    <section data-tool-shell="true">
      <header data-tool-context="true"></header>
      <section data-tool-input="true"></section>
      <section>
        <div data-tool-status="true"></div>
        <section data-tool-output="true"></section>
      </section>
      <footer data-tool-followup="true"></footer>
    </section>
  `;
}

describe('runtime bootstrap stabilization', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="json-formatter"></div>';
    window.ToolNexus = {};
    window.ToolNexusConfig = {
      runtimeEnvironment: 'production',
      runtimeStrictMode: false,
      tool: { slug: 'json-formatter' }
    };
    window.ToolNexusRuntime = { strict: false };
  });

  test('delayed ToolShell render waits before DOM contract validation', async () => {
    const events = [];
    const root = document.getElementById('tool-root');
    let validateCalledWithAnchors = false;

    const runtime = createToolRuntime({
      getRoot: () => root,
      observer: { emit: (name) => events.push(name) },
      loadManifest: async () => ({ slug: 'json-formatter', dependencies: [], styles: [] }),
      templateLoader: async (_slug, mountRoot) => {
        await new Promise((resolve) => setTimeout(resolve, 60));
        mountRoot.innerHTML = createShellMarkup();
      },
      templateBinder: () => {},
      dependencyLoader: { loadDependencies: async () => undefined },
      validateDomContract: (validationRoot) => {
        validateCalledWithAnchors = Boolean(validationRoot?.querySelector?.('[data-tool-shell]'));
        return {
          isValid: validateCalledWithAnchors,
          mountSafe: true,
          missingNodes: validateCalledWithAnchors ? [] : ['data-tool-shell'],
          detectedLayoutType: 'MODERN_LAYOUT'
        };
      },
      lifecycleAdapter: async () => ({ mounted: true, mode: 'module.lifecycle-contract', cleanup: async () => {} })
    });

    await runtime.bootstrapToolRuntime();

    expect(validateCalledWithAnchors).toBe(true);
    expect(events).not.toContain('dom_contract_failure');
  });

  test('module missing keeps ToolShell visible and avoids dom_contract_failure', async () => {
    const events = [];
    const root = document.getElementById('tool-root');

    const runtime = createToolRuntime({
      getRoot: () => root,
      observer: { emit: (name) => events.push(name) },
      loadManifest: async () => ({
        slug: 'json-formatter',
        dependencies: [],
        styles: [],
        modulePath: '/js/tools/missing-module.js',
        uiMode: 'custom',
        complexityTier: 2
      }),
      templateLoader: async (_slug, mountRoot) => {
        mountRoot.innerHTML = createShellMarkup();
      },
      templateBinder: () => {},
      dependencyLoader: { loadDependencies: async () => undefined },
      importModule: async () => {
        throw new Error('module missing');
      }
    });

    await runtime.bootstrapToolRuntime();

    expect(root.querySelector('[data-tool-shell]')).not.toBeNull();
    expect(root.querySelector('[data-tool-shell]')?.dataset.runtimeState).toBe('error');
    expect(events).toContain('module_import_failure');
    expect(events).not.toContain('dom_contract_failure');
  });

  test('slow import preserves contract and completes without violations', async () => {
    const events = [];
    const root = document.getElementById('tool-root');

    const runtime = createToolRuntime({
      getRoot: () => root,
      observer: { emit: (name) => events.push(name) },
      loadManifest: async () => ({ slug: 'json-formatter', dependencies: [], styles: [], modulePath: '/js/tools/json-formatter.js' }),
      templateLoader: async (_slug, mountRoot) => {
        mountRoot.innerHTML = createShellMarkup();
      },
      templateBinder: () => {},
      dependencyLoader: { loadDependencies: async () => undefined },
      importModule: async () => {
        await new Promise((resolve) => setTimeout(resolve, 90));
        return {
          create: () => ({}),
          init: () => ({}),
          destroy: () => ({})
        };
      },
      lifecycleAdapter: async ({ module }) => {
        module.create?.();
        module.init?.();
        return { mounted: true, mode: 'module.lifecycle-contract', cleanup: async () => {} };
      }
    });

    await runtime.bootstrapToolRuntime();

    expect(root.querySelector('[data-tool-shell]')).not.toBeNull();
    expect(events).toContain('module_import_complete');
    expect(events).not.toContain('dom_contract_failure');
  });

  test('runtime reload remains contract-safe across consecutive boots', async () => {
    const events = [];
    const root = document.getElementById('tool-root');

    const runtime = createToolRuntime({
      getRoot: () => root,
      observer: { emit: (name) => events.push(name) },
      loadManifest: async () => ({ slug: 'json-formatter', dependencies: [], styles: [] }),
      templateLoader: async (_slug, mountRoot) => {
        mountRoot.innerHTML = createShellMarkup();
      },
      templateBinder: () => {},
      dependencyLoader: { loadDependencies: async () => undefined },
      lifecycleAdapter: async () => ({ mounted: true, mode: 'module.lifecycle-contract', cleanup: async () => {} })
    });

    await runtime.bootstrapToolRuntime();
    await runtime.bootstrapToolRuntime();

    expect(root.querySelector('[data-tool-shell]')).not.toBeNull();
    expect(events.filter((name) => name === 'dom_contract_failure')).toHaveLength(0);
  });
});
