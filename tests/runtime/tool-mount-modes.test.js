import { afterEach, describe, expect, test, vi } from 'vitest';
import { createToolContainerManager } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-container-manager.js';
import { createToolRuntime } from '../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';

describe('tool mount modes foundation', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    delete window.ToolNexus;
    delete window.ToolNexusConfig;
    delete window.ToolNexusLogging;
  });

  function setShell(slug = 'demo-tool') {
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

  test('fullscreen mount works through invokeTool without changing route root behavior', async () => {
    setShell('demo-tool');
    window.ToolNexusConfig = { tool: { operationSchema: null }, runtimeUiMode: 'auto', runtimeComplexityTier: 1 };

    const runtime = createToolRuntime({
      loadManifest: async (slug) => ({ slug, uiMode: 'auto', complexityTier: 1, dependencies: [] }),
      templateLoader: async () => {},
      dependencyLoader: { loadDependencies: async () => {} }
    });

    await runtime.bootstrapToolRuntime();
    const mount = await window.ToolNexus.runtime.invokeTool('demo-tool', { initialInput: 'seed input' });

    expect(mount.mountMode).toBe('fullscreen');
    expect(mount.root.id).toBe('tool-root');
    expect(document.querySelectorAll('.tool-container').length).toBe(0);
    expect(document.getElementById('tool-root').dataset.mountMode).toBe('fullscreen');
  });

  test('inline mount works and unmount cleanup removes mounted container safely', async () => {
    setShell('demo-tool');
    window.ToolNexusConfig = { tool: { operationSchema: null }, runtimeUiMode: 'auto', runtimeComplexityTier: 1 };

    const runtime = createToolRuntime({
      loadManifest: async (slug) => ({ slug, uiMode: 'auto', complexityTier: 1, dependencies: [] }),
      templateLoader: async () => {},
      dependencyLoader: { loadDependencies: async () => {} }
    });

    await runtime.bootstrapToolRuntime();
    const host = document.createElement('div');
    document.body.append(host);

    const mount = await window.ToolNexus.runtime.invokeTool('demo-tool', {
      mountMode: 'inline',
      host,
      contextMetadata: { source: 'test' }
    });

    expect(mount.mountMode).toBe('inline');
    expect(host.querySelector('.tool-container--inline')).not.toBeNull();
    expect(window.ToolNexus.runtime.getActiveMounts()).toHaveLength(1);

    const removed = await mount.unmount();
    expect(removed).toBe(true);
    expect(host.querySelector('.tool-container--inline')).toBeNull();
    expect(window.ToolNexus.runtime.getActiveMounts()).toHaveLength(0);
  });

  test('container manager supports listener cleanup and multiple concurrent mounts', async () => {
    const manager = createToolContainerManager({ doc: document });
    const host = document.createElement('div');
    document.body.append(host);

    const first = manager.mount({ host, toolId: 't1', mountMode: 'inline' });
    const second = manager.mount({ host, toolId: 't2', mountMode: 'panel' });

    expect(manager.getActiveMounts()).toHaveLength(2);

    const listener = vi.fn();
    manager.addListener(first.mountId, window, 'toolnexus:test-event', listener);
    window.dispatchEvent(new Event('toolnexus:test-event'));
    expect(listener).toHaveBeenCalledTimes(1);

    await manager.unmount(first.mountId);
    window.dispatchEvent(new Event('toolnexus:test-event'));
    expect(listener).toHaveBeenCalledTimes(1);

    await manager.cleanupAll();
    expect(manager.getActiveMounts()).toHaveLength(0);
    expect(host.children.length).toBe(0);
    expect(second.container.isConnected).toBe(false);
  });
});
