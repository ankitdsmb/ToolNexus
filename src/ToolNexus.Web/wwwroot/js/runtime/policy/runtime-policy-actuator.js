const DEFAULT_THROTTLE_WINDOW_MS = 1500;

function toToolSet(value) {
  if (!value) {
    return new Set();
  }

  if (value instanceof Set) {
    return new Set([...value].map((entry) => String(entry).trim()).filter(Boolean));
  }

  if (Array.isArray(value)) {
    return new Set(value.map((entry) => String(entry).trim()).filter(Boolean));
  }

  return new Set();
}

function resolveThrottleWindow(runtimeContext = {}) {
  const configured = Number(runtimeContext.throttleWindowMs);
  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  return DEFAULT_THROTTLE_WINDOW_MS;
}

export function applyRuntimePolicy(runtimeContext = {}, signals = {}) {
  const context = runtimeContext && typeof runtimeContext === 'object' ? runtimeContext : {};
  const toolSlug = String(context.toolSlug ?? '').trim();
  const safeModeTools = toToolSet(signals.safeModeTools);
  const disabledEnhancements = toToolSet(signals.disabledEnhancements);
  const throttledTools = toToolSet(signals.throttledTools);

  const inSafeMode = toolSlug.length > 0 && safeModeTools.has(toolSlug);
  const enhancementsDisabled = toolSlug.length > 0 && disabledEnhancements.has(toolSlug);
  const executionThrottled = toolSlug.length > 0 && throttledTools.has(toolSlug);

  const now = typeof context.now === 'function' ? Number(context.now()) : Date.now();
  const lastExecutedAt = Number(context.lastExecutedAt);
  const throttleWindowMs = resolveThrottleWindow(context);
  const shouldThrottleExecution = executionThrottled
    && Number.isFinite(lastExecutedAt)
    && (now - lastExecutedAt) < throttleWindowMs;

  const policy = {
    toolSlug,
    safeModeEnabled: inSafeMode,
    disableOrchestrator: inSafeMode,
    disableDensityAutobalancer: inSafeMode,
    disableAdvancedRuntimeIntelligence: enhancementsDisabled,
    executionThrottled,
    throttleWindowMs: executionThrottled ? throttleWindowMs : 0,
    shouldThrottleExecution,
    nextAllowedExecutionAt: shouldThrottleExecution ? lastExecutedAt + throttleWindowMs : null
  };

  context.runtimePolicy = policy;
  context.disableOrchestrator = context.disableOrchestrator === true || policy.disableOrchestrator;
  context.disableDensityAutobalancer = context.disableDensityAutobalancer === true || policy.disableDensityAutobalancer;
  context.disableAdvancedRuntimeIntelligence = context.disableAdvancedRuntimeIntelligence === true || policy.disableAdvancedRuntimeIntelligence;
  context.executionThrottled = context.executionThrottled === true || policy.executionThrottled;

  if (context.root && context.root.dataset) {
    context.root.dataset.runtimePolicySafeMode = String(policy.safeModeEnabled);
    context.root.dataset.runtimePolicyEnhancementsDisabled = String(policy.disableAdvancedRuntimeIntelligence);
    context.root.dataset.runtimePolicyThrottled = String(policy.executionThrottled);
  }

  return policy;
}
