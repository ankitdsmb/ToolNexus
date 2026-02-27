import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createToolRuntime } from '../../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';

const REQUIRED_TOOLS = [
  'json-formatter',
  'json-validator',
  'xml-formatter',
  'csv-viewer',
  'regex-tester',
  'base64-encode',
  'html-formatter',
  'sql-formatter',
  'uuid-generator',
  'text-diff'
];

describe('required tools runtime stabilization on single ToolShell page', () => {
  test('mounts required tools sequentially with modern lifecycle and no compatibility fallback', async () => {
    document.body.innerHTML = '<div id="tool-root" data-runtime-container="true"></div>';
    const root = document.getElementById('tool-root');
    const events = [];

    const runtime = createToolRuntime({
      observer: {
        emit: (event, payload) => events.push({ event, payload }),
        subscribe: () => () => {}
      },
      loadManifest: async (slug) => ({
        slug,
        dependencies: [],
        modulePath: `/js/tools/${slug}.js`,
        toolRuntimeType: 'mount',
        uiMode: 'custom',
        complexityTier: 2
      }),
      templateLoader: async (_slug, mountRoot) => {
        mountRoot.innerHTML = `
          <section class="tool-page" data-tool-root="true" data-runtime-container="true">
            <section data-tool-header="true"></section>
            <section data-tool-body="true">
              <section data-tool-input="true"><textarea id="inputEditor"></textarea></section>
              <section data-tool-output="true" id="outputField"></section>
            </section>
            <footer data-tool-actions="true"></footer>
          </section>
        `;
      },
      templateBinder: () => {},
      dependencyLoader: { loadDependencies: async () => undefined },
      importModule: async (modulePath) => {
        const absolute = path.resolve(process.cwd(), `src/ToolNexus.Web/wwwroot${modulePath}`);
        return import(pathToFileURL(absolute).href);
      }
    });

    for (const slug of REQUIRED_TOOLS) {
      root.dataset.toolSlug = slug;
      await runtime.bootstrapToolRuntime();
    }

    const compatibilityEvents = events.filter((entry) => entry.event === 'compatibility_mode_used');
    const mountFailures = events.filter((entry) => entry.event === 'mount_failure');
    const lifecycleRetries = events.filter((entry) => entry.event === 'runtime_lifecycle_retry');
    const mountSuccesses = events.filter((entry) => entry.event === 'mount_success');

    expect(mountSuccesses).toHaveLength(REQUIRED_TOOLS.length);
    expect(compatibilityEvents).toHaveLength(0);
    expect(lifecycleRetries).toHaveLength(0);
    expect(mountFailures).toHaveLength(0);

    const diagnostics = runtime.getDiagnostics();
    expect(diagnostics.legacyAdapterUsage).toBe(0);
    expect(diagnostics.toolsMountedSuccessfully).toBe(REQUIRED_TOOLS.length);
  });
});
