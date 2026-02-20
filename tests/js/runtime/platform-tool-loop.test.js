import fs from 'node:fs';
import path from 'node:path';
import { createToolRuntime } from '../../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';

const repoRoot = process.cwd();
const webRoot = path.join(repoRoot, 'src/ToolNexus.Web/wwwroot');
const modulesRoot = path.join(webRoot, 'js/tools');
const templatesRoot = path.join(webRoot, 'tool-templates');

function discoverTools() {
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tools.manifest.json'), 'utf8'));
  return manifest.tools.map((tool) => tool.slug).sort();
}

function hasToolModule(slug) {
  const candidates = [
    `${slug}.js`,
    `${slug}.app.js`,
    path.join(slug, 'main.js'),
    path.join(slug, 'index.js')
  ];

  return candidates.some((candidate) => fs.existsSync(path.join(modulesRoot, candidate)));
}

describe('platform strict tool loop', () => {
  const tools = discoverTools();

  test('registry includes only tools that can initialize via module or fallback', () => {
    for (const slug of tools) {
      const hasModule = hasToolModule(slug);
      const hasTemplate = fs.existsSync(path.join(templatesRoot, `${slug}.html`));
      expect(hasModule || hasTemplate).toBe(true);
    }
  });

  test.each(tools)('initializes %s without leaving an empty root', async (slug) => {
    document.body.innerHTML = `<div id="tool-root" data-tool-slug="${slug}"></div>`;

    const runtime = createToolRuntime({
      loadManifest: async () => ({
        slug,
        modulePath: `/js/tools/${slug}.js`,
        templatePath: `/tool-templates/${slug}.html`,
        dependencies: []
      }),
      templateLoader: async () => {
        throw new Error('template missing in stabilization test');
      },
      dependencyLoader: { loadDependencies: async () => undefined },
      importModule: async () => {
        throw new Error('module import intentionally blocked to exercise fallback');
      },
      lifecycleAdapter: async () => ({ mounted: false }),
      legacyAutoInit: async ({ root }) => {
        root.innerHTML = `<div data-tool="${slug}">compat ui</div>`;
        return { mounted: true };
      }
    });

    await expect(runtime.bootstrapToolRuntime()).resolves.not.toThrow();
    const root = document.getElementById('tool-root');
    expect(root).not.toBeNull();
    expect(root?.innerHTML.trim().length).toBeGreaterThan(0);
  });
});
