import fs from 'node:fs';
import path from 'node:path';

import { createToolRuntime } from '../../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';
import { validateToolDom } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-contract-validator.js';

const repoRoot = process.cwd();
const templatesRoot = path.join(repoRoot, 'src/ToolNexus.Web/wwwroot/tool-templates');
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tools.manifest.json'), 'utf8'));

const slugs = manifest.tools
  .map((tool) => tool.slug)
  .filter((slug) => {
    const template = readTemplate(slug);
    return template.includes('data-tool-root')
      && template.includes('data-tool-input')
      && template.includes('data-tool-output')
      && template.includes('data-runtime-container');
  });

function readTemplate(slug) {
  return fs.readFileSync(path.join(templatesRoot, `${slug}.html`), 'utf8');
}

describe('tool runtime integration matrix', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.ToolNexus = {};
    window.ToolNexusConfig = {
      runtimeEnvironment: 'development',
      runtimeStrictMode: true,
      tool: { slug: 'runtime-integration' }
    };
    window.ToolNexusRuntime = { strict: true };
  });

  test.each(slugs)('%s mounts in strict modern lifecycle mode without retries/fallback', async (slug) => {
    const events = [];
    document.body.innerHTML = `<div id="tool-root" data-tool-slug="${slug}"></div>`;
    const root = document.getElementById('tool-root');

    const runtime = createToolRuntime({
      getRoot: () => root,
      observer: { emit: (name, payload) => events.push({ name, payload }) },
      loadManifest: async () => ({ slug, dependencies: [], styles: [], modulePath: `/js/tools/${slug}.js` }),
      templateLoader: async (_slug, mountRoot) => {
        mountRoot.innerHTML = readTemplate(slug);
      },
      templateBinder: () => {},
      dependencyLoader: { loadDependencies: async () => undefined },
      importModule: async () => ({
        create: () => ({}),
        init: () => ({}),
        destroy: () => ({})
      }),
      lifecycleAdapter: async ({ module }) => {
        module.create?.();
        module.init?.();
        return { mounted: true, mode: 'module.lifecycle-contract', cleanup: async () => {} };
      }
    });

    await runtime.bootstrapToolRuntime();

    const contract = validateToolDom(root);
    expect(contract.mountSafe).toBe(true);

    const eventNames = events.map((entry) => entry.name);
    expect(eventNames).not.toContain('init_retry');
    expect(eventNames).not.toContain('mount_fallback_content');

    const compatibilityModes = events
      .filter((entry) => entry.name === 'compatibility_mode_used')
      .map((entry) => entry.payload?.modeUsed);

    expect(compatibilityModes).toEqual([]);
  });
});
