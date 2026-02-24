import { describe, expect, test, vi } from 'vitest';
import { createRuntimeIncidentReporter } from '../../src/ToolNexus.Web/wwwroot/js/runtime/runtime-incident-reporter.js';

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
});
