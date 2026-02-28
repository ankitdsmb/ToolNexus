import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createAutoToolRuntimeModule } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-auto-runtime.js';

function createContractHost() {
  const host = document.createElement('div');
  host.innerHTML = `
    <section data-tool-shell="true">
      <header data-tool-context="true"></header>
      <section data-tool-input="true"></section>
      <section data-tool-status="true"></section>
      <section data-tool-output="true"></section>
      <footer data-tool-followup="true"></footer>
    </section>`;
  return host;
}

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


  test('auto runtime mounts only inside [data-tool-shell] and preserves canonical shell', () => {
    const host = document.createElement('div');
    host.innerHTML = `
      <section data-tool-shell="true">
        <header data-tool-context="true"></header>
        <section data-tool-input="true"><p data-preexisting>existing</p></section>
        <section data-tool-status="true"></section>
        <section data-tool-output="true"></section>
        <footer data-tool-followup="true"></footer>
      </section>`;
    document.body.append(host);
    const runtimeContainer = host.querySelector('[data-tool-shell]');

    const module = createAutoToolRuntimeModule({
      slug: 'auto-tool',
      manifest: { uiMode: 'auto', complexityTier: 1, operationSchema: null }
    });

    const state = module.create(host);
    module.init(state, host, { addCleanup() {} });

    expect(host.querySelector('[data-tool-shell]')).toBe(runtimeContainer);
    expect(host.querySelector('[data-preexisting]')).toBeNull();
    expect(host.querySelector('[data-tool-shell].tn-unified-tool-control')).not.toBeNull();
  });

  test('uses canonical shell contract without throwing', () => {
    const host = document.createElement('div');
    host.innerHTML = `
      <section data-tool-shell="true">
        <header data-tool-context="true"></header>
        <section data-tool-input="true"></section>
        <section data-tool-status="true"></section>
        <section data-tool-output="true"></section>
        <footer data-tool-followup="true"></footer>
      </section>`;

    const module = createAutoToolRuntimeModule({
      slug: 'auto-tool',
      manifest: { uiMode: 'auto', complexityTier: 1, operationSchema: null }
    });

    expect(() => module.useAutoInputs(host, { addCleanup() {} })).not.toThrow();
  });

  test('tier 1 tools auto-render with fallback JSON input', () => {
    const host = createContractHost();
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



  test('tier 3 with auto mode is supported without configuration error', () => {
    const host = createContractHost();
    document.body.append(host);

    const module = createAutoToolRuntimeModule({
      slug: 'auto-tool',
      manifest: { uiMode: 'auto', complexityTier: 3, operationSchema: null }
    });

    const state = module.create(host);
    module.init(state, host, { addCleanup() {} });

    expect(host.querySelector('.tool-auto-runtime')).not.toBeNull();
    expect(host.textContent).not.toContain('requires custom UI');
  });

  test('tier 4 with auto mode shows descriptive UI error', () => {
    const host = createContractHost();
    document.body.append(host);

    const module = createAutoToolRuntimeModule({
      slug: 'auto-tool',
      manifest: { uiMode: 'auto', complexityTier: 4 }
    });

    module.create(host);

    expect(host.textContent).toContain('requires custom UI');
  });



  test('forbidden execution override fields are ignored while request remains server-controlled', async () => {
    const host = createContractHost();
    document.body.append(host);

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true })
    }));
    global.fetch = fetchMock;

    const module = createAutoToolRuntimeModule({
      slug: 'auto-tool',
      manifest: {
        uiMode: 'auto',
        complexityTier: 2,
        runtimeIsDevelopment: true,
        operationSchema: {
          type: 'object',
          properties: {
            executionAuthority: { type: 'text', title: 'Execution authority' },
            runtimeAdapter: { type: 'text', title: 'Runtime adapter' },
            capabilityClass: { type: 'text', title: 'Capability class' },
            inputText: { type: 'text', title: 'Input text' }
          }
        }
      }
    });

    const state = module.create(host);
    const telemetry = [];
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    module.init(state, host, {
      adapters: {
        emitTelemetry: (eventName, payload) => telemetry.push({ eventName, payload })
      },
      addCleanup() {}
    });

    host.querySelector('#tool-auto-executionAuthority').value = 'client-override';
    host.querySelector('#tool-auto-runtimeAdapter').value = 'unsafe-adapter';
    host.querySelector('#tool-auto-capabilityClass').value = 'admin';
    host.querySelector('#tool-auto-inputText').value = 'safe';

    host.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const [, request] = fetchMock.mock.calls[0];
    const parsedBody = JSON.parse(request.body);
    expect(JSON.parse(parsedBody.input)).toEqual({ inputText: 'safe' });

    expect(warnSpy).toHaveBeenCalledWith(
      '[ExecutionBoundary] Ignored client-owned execution fields.',
      expect.objectContaining({
        slug: 'auto-tool',
        ignoredFields: expect.arrayContaining(['executionAuthority', 'runtimeAdapter', 'capabilityClass'])
      })
    );

    expect(telemetry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventName: 'runtime_execution_boundary_checked',
          payload: expect.objectContaining({
            runtime: expect.objectContaining({ executionBoundaryRespected: true })
          })
        })
      ])
    );

    warnSpy.mockRestore();
  });


  test('repeated warning detection updates adaptive guidance wording', async () => {
    const host = createContractHost();
    document.body.append(host);

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ output: 'ok', warnings: ['runtime-note'], diagnostics: { id: 'd1' }, metadata: { run: '1' } })
    }));
    global.fetch = fetchMock;

    const module = createAutoToolRuntimeModule({
      slug: 'auto-tool',
      manifest: {
        uiMode: 'auto',
        complexityTier: 2,
        runtimeIsDevelopment: true,
        operationSchema: {
          type: 'object',
          properties: {
            executionAuthority: { type: 'text', title: 'Execution authority' },
            text: { type: 'text', title: 'Text value' }
          }
        }
      }
    });

    const state = module.create(host);
    module.init(state, host, { addCleanup() {} });

    const authorityInput = host.querySelector('#tool-auto-executionAuthority');
    const textInput = host.querySelector('#tool-auto-text');
    const runButton = host.querySelector('button');

    authorityInput.value = 'client-override';
    textInput.value = 'hello';

    runButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    runButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(host.querySelector('[data-ai-layer="next-action"]').textContent).toContain('Warning repeated across runs');
    expect(host.textContent).toContain('recurring warning pattern');
  });

  test('auto execution sends expected payload and output renders safely', async () => {
    const host = createContractHost();
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
