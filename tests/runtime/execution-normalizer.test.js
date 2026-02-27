import { describe, expect, test } from 'vitest';
import { normalizeToolExecution } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-execution-normalizer.js';
import { createToolExecutionContext } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-execution-context.js';
import { runtimeObserver } from '../../src/ToolNexus.Web/wwwroot/js/runtime/runtime-observer.js';

describe('execution normalizer runtime safety', () => {
  test('uses explicit toolRuntimeType=mount before arity fallback', async () => {
    const root = document.createElement('div');
    const context = createToolExecutionContext({
      slug: 'metadata-mount',
      root,
      manifest: { slug: 'metadata-mount' }
    });

    let callCount = 0;
    const toolModule = {
      toolRuntimeType: 'mount',
      runTool(action, input) {
        callCount += 1;
        root.dataset.receivedAction = String(action);
        root.dataset.receivedInput = String(input);
      }
    };

    const normalized = normalizeToolExecution(toolModule, {}, { slug: 'metadata-mount', root, context });
    await normalized.create();
    await normalized.init();

    expect(normalized.metadata.mode).toBe('legacy.runTool');
    expect(callCount).toBe(1);
  });

  test('uses explicit toolRuntimeType=execution before arity fallback', async () => {
    const root = document.createElement('div');
    const context = createToolExecutionContext({
      slug: 'metadata-execution',
      root,
      manifest: { slug: 'metadata-execution' }
    });

    let callCount = 0;
    const toolModule = {
      toolRuntimeType: 'execution',
      runTool(rootArg) {
        callCount += 1;
        return rootArg;
      }
    };

    const normalized = normalizeToolExecution(toolModule, {}, { slug: 'metadata-execution', root, context });
    await normalized.create();
    await normalized.init();

    expect(normalized.metadata.mode).toBe('legacy.runTool.execution-only');
    expect(callCount).toBe(0);
  });


  test('emits runtime_lifecycle_retry warning event when init retries with root-first signature', async () => {
    const root = document.createElement('div');
    const context = createToolExecutionContext({
      slug: 'retry-observability',
      root,
      manifest: { slug: 'retry-observability' }
    });

    const emitted = [];
    const originalEmit = runtimeObserver.emit;
    runtimeObserver.emit = (event, payload) => {
      emitted.push({ event, payload });
      return originalEmit.call(runtimeObserver, event, payload);
    };

    try {
      const init = async (firstArg) => {
        if (!(firstArg instanceof Element)) {
          throw new Error('context-first signature unsupported');
        }

        root.setAttribute('data-init', 'retried');
        return { mounted: true };
      };

      const normalized = normalizeToolExecution({ create() {}, init, destroy() {} }, {}, {
        slug: 'retry-observability',
        root,
        context
      });

      await normalized.create();
      await normalized.init();

      const retryEvent = emitted.find((entry) => entry.event === 'runtime_lifecycle_retry');
      expect(retryEvent).toBeDefined();
      expect(retryEvent.payload.toolSlug).toBe('retry-observability');
      expect(retryEvent.payload.metadata.originalError).toContain('context-first signature unsupported');
      expect(retryEvent.payload.metadata.retryStrategy).toBe('root-first');
    } finally {
      runtimeObserver.emit = originalEmit;
    }
  });

  test('does not invoke execution-only runTool(action,input) during mount', async () => {
    const root = document.createElement('div');
    const context = createToolExecutionContext({ slug: 'sql-formatter', root, manifest: { slug: 'sql-formatter' } });
    let callCount = 0;
    function runTool(action, input) {
      callCount += 1;
      return { action, input };
    }

    const normalized = normalizeToolExecution({ runTool }, {}, { slug: 'sql-formatter', root, context });
    await normalized.create();
    await normalized.init();

    expect(normalized.metadata.mode).toBe('legacy.runTool.execution-only');
    expect(callCount).toBe(0);
  });
});
