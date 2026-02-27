import { createToolRuntime } from '../../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';
import { resetToolPlatformKernelForTesting } from '../../../src/ToolNexus.Web/wwwroot/js/tools/tool-platform-kernel.js';

const toolSlugs = [
  'base64-decode',
  'base64-encode',
  'case-converter',
  'css-minifier',
  'csv-viewer',
  'html-entities',
  'html-formatter',
  'html-to-markdown',
  'js-minifier',
  'json-to-csv',
  'json-to-xml',
  'json-to-yaml',
  'json-toolkit-pro',
  'json-validator',
  'markdown-to-html',
  'sql-formatter',
  'text-intelligence-analyzer',
  'url-decode',
  'url-encode',
  'uuid-generator',
  'xml-formatter',
  'xml-to-json',
  'yaml-to-json'
];

const mountModes = ['custom-container', 'fullscreen', 'panel'];

function createContractTemplate(slug) {
  return `
    <section data-runtime-container="${slug}">
      <div data-tool-root data-tool="${slug}">
        <div data-tool-input></div>
        <div data-tool-output></div>
        <div data-tool-actions></div>
      </div>
    </section>
  `;
}

function createRuntimeRoot(slug, mountMode) {
  const host = document.createElement('div');
  host.dataset.mode = mountMode;
  host.innerHTML = `<div id="tool-root" data-tool-slug="${slug}" data-mount-mode="${mountMode}"></div>`;
  document.body.appendChild(host);
  return host.querySelector('#tool-root');
}

describe('tool root safety integration matrix', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    resetToolPlatformKernelForTesting();
    window.ToolNexus = {};
    window.ToolNexusConfig = {
      runtimeEnvironment: 'development',
      runtimeStrictMode: true,
      tool: { slug: 'root-safety' }
    };
    window.ToolNexusRuntime = { strict: true };
  });

  test.each(toolSlugs.flatMap((slug) => mountModes.map((mountMode) => [slug, mountMode])))
  ('%s mounts with runtime-scoped root in %s mode', async (slug, mountMode) => {
    const events = [];
    const root = createRuntimeRoot(slug, mountMode);

    const runtime = createToolRuntime({
      getRoot: () => root,
      observer: { emit: (name, payload) => events.push({ name, payload }) },
      loadManifest: async () => ({ slug, dependencies: [], styles: [], modulePath: `/js/tools/${slug}.js` }),
      templateLoader: async (_slug, mountRoot) => {
        mountRoot.innerHTML = createContractTemplate(slug);
      },
      templateBinder: () => {},
      dependencyLoader: { loadDependencies: async () => undefined },
      validateDomContract: () => ({ isValid: true, mountSafe: true, missingNodes: [], detectedLayoutType: 'modern-layout' }),
      adaptDomContract: () => ({ adapted: false }),
      legacyExecuteTool: async () => {
        throw new Error('legacy-execution-bridge should be disabled in strict mode');
      },
      legacyAutoInit: async () => {
        throw new Error('lifecycle retry fallback should be disabled in strict mode');
      },
      legacyBootstrap: async () => {
        throw new Error('legacy bootstrap should be disabled in strict mode');
      },
      importModule: async () => import(`../../../src/ToolNexus.Web/wwwroot/js/tools/${slug}.js`),
      lifecycleAdapter: async ({ module, root: lifecycleRoot }) => {
        const originalQuerySelector = document.querySelector.bind(document);
        document.querySelector = () => {
          throw new Error('global querySelector used in lifecycle create path');
        };

        try {
          const handle = module.create({ root: lifecycleRoot });
          return { mounted: Boolean(handle), mode: 'module.lifecycle-contract.modern', cleanup: async () => module.destroy?.({ root: lifecycleRoot }) };
        } finally {
          document.querySelector = originalQuerySelector;
        }
      }
    });

    await expect(runtime.bootstrapToolRuntime()).resolves.toBeUndefined();

    const eventNames = events.map((entry) => entry.name);
    expect(eventNames).not.toContain('mount_fallback_content');
    expect(eventNames).not.toContain('mount_failure');

    const compatibilityModes = events
      .filter((entry) => entry.name === 'compatibility_mode_used')
      .map((entry) => entry.payload?.modeUsed);

    expect(compatibilityModes).toEqual([]);
  });
});
