import { jest } from '@jest/globals';
import { createAutoToolRuntimeModule } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-auto-runtime.js';

describe('auto runtime predictive suggestions', () => {
  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
    delete window.ToolNexus;
    delete window.ToolNexusConfig;
  });

  function createManifest() {
    return {
      uiMode: 'auto',
      complexityTier: 2,
      operationSchema: {
        type: 'object',
        properties: {
          payload: {
            type: 'json',
            title: 'Payload'
          }
        }
      }
    };
  }

  test('renders suggestion badge when JSON context is detected', async () => {
    const root = document.createElement('div');
    const module = createAutoToolRuntimeModule({ manifest: createManifest(), slug: 'json-to-xml' });
    const telemetry = [];

    module.useAutoInputs(root, {
      adapters: {
        emitTelemetry: (eventName, payload) => telemetry.push({ eventName, payload })
      },
      addCleanup: () => {}
    });

    const input = root.querySelector('[data-field="payload"]');
    const badge = root.querySelector('.tn-unified-tool-control__suggestion-badge');

    expect(badge.hidden).toBe(true);

    input.value = '{"x":1}';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 180));

    expect(badge.hidden).toBe(false);
    expect(badge.dataset.toolId).toBe('json-formatter');
    expect(telemetry.some((entry) => entry.eventName === 'suggestion_shown')).toBe(true);
  });

  test('clicking suggestion invokes runtime tool inline', async () => {
    const invokeTool = jest.fn(async () => ({ mountId: 'inline-1' }));
    window.ToolNexus = { runtime: { invokeTool } };

    const root = document.createElement('div');
    const module = createAutoToolRuntimeModule({ manifest: createManifest(), slug: 'json-to-xml' });
    const telemetry = [];

    module.useAutoInputs(root, {
      adapters: {
        emitTelemetry: (eventName, payload) => telemetry.push({ eventName, payload })
      },
      addCleanup: () => {}
    });

    const input = root.querySelector('[data-field="payload"]');
    const badge = root.querySelector('.tn-unified-tool-control__suggestion-badge');

    input.value = '{"x":2}';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 180));

    badge.click();
    await Promise.resolve();

    expect(invokeTool).toHaveBeenCalledWith('json-formatter', expect.objectContaining({ mountMode: 'inline' }));
    expect(telemetry.some((entry) => entry.eventName === 'suggestion_accepted')).toBe(true);
  });
});
