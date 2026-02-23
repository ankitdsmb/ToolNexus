import { describe, expect, test } from 'vitest';
import { normalizeToolExecution } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-execution-normalizer.js';
import { createToolExecutionContext } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-execution-context.js';

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
