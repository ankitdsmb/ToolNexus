import { createBase64EncodeApp, runClientBase64Encode } from '../../src/ToolNexus.Web/wwwroot/js/tools/base64-encode.app.js';
import { create, destroy, init, runTool } from '../../src/ToolNexus.Web/wwwroot/js/tools/base64-encode.js';
import { jest } from '@jest/globals';
import {
  getKeyboardEventManager,
  resetKeyboardEventManagerForTesting
} from '../../src/ToolNexus.Web/wwwroot/js/tools/keyboard-event-manager.js';
import {
  getToolPlatformKernel,
  resetToolPlatformKernelForTesting
} from '../../src/ToolNexus.Web/wwwroot/js/tools/tool-platform-kernel.js';
import { createTestRoot, destroyTool, mountTool } from './tool-platform-test-utils.js';

const TOOL_MARKUP = `
  <button id="textModeBtn" type="button" class="is-active"></button>
  <button id="fileModeBtn" type="button"></button>
  <div id="dropZone" hidden></div>
  <input id="fileInput" type="file" />
  <textarea id="inputEditor"></textarea>
  <textarea id="outputEditor"></textarea>
  <input id="urlSafeToggle" type="checkbox" />
  <input id="removePaddingToggle" type="checkbox" />
  <input id="autoEncodeToggle" type="checkbox" checked />
  <button id="encodeBtn">Encode</button>
  <button id="clearBtn">Clear</button>
  <button id="copyBtn">Copy</button>
  <button id="downloadBtn">Download</button>
  <div id="loadingState" hidden></div>
  <p id="warningBanner" hidden></p>
  <section id="errorBox" hidden>
    <h2 id="errorTitle"></h2>
    <p id="errorMessage"></p>
    <p id="errorAction"></p>
  </section>
  <div id="statusText"></div>
  <div id="inputMeta"></div>
`;

function setupDom() {
  return createTestRoot(TOOL_MARKUP, 'base64-tool');
}

describe('base64-encode run APIs', () => {
  afterEach(() => {
    resetKeyboardEventManagerForTesting();
    resetToolPlatformKernelForTesting();
  });

  test('runTool encodes values and rejects unsupported actions', async () => {
    await expect(runTool('encode', 'Hello')).resolves.toBe('SGVsbG8=');
    await expect(runTool('decode', 'SGVsbG8=')).rejects.toThrow('Unsupported action');
  });

  test('runClientBase64Encode validates empty input and applies URL-safe options', async () => {
    await expect(runClientBase64Encode('')).rejects.toThrow('Input must not be empty.');
    await expect(runClientBase64Encode('>?>', { urlSafe: true, removePadding: true })).resolves.toBe('Pj8-');
  });
});

describe('base64-encode lifecycle and ownership', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: jest.fn().mockResolvedValue(undefined) }
    });
  });

  afterEach(() => {
    resetKeyboardEventManagerForTesting();
    resetToolPlatformKernelForTesting();
  });

  test('app factory remains idempotent per root', () => {
    const root = setupDom();
    const appA = createBase64EncodeApp(root);
    const appB = createBase64EncodeApp(root);
    expect(appA).toBe(appB);
  });

  test('kernel-backed create/init/destroy supports deterministic lifecycle', () => {
    const root = setupDom();
    const handle = create(root);

    expect(getToolPlatformKernel().getLifecycleState('base64-encode', root)).toBe('created');

    handle.init();
    expect(getToolPlatformKernel().getLifecycleState('base64-encode', root)).toBe('initialized');

    destroy(root);
    expect(getToolPlatformKernel().getLifecycleState('base64-encode', root)).toBe('missing');
  });

  test('listener cardinality remains one global keydown listener across mounted instances', () => {
    const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
    const rootA = setupDom();
    const rootB = setupDom();

    mountTool(create, rootA);
    mountTool(create, rootB);

    const keydownRegistrations = addEventListenerSpy.mock.calls
      .filter(([eventName]) => eventName === 'keydown');

    expect(keydownRegistrations).toHaveLength(1);
    expect(getKeyboardEventManager().getRegisteredHandlerCount()).toBe(2);
    expect(getKeyboardEventManager().getActiveGlobalListenerCount()).toBe(1);

    addEventListenerSpy.mockRestore();
  });

  test('shortcut routing stays isolated to focused root', async () => {
    const rootA = setupDom();
    const rootB = setupDom();
    init(rootA);
    init(rootB);

    const inputA = rootA.querySelector('#inputEditor');
    const inputB = rootB.querySelector('#inputEditor');
    const outputA = rootA.querySelector('#outputEditor');
    const outputB = rootB.querySelector('#outputEditor');

    inputA.value = 'left side';
    inputB.value = 'right side';
    inputA.dispatchEvent(new Event('input', { bubbles: true }));
    inputB.dispatchEvent(new Event('input', { bubbles: true }));
    rootA.querySelector('#encodeBtn').click();
    rootB.querySelector('#encodeBtn').click();
    await Promise.resolve();

    inputA.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, bubbles: true }));

    expect(inputA.value).toBe('');
    expect(outputA.value).toBe('');
    expect(inputB.value).toBe('right side');
    expect(outputB.value).toBe('cmlnaHQgc2lkZQ==');
  });

  test('remount stress has zero listener leaks after 50 cycles', () => {
    const root = setupDom();

    for (let index = 0; index < 50; index += 1) {
      const handle = mountTool(create, root);
      const input = root.querySelector('#inputEditor');
      const output = root.querySelector('#outputEditor');

      input.focus();
      input.value = `iteration ${index}`;

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
      expect(output.value).toContain('aXRlcmF0aW9u');

      destroyTool(handle);
      expect(getKeyboardEventManager().getRegisteredHandlerCount()).toBe(0);
      expect(getKeyboardEventManager().getActiveGlobalListenerCount()).toBe(0);
    }
  });
});
