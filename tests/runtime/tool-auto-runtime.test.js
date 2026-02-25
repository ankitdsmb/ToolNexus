import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createAutoToolRuntimeModule } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-auto-runtime.js';

describe('tool auto runtime', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.ToolNexusConfig = {
      apiBaseUrl: '',
      toolExecutionPathPrefix: '/api/v1/tools',
      tool: {
        slug: 'auto-tool',
        actions: ['run'],
        clientSafeActions: ['run']
      }
    };
  });

  test('tier 1 tools auto-render with fallback JSON input', () => {
    const host = document.createElement('div');
    document.body.append(host);

    const module = createAutoToolRuntimeModule({
      slug: 'auto-tool',
      manifest: { uiMode: 'auto', complexityTier: 1, operationSchema: null }
    });

    const state = module.create(host);
    module.init(state, host, { addCleanup() {} });

    expect(host.querySelector('.tool-auto-runtime')).not.toBeNull();
    expect(host.querySelector('.tn-unified-tool-control')).not.toBeNull();
    expect(host.querySelector('[data-field="payload"]')).not.toBeNull();
  });

  test('tier 4 with auto mode shows descriptive UI error', () => {
    const host = document.createElement('div');
    document.body.append(host);

    const module = createAutoToolRuntimeModule({
      slug: 'auto-tool',
      manifest: { uiMode: 'auto', complexityTier: 4 }
    });

    module.create(host);

    expect(host.textContent).toContain('requires custom UI');
  });

  test('auto execution sends expected payload and output renders safely', async () => {
    const host = document.createElement('div');
    document.body.append(host);

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ output: '<script>alert(1)</script>' })
    }));
    global.fetch = fetchMock;

    const module = createAutoToolRuntimeModule({
      slug: 'auto-tool',
      manifest: {
        uiMode: 'auto',
        complexityTier: 2,
        operationSchema: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'text', title: 'Text value' },
            enabled: { type: 'boolean', title: 'Enabled' }
          }
        }
      }
    });

    const state = module.create(host);
    module.init(state, host, { addCleanup() {} });

    host.querySelector('#tool-auto-text').value = 'hello';
    host.querySelector('#tool-auto-enabled').checked = true;

    host.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body).input).toBe('{"text":"hello","enabled":true}');

    const output = host.querySelector('.tn-unified-tool-control__result');
    expect(output.textContent).toContain('<script>alert(1)</script>');
    expect(output.innerHTML).not.toContain('<script>');
    expect(host.querySelector('.tn-unified-tool-control__preview').textContent).toContain('<script>alert(1)</script>');
  });
});
