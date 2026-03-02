import { afterEach, describe, expect, test, vi } from 'vitest';
import { createToolContainerManager } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-container-manager.js';
import { createToolRuntime } from '../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';
import { createCanonicalToolShellMarkup } from './helpers/createCanonicalToolShell.js';

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
        ${createCanonicalToolShellMarkup({ shellAttributes: `id="tool-root" data-tool-root="true" data-tool-slug="${slug}"` })}
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

    await expect(window.ToolNexus.runtime.invokeTool('demo-tool', {
      mountMode: 'inline',
      host,
      contextMetadata: { source: 'test' }
    })).rejects.toThrow('[DOM CONTRACT ERROR]');

    expect(host.querySelector('.tool-container--inline')).not.toBeNull();
    expect(window.ToolNexus.runtime.getActiveMounts()).toHaveLength(1);
  });


  test('container manager exposes static-ready window controls', async () => {
    const manager = createToolContainerManager({ doc: document });
    const host = document.createElement('div');
    document.body.append(host);

    const first = manager.mount({ host, toolId: 't1', mountMode: 'inline' });
    const second = manager.mount({ host, toolId: 't2', mountMode: 'panel' });

    expect(manager.focus(second.mountId)).toBe(true);
    expect(manager.minimize(first.mountId)).toBe(true);
    expect(manager.restore(first.mountId)).toBe(true);

    const mounts = manager.getActiveMounts();
    expect(mounts.find((entry) => entry.mountId === second.mountId)?.windowState).toBe('focused');
    expect(mounts.find((entry) => entry.mountId === first.mountId)?.windowState).toBe('restored');

    await manager.cleanupAll();
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
