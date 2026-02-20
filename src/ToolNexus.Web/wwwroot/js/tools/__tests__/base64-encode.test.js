import { jest } from '@jest/globals';
import { create, destroy, runTool } from '../base64-encode.js';
import { getKeyboardEventManager, resetKeyboardEventManagerForTesting } from '../keyboard-event-manager.js';
import { getToolPlatformKernel, resetToolPlatformKernelForTesting } from '../tool-platform-kernel.js';

function createRoot() {
  const root = document.createElement('article');
  root.className = 'base64-tool';
  root.innerHTML = `
    <button id="textModeBtn" type="button"></button>
    <button id="fileModeBtn" type="button"></button>
    <div id="dropZone"></div>
    <input id="fileInput" type="file" />
    <textarea id="inputEditor"></textarea>
    <textarea id="outputEditor"></textarea>
    <input id="urlSafeToggle" type="checkbox" />
    <input id="removePaddingToggle" type="checkbox" />
    <input id="autoEncodeToggle" type="checkbox" />
    <button id="encodeBtn" type="button"></button>
    <button id="clearBtn" type="button"></button>
    <button id="copyBtn" type="button"></button>
    <button id="downloadBtn" type="button"></button>
    <div id="loadingState" hidden></div>
    <p id="warningBanner" hidden></p>
    <div id="errorBox" hidden><p id="errorTitle"></p><p id="errorMessage"></p><p id="errorAction"></p></div>
    <p id="statusText"></p>
    <p id="inputMeta"></p>
  `;

  document.body.appendChild(root);
  return root;
}

describe('base64-encode kernel migration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    global.navigator.clipboard = { writeText: jest.fn().mockResolvedValue(undefined) };
    resetKeyboardEventManagerForTesting();
    resetToolPlatformKernelForTesting();
  });

  afterEach(() => {
    resetKeyboardEventManagerForTesting();
    resetToolPlatformKernelForTesting();
    document.body.innerHTML = '';
  });

  test('idempotent create for same root', () => {
    const root = createRoot();
    expect(create(root)).toBe(create(root));
    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(1);
  });

  test('lifecycle mount/unmount releases keyboard listeners', () => {
    const root = createRoot();
    const handle = create(root);
    handle.create();
    handle.init();

    const manager = getKeyboardEventManager();
    expect(manager.getRegisteredHandlerCount()).toBe(1);
    expect(manager.getActiveGlobalListenerCount()).toBe(1);

    destroy(root);

    expect(manager.getRegisteredHandlerCount()).toBe(0);
    expect(manager.getActiveGlobalListenerCount()).toBe(0);
    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(0);
  });

  test('runTool deterministic and rejects unsupported action', async () => {
    const a = await runTool('encode', 'hello world');
    const b = await runTool('encode', 'hello world');
    expect(a).toEqual(b);
    await expect(runTool('decode', 'aGVsbG8=')).rejects.toThrow();
  });

  test('remount stress x50 keeps listener cardinality stable', () => {
    const manager = getKeyboardEventManager();
    for (let i = 0; i < 50; i += 1) {
      const root = createRoot();
      const handle = create(root);
      handle.create();
      handle.init();
      destroy(root);
      root.remove();
    }

    expect(manager.getRegisteredHandlerCount()).toBe(0);
    expect(manager.getActiveGlobalListenerCount()).toBe(0);
    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(0);
  });
});
