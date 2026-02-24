import { jest } from '@jest/globals';
import { createRuntimeLogger } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/runtime-logger.js';

describe('runtime logger endpoint routing contract', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    window.ToolNexus = {};
    window.ToolNexusConfig = {
      tool: { slug: 'json-formatter' },
      runtimeRoutes: { clientLogEndpoints: ['/api/admin/runtime/incidents/logs'] }
    };
    window.ToolNexusLogging = { enableRuntimeLogCapture: true, minimumLevel: 'info', runtimeDebugEnabled: false };
  });

  test('sends logs when endpoint matches routable contract list', async () => {
    const transport = jest.fn().mockResolvedValue({ ok: true });
    const logger = createRuntimeLogger({ endpoint: '/api/admin/runtime/incidents/logs', transport });

    logger.warn('contract-ok');
    await Promise.resolve();

    expect(transport).toHaveBeenCalledTimes(1);
  });

  test('does not send logs when endpoint drifts from configured routable list', async () => {
    const transport = jest.fn().mockResolvedValue({ ok: true });
    const logger = createRuntimeLogger({ endpoint: '/api/admin/runtime/logs', transport });

    logger.warn('contract-mismatch');
    await Promise.resolve();

    expect(transport).not.toHaveBeenCalled();
  });
});
