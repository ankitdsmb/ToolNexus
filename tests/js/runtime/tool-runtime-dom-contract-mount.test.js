import { createToolRuntime } from '../../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';
import { validateToolDom } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-contract-validator.js';

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

describe('runtime DOM contract mount order', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.ToolNexusConfig = { runtimeStrictMode: false };
    window.ToolNexusRuntime = { strict: false };
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete window.ToolNexusConfig;
    delete window.ToolNexusRuntime;
  });

  test('keeps ToolShell anchors and runtime error state when module import fails', async () => {
    const events = [];
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="json-formatter"></div>';
    const root = document.getElementById('tool-root');

    const runtime = createToolRuntime({
      getRoot: () => root,
      observer: { emit: (name) => events.push(name) },
      loadManifest: async () => ({
        slug: 'json-formatter',
        dependencies: [],
        styles: [],
        modulePath: '/js/tools/missing-json-formatter.js',
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
    expect(root.querySelector('[data-tool-context]')).not.toBeNull();
    expect(root.querySelector('[data-tool-status]')).not.toBeNull();
    expect(root.querySelector('[data-tool-followup]')).not.toBeNull();
    expect(root.querySelector('[data-tool-shell]')?.dataset.runtimeState).toBe('error');
    expect(validateToolDom(root).isValid).toBe(true);
    expect(events).toContain('module_import_failure');
    expect(events).not.toContain('dom_contract_failure');
  });
});
