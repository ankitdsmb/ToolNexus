import { createToolRuntime } from '../../tool-runtime.js';

function createRoot(slug = 'json-formatter') {
  const root = document.createElement('div');
  root.id = 'tool-root';
  root.dataset.toolSlug = slug;
  document.body.appendChild(root);
  return root;
}

function createObserver() {
  const events = [];
  return {
    events,
    emit(name, payload) {
      events.push({ name, payload });
    }
  };
}

describe('tool-runtime enterprise stability', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    globalThis.window.ToolNexus = {};
    globalThis.window.ToolNexusConfig = {};
  });

  test('survives missing manifest by entering fallback mode', async () => {
    const root = createRoot('missing-manifest');
    const observer = createObserver();
    const runtime = createToolRuntime({
      observer,
      getRoot: () => root,
      loadManifest: async () => {
        throw new Error('manifest missing');
      },
      templateLoader: async () => {
        throw new Error('template missing');
      },
      dependencyLoader: { loadDependencies: async () => {} },
      lifecycleAdapter: async () => ({ mounted: false, cleanup: () => {} }),
      legacyExecuteTool: async () => ({ mounted: false, cleanup: () => {} }),
      legacyBootstrap: async () => ({ mounted: false, cleanup: () => {} }),
      legacyAutoInit: async () => ({ mounted: false, cleanup: () => {} }),
      detectToolCapabilities: () => ({ mountMode: 'replace' }),
      safeDomMount: () => ({ mode: 'replace', hadSsrMarkup: false, ssrSnapshot: [] }),
      validateDomContract: () => ({ isValid: true, missingNodes: [] }),
      createToolExecutionContext: () => ({ addCleanup() {}, destroy: async () => {}, listeners: [], cleanupCallbacks: [] })
    });

    await runtime.bootstrapToolRuntime();

    expect(root.querySelector('[data-tool-runtime-fallback="true"]')).not.toBeNull();
    expect(observer.events.some((event) => event.name === 'manifest_failure')).toBe(true);
  });

  test('handles module import failure without crashing runtime', async () => {
    const root = createRoot('broken-module');
    const observer = createObserver();
    const runtime = createToolRuntime({
      observer,
      getRoot: () => root,
      loadManifest: async () => ({ modulePath: '/js/tools/broken.js', dependencies: [], styles: [] }),
      importModule: async () => {
        throw new Error('import failed');
      },
      templateLoader: async () => {
        root.innerHTML = '<article class="tool-page"></article>';
      },
      dependencyLoader: { loadDependencies: async () => {} },
      lifecycleAdapter: async () => ({ mounted: false, cleanup: () => {} }),
      legacyExecuteTool: async () => ({ mounted: false, cleanup: () => {} }),
      legacyBootstrap: async () => ({ mounted: false, cleanup: () => {} }),
      legacyAutoInit: async () => ({ mounted: false, cleanup: () => {} }),
      detectToolCapabilities: () => ({ mountMode: 'enhance' }),
      safeDomMount: () => ({ mode: 'enhance', hadSsrMarkup: false, ssrSnapshot: [] }),
      validateDomContract: () => ({ isValid: true, missingNodes: [] }),
      createToolExecutionContext: () => ({ addCleanup() {}, destroy: async () => {}, listeners: [], cleanupCallbacks: [] })
    });

    await runtime.bootstrapToolRuntime();

    expect(observer.events.some((event) => event.name === 'module_import_failure')).toBe(true);
    expect(root.firstElementChild).not.toBeNull();
  });

  test('renders contract error when DOM validation fails', async () => {
    const root = createRoot('dom-mismatch');
    const runtime = createToolRuntime({
      getRoot: () => root,
      loadManifest: async () => ({ modulePath: '/js/tools/json-formatter.js', dependencies: [], styles: [] }),
      templateLoader: async () => {
        root.innerHTML = '<article class="tool-page"></article>';
      },
      importModule: async () => ({ create() {}, init() {}, destroy() {} }),
      dependencyLoader: { loadDependencies: async () => {} },
      detectToolCapabilities: () => ({ mountMode: 'enhance' }),
      safeDomMount: () => ({ mode: 'enhance', hadSsrMarkup: false, ssrSnapshot: [] }),
      validateDomContract: () => ({ isValid: false, missingNodes: ['#inputEditor', '#outputEditor'] }),
      createToolExecutionContext: () => ({ addCleanup() {}, destroy: async () => {}, listeners: [], cleanupCallbacks: [] })
    });

    await runtime.bootstrapToolRuntime();

    expect(root.querySelector('.tool-contract-error')).not.toBeNull();
  });

  test('cleans listeners and callbacks across repeated mount/destroy cycles', async () => {
    const root = createRoot('memory-check');
    const contexts = [];
    const runtime = createToolRuntime({
      getRoot: () => root,
      loadManifest: async () => ({ modulePath: '/js/tools/json-formatter.js', dependencies: [], styles: [] }),
      templateLoader: async () => {
        root.innerHTML = '<article class="tool-page"><button id="runBtn" type="button">Run</button></article>';
      },
      importModule: async () => ({ create() {}, init() {}, destroy() {} }),
      dependencyLoader: { loadDependencies: async () => {} },
      detectToolCapabilities: () => ({ mountMode: 'replace' }),
      safeDomMount: () => ({ mode: 'replace', hadSsrMarkup: false, ssrSnapshot: [] }),
      validateDomContract: () => ({ isValid: true, missingNodes: [] }),
      createToolExecutionContext: () => {
        const context = {
          listeners: [{}, {}],
          cleanupCallbacks: [() => {}, () => {}],
          addCleanup(fn) {
            this.cleanupCallbacks.push(fn);
          },
          async destroy() {
            this.listeners.length = 0;
            this.cleanupCallbacks.length = 0;
          }
        };
        contexts.push(context);
        return context;
      },
      lifecycleAdapter: async ({ context }) => ({ mounted: true, cleanup: context.destroy.bind(context) })
    });

    for (let index = 0; index < 8; index += 1) {
      await runtime.bootstrapToolRuntime();
      await root.__toolNexusRuntimeCleanup?.();
      delete root.__toolNexusRuntimeCleanup;
    }

    expect(contexts).toHaveLength(8);
    expect(contexts.every((context) => context.listeners.length === 0 && context.cleanupCallbacks.length === 0)).toBe(true);
  });
});
