import { loadMonaco, resetMonacoLoaderForTesting } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/monaco-loader.js';
import { jest } from '@jest/globals';

describe('runtime monaco loader', () => {
  beforeEach(() => {
    resetMonacoLoaderForTesting();
    delete window.monaco;
    delete window.require;
  });

  afterEach(() => {
    resetMonacoLoaderForTesting();
    delete window.monaco;
    delete window.require;
  });

  test('returns AMD-resolved monaco namespace even when window.monaco is empty', async () => {
    const monacoNamespace = {
      editor: {
        create: jest.fn()
      }
    };

    const requireFn = (deps, callback) => callback(monacoNamespace);
    requireFn.config = jest.fn();
    requireFn.s = { contexts: { _: { config: { paths: { vs: '/lib/monaco/vs' } } } } };

    window.monaco = {};
    window.require = requireFn;

    const runtime = await loadMonaco();

    expect(runtime).toBe(monacoNamespace);
  });

  test('resolves null instead of throwing when editor API is unavailable', async () => {
    const requireFn = (deps, callback) => callback({});
    requireFn.config = jest.fn();
    requireFn.s = { contexts: { _: { config: { paths: { vs: '/lib/monaco/vs' } } } } };

    window.require = requireFn;

    await expect(loadMonaco()).resolves.toBeNull();
  });
});
