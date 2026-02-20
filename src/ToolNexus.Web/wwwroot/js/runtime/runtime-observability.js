import { classifyRuntimeError } from './error-classification-engine.js';

const DEFAULT_MAX_ENTRIES = 200;
const DEFAULT_TREND_SAMPLES = 40;

function average(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function createRuntimeObservability({ now = () => Date.now(), maxEntries = DEFAULT_MAX_ENTRIES, trendSamples = DEFAULT_TREND_SAMPLES } = {}) {
  const telemetry = [];
  const mountsByTool = new Map();
  const failureCountByTool = new Map();
  const fallbackCountByTool = new Map();
  const legacyBridgeByTool = new Map();
  const retryCountByTool = new Map();
  const dependencyCostByTool = new Map();
  const bootCostByTool = new Map();

  const metrics = {
    totalToolsExecuted: 0,
    successfulExecutions: 0,
    fallbackExecutions: 0,
    compatibilityModeCount: 0,
    initRetries: 0,
    lifecycleFailures: 0,
    dependencyLoadFailures: 0,
    toolMountSuccess: 0,
    averageMountDurationMs: 0,
    averageInitializationTimeMs: 0,
    averageDependencyLoadMs: 0,
    runtimeBootAverageMs: 0
  };

  const mountDurations = [];
  const initDurations = [];
  const dependencyDurations = [];
  const bootDurations = [];

  const selfHealing = {
    safeModeTools: new Set(),
    disabledEnhancements: new Set(),
    throttledTools: new Set()
  };

  function pushLimited(collection, value, limit = trendSamples) {
    collection.push(value);
    if (collection.length > limit) {
      collection.shift();
    }
  }

  function count(map, key, increment = 1) {
    map.set(key, (map.get(key) ?? 0) + increment);
  }

  function store(entry) {
    telemetry.push(entry);
    if (telemetry.length > maxEntries) {
      telemetry.shift();
    }
  }

  function updateRates() {
    const total = metrics.totalToolsExecuted || 0;
    const successRate = total > 0 ? metrics.successfulExecutions / total : 0;
    const fallbackRate = total > 0 ? metrics.fallbackExecutions / total : 0;
    return { totalToolsExecuted: total, successRate, fallbackRate };
  }

  function record(eventName, payload = {}) {
    const entry = {
      eventName,
      timestamp: now(),
      toolSlug: payload.toolSlug ?? null,
      modeUsed: payload.modeUsed ?? null,
      mountStatus: payload.mountStatus ?? null,
      durationMs: payload.duration,
      errorCategory: payload.errorCategory ?? null,
      metadata: payload.metadata ?? {}
    };

    store(entry);

    const slug = entry.toolSlug;
    if (eventName === 'bootstrap_start') {
      metrics.totalToolsExecuted += 1;
    }

    if (eventName === 'mount_success') {
      metrics.successfulExecutions += 1;
      metrics.toolMountSuccess += 1;
      if (typeof entry.durationMs === 'number') {
        pushLimited(mountDurations, entry.durationMs);
        metrics.averageMountDurationMs = average(mountDurations);
      }
      if (slug) {
        mountsByTool.set(slug, {
          toolSlug: slug,
          mountStatus: 'success',
          modeUsed: payload.modeUsed ?? 'modern',
          timingData: {
            mountDurationMs: entry.durationMs ?? null,
            initializationDurationMs: payload.initializationDurationMs ?? null,
            dependencyLoadMs: payload.dependencyLoadMs ?? null
          },
          errorCategory: null
        });
      }
    }

    if (eventName === 'mount_failure' || eventName === 'tool_unrecoverable_failure') {
      metrics.lifecycleFailures += 1;
      if (slug) {
        count(failureCountByTool, slug);
        const category = payload.errorCategory ?? classifyRuntimeError({ stage: payload.stage ?? 'mount', message: payload.error, eventName });
        mountsByTool.set(slug, {
          toolSlug: slug,
          mountStatus: 'failed',
          modeUsed: payload.modeUsed ?? 'fallback',
          timingData: {
            mountDurationMs: entry.durationMs ?? null,
            initializationDurationMs: payload.initializationDurationMs ?? null,
            dependencyLoadMs: payload.dependencyLoadMs ?? null
          },
          errorCategory: category
        });
      }
    }

    if (eventName === 'mount_fallback_content') {
      metrics.fallbackExecutions += 1;
      if (slug) {
        count(fallbackCountByTool, slug);
      }
    }

    if (eventName === 'compatibility_mode_used') {
      metrics.compatibilityModeCount += 1;
      if (slug) {
        count(legacyBridgeByTool, slug);
      }
    }

    if (eventName === 'init_retry') {
      metrics.initRetries += 1;
      if (slug) {
        count(retryCountByTool, slug);
      }
    }

    if (eventName === 'dependency_failure') {
      metrics.dependencyLoadFailures += 1;
    }

    if (eventName === 'dependency_complete' && typeof entry.durationMs === 'number') {
      pushLimited(dependencyDurations, entry.durationMs);
      metrics.averageDependencyLoadMs = average(dependencyDurations);
      if (slug) {
        pushLimited(dependencyCostByTool.get(slug) ?? dependencyCostByTool.set(slug, []).get(slug), entry.durationMs);
      }
    }

    if (eventName === 'bootstrap_complete' && typeof entry.durationMs === 'number') {
      pushLimited(initDurations, entry.durationMs);
      pushLimited(bootDurations, entry.durationMs);
      metrics.averageInitializationTimeMs = average(initDurations);
      metrics.runtimeBootAverageMs = average(bootDurations);
      if (slug) {
        pushLimited(bootCostByTool.get(slug) ?? bootCostByTool.set(slug, []).get(slug), entry.durationMs);
      }
    }
  }

  function evaluateUxSignals() {
    const regressions = [];

    for (const [toolSlug, countValue] of fallbackCountByTool.entries()) {
      if (countValue >= 2) {
        regressions.push({ toolSlug, signal: 'repeated_fallback_usage', severity: 'high' });
      }
    }

    for (const [toolSlug, countValue] of retryCountByTool.entries()) {
      if (countValue >= 3) {
        regressions.push({ toolSlug, signal: 'excessive_init_retries', severity: 'medium' });
        selfHealing.throttledTools.add(toolSlug);
      }
    }

    for (const [toolSlug, latest] of mountsByTool.entries()) {
      const mountMs = latest?.timingData?.mountDurationMs ?? 0;
      if (mountMs >= 1200) {
        regressions.push({ toolSlug, signal: 'slow_mount_times', severity: 'medium' });
      }
      if (latest.mountStatus === 'failed') {
        selfHealing.safeModeTools.add(toolSlug);
        selfHealing.disabledEnhancements.add(toolSlug);
        regressions.push({ toolSlug, signal: 'unstable_layout_signals', severity: 'high' });
      }
    }

    return regressions;
  }

  function getMigrationInsights() {
    const legacyBridgeRequiredTools = [...legacyBridgeByTool.entries()]
      .filter(([, countValue]) => countValue > 0)
      .map(([toolSlug, countValue]) => ({ toolSlug, count: countValue }));

    const frequentlyFailingTools = [...failureCountByTool.entries()]
      .filter(([, countValue]) => countValue > 0)
      .map(([toolSlug, countValue]) => ({ toolSlug, count: countValue }))
      .sort((a, b) => b.count - a.count);

    const lifecycleMigrationCandidates = frequentlyFailingTools
      .filter((entry) => (legacyBridgeByTool.get(entry.toolSlug) ?? 0) > 0)
      .map((entry) => ({
        toolSlug: entry.toolSlug,
        reason: 'legacy_bridge_and_failures_detected',
        failures: entry.count,
        legacyBridgeUses: legacyBridgeByTool.get(entry.toolSlug) ?? 0
      }));

    return {
      legacyBridgeRequiredTools,
      frequentlyFailingTools,
      lifecycleMigrationCandidates
    };
  }

  function getImprovementRecommendations() {
    return evaluateUxSignals().map((signal) => ({
      toolSlug: signal.toolSlug,
      signal: signal.signal,
      severity: signal.severity,
      recommendation: signal.signal === 'repeated_fallback_usage'
        ? 'Prioritize runtime contract migration and remove fallback dependency.'
        : signal.signal === 'slow_mount_times'
          ? 'Optimize mount path and defer non-critical dependencies.'
          : signal.signal === 'excessive_init_retries'
            ? 'Stabilize initialization flow and reduce retry loop frequency.'
            : 'Audit layout and lifecycle compatibility for regression resistance.'
    }));
  }

  function getDashboardContract() {
    return [...mountsByTool.values()];
  }

  function getSnapshot() {
    return {
      metrics: {
        ...metrics,
        ...updateRates()
      },
      trends: {
        mountDurationMs: [...mountDurations],
        dependencyLoadMs: [...dependencyDurations],
        runtimeBootDurationMs: [...bootDurations]
      },
      uxSignals: evaluateUxSignals(),
      migrationInsights: getMigrationInsights(),
      continuousImprovement: {
        recommendations: getImprovementRecommendations()
      },
      selfHealing: {
        safeModeTools: [...selfHealing.safeModeTools],
        disabledEnhancements: [...selfHealing.disabledEnhancements],
        throttledTools: [...selfHealing.throttledTools]
      },
      dashboardContract: getDashboardContract(),
      recentTelemetry: [...telemetry]
    };
  }

  return {
    record,
    getSnapshot,
    getDashboardContract,
    getMigrationInsights,
    getImprovementRecommendations
  };
}
