import fs from 'node:fs';
import path from 'node:path';

import { createToolRuntime } from '../../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';
import { validateToolDom } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-contract-validator.js';

const repoRoot = process.cwd();
const templatesRoot = path.join(repoRoot, 'src/ToolNexus.Web/wwwroot/tool-templates');

const targetedTools = ['base64-decode', 'json-to-csv', 'csv-viewer', 'json-formatter'];

function templateFor(slug) {
  return fs.readFileSync(path.join(templatesRoot, `${slug}.html`), 'utf8');
}

describe('tool runtime shared contract stabilization', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.ToolNexusConfig = {
      tool: { slug: 'runtime-test' }
    };
    window.ToolNexus = {};
  });

  test.each(targetedTools)('%s runtime boot completes without console errors', async (slug) => {
    document.body.innerHTML = `<div id="tool-root" data-tool-slug="${slug}"></div>`;
    const root = document.getElementById('tool-root');
    const template = templateFor(slug);

    const consoleErrors = [];
    const originalError = console.error;
    console.error = (...args) => {
      consoleErrors.push(args.map((arg) => String(arg)).join(' '));
    };

    try {
      const runtime = createToolRuntime({
        getRoot: () => root,
        loadManifest: async () => ({ slug, dependencies: [], styles: [], modulePath: `/js/tools/${slug}.js` }),
        templateLoader: async (_slug, mountRoot) => {
          mountRoot.innerHTML = template;
        },
        templateBinder: () => {},
        dependencyLoader: { loadDependencies: async () => undefined },
        importModule: async () => ({
          create: () => ({}),
          init: () => ({}),
          destroy: () => ({})
        }),
        lifecycleAdapter: async ({ module }) => {
          module?.init?.();
          return { mounted: true, cleanup: async () => {} };
        }
      });

      await runtime.bootstrapToolRuntime();

      const validation = validateToolDom(root);
      expect(validation.isValid).toBe(true);
      expect(consoleErrors).toEqual([]);
    } finally {
      console.error = originalError;
    }
  });
});
