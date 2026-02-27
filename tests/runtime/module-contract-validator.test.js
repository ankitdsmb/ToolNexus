import { afterEach, describe, expect, test, vi } from 'vitest';
import { createToolRuntime } from '../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';
import { validateModuleContract } from '../../src/ToolNexus.Web/wwwroot/js/runtime/module-contract-validator.js';
import { getToolPlatformKernel, normalizeToolRoot } from '../../src/ToolNexus.Web/wwwroot/js/tools/tool-platform-kernel.js';

describe('module contract validator', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    delete window.ToolNexusConfig;
    delete window.ToolNexusLogging;
  });

  function setShell(slug = 'contract-tool') {
    document.body.innerHTML = `
      <div data-runtime-container="true">
        <div id="tool-root" data-tool-root="true" data-tool-slug="${slug}">
          <header data-tool-header="true"></header>
          <section data-tool-body="true">
            <section data-tool-input="true"></section>
            <section data-tool-output="true"></section>
            <div data-tool-actions="true"></div>
          </section>
        </div>
      </div>`;
  }

  test('valid module passes validation', () => {
    expect(() => validateModuleContract({ create: () => {}, init: () => {} }, ['create', 'init'], 'valid-tool')).not.toThrow();
  });

  test('missing export throws contract error', () => {
    expect(() => validateModuleContract({ create: () => {} }, ['create', 'init'], 'invalid-tool'))
      .toThrow('[ModuleContract] invalid-tool missing exports: init');
  });

  test('alias export works for kernel contract', () => {
    expect(typeof normalizeToolRoot).toBe('function');
    expect(typeof getToolPlatformKernel).toBe('function');
    expect(() => validateModuleContract(
      { normalizeToolRoot, getToolPlatformKernel },
      ['normalizeToolRoot', 'getToolPlatformKernel'],
      'tool-platform-kernel'
    )).not.toThrow();
  });

  test('runtime reports module_contract_error classification for contract failures', async () => {
    setShell('contract-fail-tool');
    window.ToolNexusConfig = {
      tool: {},
      runtimeUiMode: 'custom',
      runtimeComplexityTier: 1,
      runtimeEnvironment: 'Production'
    };

    const observerEmit = vi.fn();
    const runtime = createToolRuntime({
      observer: { emit: observerEmit },
      loadManifest: async () => ({
        slug: 'contract-fail-tool',
        modulePath: '/js/tools/contract-fail-tool.js',
        uiMode: 'custom',
        complexityTier: 1,
        dependencies: []
      }),
      templateLoader: async () => {},
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => ({
        create: () => ({})
      })
    });

    await runtime.bootstrapToolRuntime();

    const root = document.getElementById('tool-root');
    expect(root.dataset.runtimeIdentitySource).toBe('module-contract-invalid');

    expect(observerEmit).toHaveBeenCalledWith('module_import_failure', expect.objectContaining({
      toolSlug: 'contract-fail-tool',
      metadata: expect.objectContaining({
        classification: 'module_contract_error'
      })
    }));
  });
});
