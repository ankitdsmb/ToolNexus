import { emitRuntimeEvent } from '../telemetry/runtime-event-logger.js';
import { TR_RUNTIME_ERROR, TR_RUNTIME_HEALTH_UPDATE, TR_RUNTIME_TOOL_DEGRADED } from '../telemetry/runtime-event-types.js';

export function createToolHealthReporter({ emitEvent = emitRuntimeEvent, telemetrySink = null } = {}) {
  function publish(eventId, payload) {
    try {
      emitEvent(eventId, payload);
      if (typeof telemetrySink === 'function') {
        telemetrySink(eventId, payload);
      }
    } catch {
      // health reporting must never block runtime execution
    }
  }

  function reportHealth(record) {
    publish(TR_RUNTIME_HEALTH_UPDATE, {
      slug: record.slug,
      executionTime: record.executionTime,
      avgExecutionTime: record.avgExecutionTime,
      errorCount: record.errorCount,
      crashCount: record.crashCount,
      memoryUsage: record.memoryUsage,
      lastExecution: record.lastExecution
    });
  }

  function reportError(slug, error) {
    publish(TR_RUNTIME_ERROR, {
      slug,
      reason: 'tool_error',
      message: error?.message ?? String(error ?? 'runtime-error')
    });
  }

  function reportDegraded(slug, metadata = {}) {
    publish(TR_RUNTIME_TOOL_DEGRADED, {
      slug,
      reason: metadata.reason ?? 'repeated_crashes',
      crashCount: metadata.crashCount ?? 0,
      disableAdvancedRuntimeFeatures: true,
      timestamp: metadata.timestamp ?? Date.now()
    });
  }

  return {
    reportHealth,
    reportError,
    reportDegraded
  };
}
