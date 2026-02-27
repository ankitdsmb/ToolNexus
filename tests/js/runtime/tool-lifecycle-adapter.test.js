import { jest } from "@jest/globals";
import { mountToolLifecycle } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-lifecycle-adapter.js';

describe('tool lifecycle adapter', () => {
  test('prefers full lifecycle contract and wires destroy cleanup with context', async () => {
    const calls = [];
    const root = document.createElement('div');
    const manifest = { slug: 'json-formatter' };

    const module = {
      create: jest.fn((domRoot) => {
        calls.push(['create', domRoot]);
        return { token: 'ctx-1' };
      }),
      init: jest.fn((context) => {
        calls.push(['init', context.token]);
      }),
      destroy: jest.fn((context) => {
        calls.push(['destroy', context.token]);
      }),
      mount: jest.fn(() => {
        throw new Error('mount should not be called when full contract exists');
      })
    };

    const result = await mountToolLifecycle({ module, slug: 'json-formatter', root, manifest });

    expect(result.mounted).toBe(true);
    expect(result.mode).toBe('module.lifecycle-contract');
    expect(module.create).toHaveBeenCalledTimes(1);
    expect(module.init).toHaveBeenCalledTimes(1);
    expect(module.mount).not.toHaveBeenCalled();

    await result.cleanup();
    expect(module.destroy).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([
      ['create', root],
      ['init', undefined],
      ['destroy', 'ctx-1']
    ]);
  });

  test('legacy registry execution-only runTool contract is not mounted as lifecycle', async () => {
    const root = document.createElement('div');
    window.ToolNexusModules = {
      'exec-only': {
        runTool: jest.fn((action, input) => ({ action, input }))
      }
    };

    try {
      const result = await mountToolLifecycle({
        module: {},
        slug: 'exec-only',
        root,
        manifest: { slug: 'exec-only' }
      });

      expect(result.mounted).toBe(false);
      expect(result.mode).toBe('legacy.runTool.execution-only');
      expect(window.ToolNexusModules['exec-only'].runTool).not.toHaveBeenCalled();
    } finally {
      delete window.ToolNexusModules;
    }
  });
});
