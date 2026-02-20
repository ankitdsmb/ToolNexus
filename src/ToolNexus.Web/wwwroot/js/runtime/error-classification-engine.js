const CATEGORY = {
  DOM_CONTRACT_ISSUE: 'dom_contract_issue',
  LIFECYCLE_ERROR: 'lifecycle_error',
  DEPENDENCY_FAILURE: 'dependency_failure',
  MANIFEST_MISSING: 'manifest_missing',
  UNKNOWN_RUNTIME_EXCEPTION: 'unknown_runtime_exception'
};

function hasText(value, token) {
  return typeof value === 'string' && value.toLowerCase().includes(token);
}

export function classifyRuntimeError({ stage, message, eventName } = {}) {
  const normalizedStage = (stage ?? '').toLowerCase();
  const normalizedEvent = (eventName ?? '').toLowerCase();
  const normalizedMessage = message ?? '';

  if (normalizedStage === 'manifest' || normalizedEvent.includes('manifest_failure')) {
    return CATEGORY.MANIFEST_MISSING;
  }

  if (normalizedStage === 'dependency' || normalizedEvent.includes('dependency_failure')) {
    return CATEGORY.DEPENDENCY_FAILURE;
  }

  if (normalizedStage.includes('dom') || normalizedEvent.includes('dom_contract_failure') || hasText(normalizedMessage, 'dom contract')) {
    return CATEGORY.DOM_CONTRACT_ISSUE;
  }

  if (normalizedStage.includes('module') || normalizedStage.includes('lifecycle') || normalizedStage === 'mount' || normalizedEvent.includes('mount_failure') || normalizedEvent.includes('module_import_failure')) {
    return CATEGORY.LIFECYCLE_ERROR;
  }

  return CATEGORY.UNKNOWN_RUNTIME_EXCEPTION;
}

export function runtimeErrorCategories() {
  return { ...CATEGORY };
}
