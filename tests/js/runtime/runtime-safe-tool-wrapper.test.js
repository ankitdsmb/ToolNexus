import { normalizeToolExecutionPayload, safeNoopResult, invokeExecutionToolSafely } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/runtime-safe-tool-wrapper.js';

describe('runtime safe tool wrapper', () => {
  test('returns unsupported_action when action is not a string', () => {
    expect(normalizeToolExecutionPayload(null, 'abc')).toEqual({
      action: '',
      input: 'abc',
      isValidAction: false,
      result: safeNoopResult('unsupported_action')
    });
  });

  test('guards HTMLElement payload bridge mismatches', () => {
    const action = document.createElement('div');
    expect(normalizeToolExecutionPayload(action, 42)).toEqual({
      action: '',
      input: '',
      isValidAction: false,
      result: safeNoopResult('unsupported_action')
    });
  });

  test('normalizes non-string input before execution', async () => {
    const runTool = async (_action, input) => input;
    await expect(invokeExecutionToolSafely(runTool, 'format', { value: true })).resolves.toBe('');
  });

  test('never throws when tool execution fails', async () => {
    const runTool = async () => { throw new Error('boom'); };
    await expect(invokeExecutionToolSafely(runTool, 'format', 'x')).resolves.toEqual(safeNoopResult('tool_execution_failed'));
  });
});
