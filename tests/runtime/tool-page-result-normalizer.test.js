import { describe, expect, test } from 'vitest';
import {
  normalizeToolPageExecutionResult,
  shouldInitializeEditorsForExecutionResult,
  TOOL_PAGE_RUNTIME_FALLBACK_MESSAGE
} from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-page-result-normalizer.js';

describe('tool page execution result normalization', () => {
  test('unsupported_action result does not crash tool page pipeline', () => {
    const normalized = normalizeToolPageExecutionResult({ ok: false, reason: 'unsupported_action' });

    expect(normalized.shouldAbort).toBe(true);
    expect(normalized.reason).toBe('unsupported_action');
    expect(normalized.output).toBe(TOOL_PAGE_RUNTIME_FALLBACK_MESSAGE);
  });

  test('editors are not initialized when execution fails', () => {
    expect(shouldInitializeEditorsForExecutionResult({ ok: false, reason: 'unsupported_action' })).toBe(false);
    expect(shouldInitializeEditorsForExecutionResult(null)).toBe(false);
  });

  test('fallback UI message is rendered from runtime-safe constant', () => {
    const normalized = normalizeToolPageExecutionResult({ ok: false, reason: 'runtime_contract_mismatch' });
    expect(normalized.output).toBe('Tool execution skipped due to runtime contract mismatch.');
  });
});
