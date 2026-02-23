export const TOOL_PAGE_RUNTIME_FALLBACK_MESSAGE = 'Tool execution skipped due to runtime contract mismatch.';

export function normalizeToolPageExecutionResult(result) {
  if (!result) {
    return {
      shouldAbort: true,
      reason: 'empty_result',
      output: TOOL_PAGE_RUNTIME_FALLBACK_MESSAGE,
      ok: false
    };
  }

  if (result?.ok === false) {
    return {
      shouldAbort: true,
      reason: result.reason || 'runtime_contract_mismatch',
      output: TOOL_PAGE_RUNTIME_FALLBACK_MESSAGE,
      ok: false
    };
  }

  if (typeof result === 'string') {
    return { shouldAbort: false, reason: null, output: result, ok: true };
  }

  return {
    shouldAbort: false,
    reason: null,
    output: result?.output || result?.error || 'No output',
    ok: true
  };
}

export function shouldInitializeEditorsForExecutionResult(result) {
  return !normalizeToolPageExecutionResult(result).shouldAbort;
}
