import { jest } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

import { bootstrapLegacyTool } from '../../src/ToolNexus.Web/wwwroot/js/runtime/legacy-tool-bootstrap.js';

const repoRoot = process.cwd();
const viewsRoot = path.join(repoRoot, 'src/ToolNexus.Web/Views/Tools');
const manifestsRoot = path.join(repoRoot, 'src/ToolNexus.Web/App_Data/tool-manifests');
const NON_TOOL_VIEWS = new Set(['Category', 'Index', 'Tool', 'ToolShell']);

function discoverToolViews() {
  return fs
    .readdirSync(viewsRoot)
    .filter((file) => file.endsWith('.cshtml'))
    .map((file) => path.basename(file, '.cshtml'))
    .filter((name) => !NON_TOOL_VIEWS.has(name));
}

function readManifests() {
  return fs.readdirSync(manifestsRoot)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(fs.readFileSync(path.join(manifestsRoot, file), 'utf8')));
}

function resolveModuleFile(modulePath) {
  if (!modulePath) {
    return null;
  }

  const normalizedPath = modulePath.replace(/^\//, '');
  return path.join(repoRoot, 'src/ToolNexus.Web/wwwroot', normalizedPath);
}

function detectBootPattern(moduleFile) {
  if (!moduleFile || !fs.existsSync(moduleFile)) {
    return { hasModule: false };
  }

  const source = fs.readFileSync(moduleFile, 'utf8');
  return {
    hasModule: true,
    lifecycle: /export\s+(async\s+)?function\s+(create|init|destroy|mount)|export\s+const\s+(create|init|destroy|mount)/.test(source),
    runTool: /export\s+(async\s+)?function\s+runTool|export\s+const\s+runTool/.test(source),
    registry: /window\.ToolNexusModules/.test(source),
    domReady: /DOMContentLoaded/.test(source),
    selfExecuting: /\(\s*function\s*\(|=>\s*\{[\s\S]{0,80}document\./.test(source)
  };
}

describe('platform tool boot harness', () => {
  const manifests = readManifests();
  const views = discoverToolViews();

  test('maps all tool views to manifest entries with module paths', () => {
    const mapped = views.map((viewName) => manifests.find((manifest) => manifest.viewName === viewName));

    expect(mapped.every(Boolean)).toBe(true);
    expect(mapped.every((manifest) => Boolean(manifest.modulePath))).toBe(true);
  });

  test('builds a boot matrix that guarantees at least one boot path per tool', () => {
    for (const viewName of views) {
      const manifest = manifests.find((item) => item.viewName === viewName);
      expect(manifest).toBeTruthy();

      const moduleFile = resolveModuleFile(manifest.modulePath);
      const matrix = detectBootPattern(moduleFile);
      expect(matrix.hasModule).toBe(true);

      const hasBootPath = matrix.lifecycle || matrix.runTool || matrix.registry || matrix.domReady || matrix.selfExecuting;
      expect(hasBootPath).toBe(true);
    }
  });


  test('legacy bootstrap does not execute execution-only runTool contracts during mount', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="exec-only"></div>';
    const root = document.getElementById('tool-root');

    const runTool = jest.fn();
    const result = await bootstrapLegacyTool({
      module: { runTool },
      slug: 'exec-only',
      root,
      manifest: { slug: 'exec-only', toolRuntimeType: 'execution' }
    });

    expect(runTool).not.toHaveBeenCalled();
    expect(result.mounted).toBe(false);
  });

  test('legacy adapter forces DOM-ready boot for modules that missed DOMContentLoaded', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="legacy"></div>';
    const root = document.getElementById('tool-root');

    const legacyModule = {
      booted: false,
      register() {
        document.addEventListener('DOMContentLoaded', () => {
          this.booted = true;
          root.innerHTML = '<div data-tool-ui="legacy">mounted</div>';
        });
      }
    };

    legacyModule.register();

    const result = await bootstrapLegacyTool({
      module: {},
      slug: 'legacy',
      root,
      manifest: { slug: 'legacy' }
    });

    expect(result.mounted).toBe(true);
    expect(legacyModule.booted).toBe(true);
    expect(root.querySelector('[data-tool-ui="legacy"]')).not.toBeNull();
  });
});
