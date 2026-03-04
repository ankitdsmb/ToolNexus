import { describe, expect, test, vi } from 'vitest';
import { createToolHealthMonitor } from '../../src/ToolNexus.Web/wwwroot/js/runtime/health/tool-health-monitor.js';
import { createToolHealthReporter } from '../../src/ToolNexus.Web/wwwroot/js/runtime/health/tool-health-reporter.js';
import { createToolPerformanceTracker } from '../../src/ToolNexus.Web/wwwroot/js/runtime/health/tool-performance-tracker.js';
import { TR_RUNTIME_HEALTH_UPDATE, TR_RUNTIME_TOOL_DEGRADED } from '../../src/ToolNexus.Web/wwwroot/js/runtime/telemetry/runtime-event-types.js';

describe('tool health monitor', () => {
  test('tracks execution metrics and exposes health record shape', () => {
    let tick = 100;
    const now = () => (tick += 20);
    const monitor = createToolHealthMonitor({ now });

    monitor.trackExecution('json-formatter', () => 'ok');

    const health = monitor.getToolHealth('json-formatter');
    expect(health).toMatchObject({
      slug: 'json-formatter',
      executionTime: 20,
      avgExecutionTime: 20,
      errorCount: 0,
      crashCount: 0
    });
    expect(typeof health.lastExecution).toBe('number');
  });

  test('marks tool degraded and disables advanced features when crashes repeat', () => {
    const telemetrySink = vi.fn();
    const reporter = createToolHealthReporter({
      emitEvent: vi.fn(),
      telemetrySink
    });

    const monitor = createToolHealthMonitor({
      crashThreshold: 2,
      reporter
    });

    monitor.recordCrash('json-formatter', new Error('crash-1'));
    monitor.recordCrash('json-formatter', new Error('crash-2'));

    const health = monitor.getToolHealth('json-formatter');
    expect(health.degraded).toBe(true);
    expect(health.disableAdvancedRuntimeFeatures).toBe(true);

    expect(telemetrySink).toHaveBeenCalledWith(
      TR_RUNTIME_TOOL_DEGRADED,
      expect.objectContaining({
        slug: 'json-formatter',
        reason: 'repeated_crashes',
        disableAdvancedRuntimeFeatures: true,
        crashCount: 2
      })
    );
  });

  test('never blocks tool execution when telemetry pipeline throws', () => {
    const tracker = createToolPerformanceTracker();
    const reporter = createToolHealthReporter({
      emitEvent: () => {
        throw new Error('telemetry-down');
      }
    });

    const monitor = createToolHealthMonitor({ tracker, reporter });

    expect(() => {
      monitor.trackExecution('json-formatter', () => 'safe');
    }).not.toThrow();

    const health = monitor.getToolHealth('json-formatter');
    expect(health.executionCount).toBe(1);
  });

  test('emits health update telemetry after execution', () => {
    const emitEvent = vi.fn();
    const monitor = createToolHealthMonitor({
      reporter: createToolHealthReporter({ emitEvent })
    });

    monitor.trackExecution('json-formatter', () => 'ok');

    expect(emitEvent).toHaveBeenCalledWith(
      TR_RUNTIME_HEALTH_UPDATE,
      expect.objectContaining({
        slug: 'json-formatter',
        errorCount: 0,
        crashCount: 0
      })
    );
  });
});
