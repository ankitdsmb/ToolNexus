import { runtimeIncidentReporter } from './runtime-incident-reporter.js';

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

function normalizeExecutionInput(input) {
  if (typeof input === 'string') {
    return input;
  }

  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return input;
  }

  return '';
}

function describePayloadType(action) {
  if (isHTMLElementValue(action)) {
    return 'html_element';
  }

  if (action === null) {
    return 'null';
  }

  return typeof action;
}

function reportContractViolation({ toolSlug = 'unknown-tool', message, payloadType }) {
  runtimeIncidentReporter.report({
    toolSlug,
    phase: 'execute',
    errorType: 'contract_drift',
    message,
    payloadType,
    timestamp: new Date().toISOString()
  });
}

export function normalizeToolExecutionPayload(action, input, { toolSlug } = {}) {
  if (isHTMLElementValue(action)) {
    reportContractViolation({
      toolSlug,
      message: 'Legacy runtime contract mismatch: action payload was HTMLElement.',
      payloadType: 'html_element'
    });
    return {
      action: '',
      input: normalizeExecutionInput(input),
      isValidAction: false,
      result: safeNoopResult('unsupported_action')
    };
  }

  if (typeof action !== 'string') {
    reportContractViolation({
      toolSlug,
      message: 'Legacy runtime contract mismatch: action payload must be a string.',
      payloadType: describePayloadType(action)
    });
    return {
      action: '',
      input: normalizeExecutionInput(input),
      isValidAction: false,
      result: safeNoopResult('unsupported_action')
    };
  }

  return {
    action,
    input: normalizeExecutionInput(input),
    isValidAction: true,
    result: null
  };
}

export async function invokeExecutionToolSafely(runTool, action, input, { toolSlug } = {}) {
  const normalized = normalizeToolExecutionPayload(action, input, { toolSlug });
  if (!normalized.isValidAction) {
    return normalized.result;
  }

  try {
    return await runTool(normalized.action, normalized.input);
  } catch (error) {
    runtimeIncidentReporter.report({
      toolSlug: toolSlug ?? 'unknown-tool',
      phase: 'execute',
      errorType: 'runtime_error',
      message: error?.message ?? 'Tool execution failed.',
      stack: error?.stack,
      payloadType: 'string',
      timestamp: new Date().toISOString()
    });
    return safeNoopResult('tool_execution_failed');
  }
}
