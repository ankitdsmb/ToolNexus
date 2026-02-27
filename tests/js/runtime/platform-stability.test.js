import fs from 'node:fs';
import path from 'node:path';
import { jest } from '@jest/globals';
import { createToolRuntime } from '../../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';

const repoRoot = process.cwd();
const viewsDir = path.join(repoRoot, 'src/ToolNexus.Web/Views/Tools');
const manifestsDir = path.join(repoRoot, 'src/ToolNexus.Web/App_Data/tool-manifests');
const templatesDir = path.join(repoRoot, 'src/ToolNexus.Web/wwwroot/tool-templates');
const webRootDir = path.join(repoRoot, 'src/ToolNexus.Web/wwwroot');
const reservedViews = new Set(['Index', 'Category', 'Tool', 'ToolShell']);

function toSlug(viewName) {
  return viewName
    .replace(/json2/gi, 'json-to-')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

function getToolRegistry() {
  return fs.readdirSync(viewsDir)
    .filter((file) => file.endsWith('.cshtml'))
    .map((file) => path.basename(file, '.cshtml'))
    .filter((view) => !reservedViews.has(view))
    .map((view) => ({ view, slug: toSlug(view) }));
}

describe('platform stability', () => {
  const tools = getToolRegistry();

  test('all discovered tools have manifests', () => {
    for (const tool of tools) {
      expect(fs.existsSync(path.join(manifestsDir, `${tool.slug}.json`))).toBe(true);
      const manifest = JSON.parse(fs.readFileSync(path.join(manifestsDir, `${tool.slug}.json`), 'utf8'));
      expect(manifest.slug).toBe(tool.slug);
      expect(manifest.modulePath).toBeTruthy();
    }
  });

  test('all discovered tools have templates and no razor tokens', () => {
    for (const tool of tools) {
      const templatePath = path.join(templatesDir, `${tool.slug}.html`);
      expect(fs.existsSync(templatePath)).toBe(true);
      const template = fs.readFileSync(templatePath, 'utf8');
      expect(template.trim().length).toBeGreaterThan(0);
      expect(template).not.toMatch(/@Model\./);
    }
  });



  test('manifest dependencies and styles resolve to files', () => {
    for (const tool of tools) {
      const manifestPath = path.join(manifestsDir, `${tool.slug}.json`);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      for (const dependency of manifest.dependencies ?? []) {
        expect(fs.existsSync(path.join(webRootDir, dependency.replace(/^\//, '')))).toBe(true);
      }

      const styles = Array.isArray(manifest.styles)
        ? manifest.styles
        : [manifest.cssPath].filter(Boolean);

      for (const stylePath of styles) {
        expect(fs.existsSync(path.join(webRootDir, stylePath.replace(/^\//, '')))).toBe(true);
      }
    }
  });

  test('dependency loading and lifecycle execute and render root', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="demo-tool"></div>';

    const dependencyLoader = { loadDependencies: jest.fn().mockResolvedValue(undefined) };
    const templateLoader = jest.fn(async (_slug, root) => {
      root.innerHTML = '<div data-bind="tool.slug"></div><div id="mounted"></div>';
    });
    const lifecycleAdapter = jest.fn(async ({ root }) => {
      root.querySelector('#mounted').textContent = 'ready';
    });

    window.ToolNexusConfig = { tool: { slug: 'demo-tool' } };

    const runtime = createToolRuntime({
      dependencyLoader,
      templateLoader,
      lifecycleAdapter,
      loadManifest: async () => ({
        slug: 'demo-tool',
        modulePath: '/js/tools/demo.js',
        templatePath: '/tool-templates/demo-tool.html',
        dependencies: ['/lib/monaco/vs/loader.js'],
        uiMode: 'custom',
        complexityTier: 2
      }),
      importModule: async () => ({ mount: async () => {} })
    });

    await runtime.bootstrapToolRuntime();

    expect(dependencyLoader.loadDependencies).toHaveBeenCalledWith({
      dependencies: ['/lib/monaco/vs/loader.js'],
      toolSlug: 'demo-tool'
    });
    expect(lifecycleAdapter).toHaveBeenCalled();
    expect(document.getElementById('tool-root').textContent).toContain('ready');
  });

  test('runtime stays alive when manifest/module/dependency fail and uses legacy fallback', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="legacy-tool"></div>';

    const runTool = jest.fn((root) => {
      root.innerHTML = '<div id="legacy-ui">legacy ok</div>';
    });

    window.ToolNexusModules = {
      'legacy-tool': { runTool }
    };

    window.ToolNexusConfig = { runtimeUiMode: 'custom', runtimeModulePath: '/legacy-tool.js' };

    const runtime = createToolRuntime({
      loadManifest: async () => { throw new Error('manifest 404'); },
      templateLoader: async () => { throw new Error('template 404'); },
      dependencyLoader: { loadDependencies: async () => { throw new Error('dependency 404'); } },
      importModule: async () => { throw new Error('module 404'); }
    });

    await runtime.bootstrapToolRuntime();

    expect(document.getElementById('tool-root').children.length).toBeGreaterThan(0);
    expect(document.getElementById('legacy-ui') || document.querySelector('.tool-auto-runtime') || document.querySelector('.tool-runtime-fallback')).not.toBeNull();
  });

});
