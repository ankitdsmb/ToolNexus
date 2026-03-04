import { createTelemetrySampler } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/telemetry-sampler.js';

describe('telemetry sampler', () => {
  test('always emits error events', () => {
    const sampler = createTelemetrySampler({ probabilisticRate: 0 });
    expect(sampler.shouldEmitEvent('error')).toBe(true);
  });

  test('tail sampling emits for slow requests', () => {
    const sampler = createTelemetrySampler({ tailLatencyThresholdMs: 100 });
    expect(sampler.shouldEmitEvent('success', { strategy: 'TailSampling', durationMs: 101 })).toBe(true);
    expect(sampler.shouldEmitEvent('success', { strategy: 'TailSampling', durationMs: 99 })).toBe(false);
  });
});
