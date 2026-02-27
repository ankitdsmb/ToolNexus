import { loadMonaco, resetMonacoLoaderForTesting } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/monaco-loader.js';
import { jest } from '@jest/globals';

const MONACO_CDN_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs';
const MONACO_LOADER_URL = `${MONACO_CDN_BASE}/loader.min.js`;

describe('runtime monaco loader', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    resetMonacoLoaderForTesting();
    delete window.monaco;
    delete window.require;
    delete window.MonacoEnvironment;
  });

  afterEach(() => {
    resetMonacoLoaderForTesting();
    delete window.monaco;
    delete window.require;
    delete window.MonacoEnvironment;
    jest.restoreAllMocks();
  });

  test('injects CDN loader, configures AMD path, and returns monaco namespace', async () => {
    const monacoNamespace = { editor: { create: jest.fn() } };
    const requireFn = jest.fn((deps, callback) => callback(monacoNamespace));
    requireFn.config = jest.fn();
    requireFn.s = { contexts: { _: { config: { paths: {} } } } };

    const appendSpy = jest.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      if (node.tagName === 'SCRIPT' && node.src === MONACO_LOADER_URL) {
        window.require = requireFn;
        queueMicrotask(() => node.dispatchEvent(new Event('load')));
      }
      return node;
    });

    const runtime = await loadMonaco();

    expect(appendSpy).toHaveBeenCalled();
    expect(requireFn.config).toHaveBeenCalledWith({ paths: { vs: MONACO_CDN_BASE } });
    expect(window.MonacoEnvironment.getWorkerUrl()).toBe(`${MONACO_CDN_BASE}/base/worker/workerMain.js`);
    expect(runtime).toBe(monacoNamespace);
  });

  test('resolves null and emits monaco_asset_invalid when editor API is unavailable', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const requireFn = jest.fn((deps, callback) => callback({}));
    requireFn.config = jest.fn();
    requireFn.s = { contexts: { _: { config: { paths: {} } } } };

    jest.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      if (node.tagName === 'SCRIPT' && node.src === MONACO_LOADER_URL) {
        window.require = requireFn;
        queueMicrotask(() => node.dispatchEvent(new Event('load')));
      }
      return node;
    });

    await expect(loadMonaco()).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('[runtime] monaco_asset_invalid');
  });

  test('throws when require exists but AMD context is invalid', async () => {
    const requireFn = jest.fn();
    requireFn.config = jest.fn();
    requireFn.s = { contexts: {} };

    window.require = requireFn;

    jest.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      if (node.tagName === 'SCRIPT' && node.src === MONACO_LOADER_URL) {
        queueMicrotask(() => node.dispatchEvent(new Event('load')));
      }
      return node;
    });

    await expect(loadMonaco()).rejects.toThrow('Invalid Monaco AMD loader detected');
  });
});
