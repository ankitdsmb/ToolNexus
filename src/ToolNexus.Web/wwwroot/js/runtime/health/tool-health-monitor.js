import { createToolPerformanceTracker } from './tool-performance-tracker.js';
import { createToolHealthReporter } from './tool-health-reporter.js';

const DEFAULT_CRASH_THRESHOLD = 3;

export function createToolHealthMonitor({
  crashThreshold = DEFAULT_CRASH_THRESHOLD,
  now = () => Date.now(),
  tracker = createToolPerformanceTracker({ now }),
  reporter = createToolHealthReporter()
} = {}) {
  const degradedTools = new Map();

  function ensureDegradedState(slug) {
    if (!degradedTools.has(slug)) {
      degradedTools.set(slug, {
        slug,
        degraded: false,
        disableAdvancedRuntimeFeatures: false,
        degradedAt: null,
        reason: null
      });
    }

    return degradedTools.get(slug);
  }

  function updateDegradedState(record) {
    const state = ensureDegradedState(record.slug);
    if (!state.degraded && record.crashCount >= crashThreshold) {
      state.degraded = true;
      state.disableAdvancedRuntimeFeatures = true;
      state.degradedAt = now();
      state.reason = 'repeated_crashes';
      reporter.reportDegraded(record.slug, {
        reason: state.reason,
        crashCount: record.crashCount,
        timestamp: state.degradedAt
      });
    }

    return { ...state };
  }

  function trackExecution(slug, run) {
    const execution = tracker.startExecution(slug);
    try {
      const result = run();
      if (result && typeof result.then === 'function') {
        return result
          .then(value => {
            const record = tracker.completeExecution(execution);
            reporter.reportHealth(record);
            updateDegradedState(record);
            return value;
          })
          .catch(error => {
            const crashed = Boolean(error?.isCrash);
            const record = tracker.completeExecution(execution, { failed: true, crashed });
            reporter.reportError(slug, error);
            reporter.reportHealth(record);
            updateDegradedState(record);
            throw error;
          });
      }

      const record = tracker.completeExecution(execution);
      reporter.reportHealth(record);
      updateDegradedState(record);
      return result;
    } catch (error) {
      const crashed = Boolean(error?.isCrash);
      const record = tracker.completeExecution(execution, { failed: true, crashed });
      reporter.reportError(slug, error);
      reporter.reportHealth(record);
      updateDegradedState(record);
      throw error;
    }
  }

  function recordError(slug, error) {
    try {
      const record = tracker.markError(slug);
      reporter.reportError(slug, error);
      reporter.reportHealth(record);
      updateDegradedState(record);
      return record;
    } catch {
      return tracker.getHealthRecord(slug);
    }
  }

  function recordCrash(slug, error) {
    try {
      const record = tracker.markCrash(slug);
      reporter.reportError(slug, error);
      reporter.reportHealth(record);
      const state = updateDegradedState(record);
      return { record, state };
    } catch {
      return { record: tracker.getHealthRecord(slug), state: ensureDegradedState(slug) };
    }
  }

  function getToolHealth(slug) {
    const record = tracker.getHealthRecord(slug);
    const degradedState = ensureDegradedState(record.slug);

    return {
      ...record,
      degraded: degradedState.degraded,
      disableAdvancedRuntimeFeatures: degradedState.disableAdvancedRuntimeFeatures,
      degradedAt: degradedState.degradedAt,
      degradedReason: degradedState.reason
    };
  }

  return {
    trackExecution,
    recordError,
    recordCrash,
    getToolHealth,
    getAllToolHealth: () => tracker.getAllHealthRecords().map(record => ({
      ...record,
      ...ensureDegradedState(record.slug)
    }))
  };
}
