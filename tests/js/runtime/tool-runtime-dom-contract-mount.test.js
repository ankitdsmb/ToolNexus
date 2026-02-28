import fs from 'node:fs';
import path from 'node:path';
import { createToolRuntime } from '../../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';
import { validateToolDom } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-contract-validator.js';

const templatesRoot = path.resolve(process.cwd(), 'src/ToolNexus.Web/wwwroot/tool-templates');

function readTemplate(slug) {
  return fs.readFileSync(path.join(templatesRoot, `${slug}.html`), 'utf8');
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

  test('creates ToolShell anchors before mount and keeps runtime error state when module import fails', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="json-formatter"></div>';
    const root = document.getElementById('tool-root');

    const runtime = createToolRuntime({
      getRoot: () => root,
      loadManifest: async () => ({
        slug: 'json-formatter',
        dependencies: [],
        styles: [],
        modulePath: '/js/tools/missing-json-formatter.js',
        uiMode: 'custom',
        complexityTier: 2
      }),
      templateLoader: async (_slug, mountRoot) => {
        mountRoot.innerHTML = readTemplate('json-formatter');
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
  });
});
