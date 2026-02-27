function isDevelopmentMode() {
  return Boolean(import.meta?.env?.DEV || window.ToolNexusLogging?.runtimeDebugEnabled === true);
}

function looksLikeMountPayload(value) {
  if (!value) {
    return false;
  }

  if (value instanceof Element) {
    return true;
  }

  if (typeof value !== 'object') {
    return false;
  }

  return [
    value.root,
    value.toolRoot,
    value.executionContext,
    value.context,
    value.host,
    value.element
  ].some((candidate) => candidate instanceof Element || Boolean(candidate?.root instanceof Element));
}

export function assertRunToolExecutionOnly(toolId, ...args) {
  if (!isDevelopmentMode()) {
    return;
  }

  if (!args.some(looksLikeMountPayload)) {
    return;
  }

  throw new Error(`[${toolId}] runTool cannot be called during mount lifecycle.`);
}

