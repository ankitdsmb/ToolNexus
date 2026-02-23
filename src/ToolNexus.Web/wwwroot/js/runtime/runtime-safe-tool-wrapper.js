function isHTMLElementValue(value) {
  if (!value) {
    return false;
  }

  if (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) {
    return true;
  }

  return Boolean(value?.nodeType === 1 && typeof value?.tagName === 'string');
}

export function safeNoopResult(reason = 'unsupported_action') {
  return { ok: false, reason };
}

export function normalizeToolExecutionPayload(action, input) {
  if (isHTMLElementValue(action)) {
    return {
      action: '',
      input: typeof input === 'string' ? input : '',
      isValidAction: false,
      result: safeNoopResult('unsupported_action')
    };
  }

  if (typeof action !== 'string') {
    return {
      action: '',
      input: typeof input === 'string' ? input : '',
      isValidAction: false,
      result: safeNoopResult('unsupported_action')
    };
  }

  return {
    action,
    input: typeof input === 'string' ? input : '',
    isValidAction: true,
    result: null
  };
}

export async function invokeExecutionToolSafely(runTool, action, input) {
  const normalized = normalizeToolExecutionPayload(action, input);
  if (!normalized.isValidAction) {
    return normalized.result;
  }

  try {
    return await runTool(normalized.action, normalized.input);
  } catch {
    return safeNoopResult('tool_execution_failed');
  }
}

