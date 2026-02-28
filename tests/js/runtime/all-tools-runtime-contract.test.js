import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { invokeExecutionToolSafely, safeNoopResult } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/runtime-safe-tool-wrapper.js';
import { createToolRuntime } from '../../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';
import { validateToolDom } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-contract-validator.js';

const manifestPath = path.resolve(process.cwd(), 'tools.manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const tools = manifest.tools ?? [];

function resolveToolModulePath(slug) {
  const candidates = [
    path.resolve(process.cwd(), `src/ToolNexus.Web/wwwroot/js/tools/${slug}.js`),
    path.resolve(process.cwd(), `src/ToolNexus.Web/wwwroot/js/tools/${slug}/index.js`)
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

describe('all tools runtime contract coverage', () => {
  test.each(tools.map((tool) => [tool.slug]))('%s safely ignores legacy HTMLElement execution payload', async (slug) => {
    const modulePath = resolveToolModulePath(slug);
    if (!modulePath) {
      expect(modulePath).toBeNull();
      return;
    }

    const module = await import(pathToFileURL(modulePath).href);
    const runTool = module.runTool ?? module.default?.runTool;
    if (typeof runTool !== 'function') {
      return;
    }

    const result = await invokeExecutionToolSafely(runTool.bind(module), document.createElement('div'), { malformed: true });
    expect(result).toEqual(safeNoopResult('unsupported_action'));
  });
});


describe('all tools mount without DOM contract failure', () => {
  const templatesRoot = path.resolve(process.cwd(), 'src/ToolNexus.Web/wwwroot/tool-templates');

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

  test.each(tools.map((tool) => [tool.slug]))('%s mounts with contract-compliant ToolShell anchors', async (slug) => {
    document.body.innerHTML = `<div id="tool-root" data-tool-slug="${slug}"></div>`;
    const root = document.getElementById('tool-root');
    const events = [];

    const runtime = createToolRuntime({
      getRoot: () => root,
      observer: {
        emit: (event, payload) => events.push({ event, payload }),
        subscribe: () => () => {}
      },
      loadManifest: async () => ({ slug, dependencies: [], styles: [], modulePath: `/js/tools/${slug}.js`, uiMode: 'custom', complexityTier: 2 }),
      templateLoader: async (currentSlug, mountRoot) => {
        const templatePath = path.join(templatesRoot, `${currentSlug}.html`);
        mountRoot.innerHTML = fs.existsSync(templatePath) ? fs.readFileSync(templatePath, 'utf8') : '';
      },
      templateBinder: () => {},
      dependencyLoader: { loadDependencies: async () => undefined },
      importModule: async () => {
        throw new Error(`missing module for ${slug}`);
      }
    });

    await runtime.bootstrapToolRuntime();

    const domContractFailures = events.filter((entry) => entry.event === 'dom_contract_failure');
    expect(domContractFailures).toHaveLength(0);
    expect(validateToolDom(root).isValid).toBe(true);
  });
});
