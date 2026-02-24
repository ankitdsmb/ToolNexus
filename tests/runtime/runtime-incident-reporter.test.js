import { describe, expect, test, vi } from 'vitest';
import { createRuntimeIncidentReporter, normalizeIncidentPayload } from '../../src/ToolNexus.Web/wwwroot/js/runtime/runtime-incident-reporter.js';

describe('runtime incident reporter', () => {
  test('degrades safely when fetch is unavailable', async () => {
    const originalFetch = globalThis.fetch;
    vi.stubGlobal('fetch', undefined);

    const reporter = createRuntimeIncidentReporter({
      sendBatch: undefined,
      sendRuntimeLog: undefined,
      debounceMs: 1
    });

    reporter.report({
      toolSlug: 'json-formatter',
      phase: 'mount',
      errorType: 'runtime_error',
      message: 'fetch unavailable path'
    });

    await reporter.flush();

    expect(reporter.getPendingCount()).toBe(0);

    if (typeof originalFetch === 'function') {
      vi.stubGlobal('fetch', originalFetch);
    } else {
      vi.unstubAllGlobals();
    }
  });

  test('normalizes incident payload to API ingest contract', () => {
    const payload = normalizeIncidentPayload({
      toolSlug: 'json-formatter',
      phase: 'execute',
      errorType: 'runtime_error',
      message: 'runtime failure',
      payloadType: 'json',
      stack: undefined,
      timestamp: '2026-01-01T12:00:00.000Z',
      count: 3,
      fingerprint: 'fingerprint-1'
    });

    expect(payload).toEqual({
      toolSlug: 'json-formatter',
      phase: 'execute',
      errorType: 'runtime_error',
      message: 'runtime failure',
      severity: 'critical',
      stack: null,
      payloadType: 'json',
      timestamp: '2026-01-01T12:00:00.000Z',
      count: 3,
      fingerprint: 'fingerprint-1',
      correlationId: null,
      metadata: null
    });
  });

  test('posts runtime log payload as ClientIncidentLogBatch contract', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchSpy);

    window.ToolNexusConfig = {
      runtimeRoutes: {
        clientLogEndpoints: ['/api/admin/runtime/incidents/logs']
      }
    };

    const reporter = createRuntimeIncidentReporter({
      runtimeLogEndpoint: '/api/admin/runtime/incidents/logs',
      debounceMs: 50,
      sendBatch: vi.fn().mockResolvedValue(undefined)
    });

    reporter.report({
      toolSlug: 'json-formatter',
      message: 'runtime failure',
      phase: 'execute',
      errorType: 'runtime_error'
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [endpoint, options] = fetchSpy.mock.calls[0];
    expect(endpoint).toBe('/api/admin/runtime/incidents/logs');

    const body = JSON.parse(options.body);
    expect(body.logs).toHaveLength(1);
    expect(body.logs[0]).toMatchObject({
      source: 'runtime.incident-reporter',
      level: 'error',
      message: 'runtime failure',
      toolSlug: 'json-formatter'
    });
    expect(body.logs[0].metadata).toMatchObject({
      phase: 'execute',
      errorType: 'runtime_error',
      payloadType: 'unknown',
      count: 1
    });
  });
});
