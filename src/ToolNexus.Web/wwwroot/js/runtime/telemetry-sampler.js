const STRATEGIES = Object.freeze({
  AlwaysOn: 'AlwaysOn',
  ProbabilisticSampling: 'ProbabilisticSampling',
  AdaptiveSampling: 'AdaptiveSampling',
  TailSampling: 'TailSampling'
});

const ALWAYS_ON_EVENT_TYPES = new Set(['error', 'crash', 'fatal']);

function random() {
  return Math.random();
}

export function createTelemetrySampler(config = {}) {
  const probabilisticRate = Number.isFinite(config.probabilisticRate) ? config.probabilisticRate : 0.03;
  const adaptiveBaseRate = Number.isFinite(config.adaptiveBaseRate) ? config.adaptiveBaseRate : 0.01;
  const adaptiveBoostRate = Number.isFinite(config.adaptiveBoostRate) ? config.adaptiveBoostRate : 0.25;
  const anomalyThreshold = Number.isFinite(config.anomalyThresholdMs) ? config.anomalyThresholdMs : 1000;
  const tailThreshold = Number.isFinite(config.tailLatencyThresholdMs) ? config.tailLatencyThresholdMs : 1200;

  let anomalyModeUntil = 0;

  function markAnomaly() {
    anomalyModeUntil = Date.now() + 60_000;
  }

  function shouldEmitEvent(eventType, context = {}) {
    const normalizedType = String(eventType ?? '').trim().toLowerCase();
    const strategy = context.strategy ?? config.strategy ?? STRATEGIES.ProbabilisticSampling;

    if (ALWAYS_ON_EVENT_TYPES.has(normalizedType)) {
      return true;
    }

    if (strategy === STRATEGIES.AlwaysOn) {
      return true;
    }

    if (strategy === STRATEGIES.ProbabilisticSampling) {
      return random() < probabilisticRate;
    }

    if (strategy === STRATEGIES.AdaptiveSampling) {
      const latencyMs = Number(context.durationMs ?? 0);
      if (latencyMs >= anomalyThreshold || context.anomaly === true) {
        markAnomaly();
      }

      const isAnomalousPeriod = Date.now() < anomalyModeUntil;
      return random() < (isAnomalousPeriod ? adaptiveBoostRate : adaptiveBaseRate);
    }

    if (strategy === STRATEGIES.TailSampling) {
      const latencyMs = Number(context.durationMs ?? 0);
      return latencyMs >= tailThreshold;
    }

    return false;
  }

  return {
    shouldEmitEvent,
    markAnomaly,
    STRATEGIES
  };
}

const defaultSampler = createTelemetrySampler();

export function shouldEmitEvent(eventType, context = {}) {
  return defaultSampler.shouldEmitEvent(eventType, context);
}

export { STRATEGIES as TelemetrySamplingStrategies };
