import { jest } from '@jest/globals';
import { mountToolLifecycle } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-lifecycle-adapter.js';
import { createToolExecutionContext } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-execution-context.js';
import { normalizeToolExecution } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-execution-normalizer.js';
import { createToolStateRegistry } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-state-registry.js';
import { createToolRuntime } from '../../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';

describe('tool execution normalization engine', () => {
  test('legacy runTool(action,input) modules are treated as execution-only and not mounted', async () => {
    const root = document.createElement('div');
    const context = createToolExecutionContext({ slug: 'legacy-tool', root, manifest: { slug: 'legacy-tool' } });
    const runTool = jest.fn(function runTool(action, input) { root.innerHTML = '<div>legacy mounted</div>'; return { action, input }; });

    const result = await mountToolLifecycle({
      module: { runTool },
      slug: 'legacy-tool',
      root,
      manifest: { slug: 'legacy-tool' },
      context,
      capabilities: { needsDOMReady: false }
    });

    expect(result.mounted).toBe(false);
    expect(result.mode).toBe('legacy.runTool.execution-only');
    expect(runTool).not.toHaveBeenCalled();
  });

  test('auto destroy is generated when destroy is missing', async () => {
    const root = document.createElement('div');
    const context = createToolExecutionContext({ slug: 'cleanup-tool', root, manifest: { slug: 'cleanup-tool' } });
    const handler = jest.fn();
    const module = {
      runTool: () => {
        context.addEventListener(root, 'click', handler);
      }
    };

    const normalized = normalizeToolExecution(module, {}, { slug: 'cleanup-tool', root, context });
    await normalized.create();
    await normalized.init();
    await normalized.destroy();

    root.dispatchEvent(new Event('click'));
    expect(handler).not.toHaveBeenCalled();
  });

  test('init defers until DOM is ready when required', async () => {
    const root = document.createElement('div');
    const context = createToolExecutionContext({ slug: 'dom-ready-tool', root, manifest: {} });
    const init = jest.fn();

    Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });
    const normalized = normalizeToolExecution({ init }, { needsDOMReady: true }, { slug: 'dom-ready-tool', root, context });

    const initPromise = normalized.init();
    expect(init).toHaveBeenCalledTimes(0);

    document.dispatchEvent(new Event('DOMContentLoaded'));
    await initPromise;
    expect(init).toHaveBeenCalledTimes(1);
  });

  test('state registry prevents duplicate mounts and tracks summary', () => {
    const registry = createToolStateRegistry();
    const root = document.createElement('div');
    root.id = 'tool-root';

    const first = registry.register({ slug: 'dup', root, compatibilityMode: 'legacy' });
    registry.setPhase(first.key, 'mounted');
    const second = registry.register({ slug: 'dup', root, compatibilityMode: 'legacy' });

    expect(second.duplicate).toBe(true);
    expect(registry.summary().mountedTools).toBe(1);
    expect(registry.summary().compatibilityModeUsage.legacy).toBe(1);
  });

  test('fallback renders only after auto-healing attempts fail', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="heal-fail"></div>';

    const runtime = createToolRuntime({
      loadManifest: async () => ({ slug: 'heal-fail', dependencies: [], modulePath: '/mock/heal.js' }),
      templateLoader: async (_slug, root) => {
        root.innerHTML = '<div class="tool-page"><textarea id="inputEditor"></textarea><textarea id="outputField"></textarea></div>';
      },
      templateBinder: () => {},
      dependencyLoader: { loadDependencies: async () => undefined },
      importModule: async () => ({ init: () => { throw new Error('fail init'); } }),
      lifecycleAdapter: async () => { throw new Error('adapter failed'); },
      legacyExecuteTool: async () => ({ mounted: false }),
      healRuntime: async () => false
    });

    await runtime.bootstrapToolRuntime();

    expect(document.querySelector('[data-tool-runtime-fallback="true"]')).not.toBeNull();
    expect(runtime.getDiagnostics().initRetriesPerformed).toBe(0);
  });
});
