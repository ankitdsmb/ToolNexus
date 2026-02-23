import { jest } from '@jest/globals';
import { legacyExecuteTool, resetLegacyBridgeForTesting } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/legacy-execution-bridge.js';

describe('legacy execution bridge safety', () => {
  beforeEach(() => {
    resetLegacyBridgeForTesting();
  });

  test('does not invoke execution-style runTool during mount bridge', async () => {
    const runTool = jest.fn();
    const root = document.createElement('div');

    const result = await legacyExecuteTool({
      slug: 'json-formatter',
      root,
      module: { runTool },
      context: { manifest: { slug: 'json-formatter', toolRuntimeType: 'execution' } }
    });

    expect(runTool).not.toHaveBeenCalled();
    expect(result.mounted).toBe(false);
  });
});
