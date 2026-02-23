import { jest } from '@jest/globals';
import { normalizeToolExecutionPayload, safeNoopResult, invokeExecutionToolSafely } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/runtime-safe-tool-wrapper.js';
import { runtimeIncidentReporter } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/runtime-incident-reporter.js';

describe('runtime safe tool wrapper', () => {
  beforeEach(async () => {
    global.fetch = jest.fn(async () => ({ ok: true }));
    await runtimeIncidentReporter.flush();
  });

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


  test('invalid action logs incident and runtime stays safe', async () => {
    const before = runtimeIncidentReporter.getPendingCount();
    const payload = normalizeToolExecutionPayload({ bad: true }, 'abc', { toolSlug: 'json-formatter' });

    expect(payload.isValidAction).toBe(false);
    expect(payload.result).toEqual(safeNoopResult('unsupported_action'));
    expect(runtimeIncidentReporter.getPendingCount()).toBeGreaterThanOrEqual(before + 1);

    await expect(runtimeIncidentReporter.flush()).resolves.toBeUndefined();
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
