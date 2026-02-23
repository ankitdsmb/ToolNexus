import { describe, expect, test } from 'vitest';
import { normalizeToolExecution } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-execution-normalizer.js';
import { createToolExecutionContext } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-execution-context.js';

describe('execution normalizer runtime safety', () => {
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
