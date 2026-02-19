import { createUrlEncoderApp, runClientUrlEncode } from '../../src/ToolNexus.Web/wwwroot/js/tools/url-encode.app.js';
import { create, destroy, init, runTool } from '../../src/ToolNexus.Web/wwwroot/js/tools/url-encode.js';
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
  <textarea id="inputEditor"></textarea>
  <textarea id="outputEditor"></textarea>
  <select id="modeSelect"><option value="component" selected>component</option></select>
  <input id="plusSpaceToggle" type="checkbox" />
  <input id="autoEncodeToggle" type="checkbox" />
  <button id="encodeBtn">Encode</button>
  <button id="clearBtn">Clear</button>
  <button id="copyBtn">Copy</button>
  <div id="statusText"></div>
  <div id="inputStats"></div>
  <div id="outputStats"></div>
  <section id="errorBox" hidden>
    <h2 id="errorTitle"></h2>
    <p id="errorMessage"></p>
    <p id="errorAction"></p>
  </section>
  <div id="loadingState" hidden></div>
`;

function setupDom() {
  return createTestRoot(TOOL_MARKUP, 'url-encode-tool');
}

describe('url-encode run APIs', () => {
  afterEach(() => {
    resetKeyboardEventManagerForTesting();
    resetToolPlatformKernelForTesting();
  });

  test('runTool encodes values and rejects unsupported actions', async () => {
    await expect(runTool('encode', 'a b')).resolves.toBe('a%20b');
    await expect(runTool('decode', 'a%20b')).rejects.toThrow('Unsupported action');
  });

  test('runClientUrlEncode validates empty input and supports query values mode', () => {
    expect(() => runClientUrlEncode('')).toThrow('Input must not be empty.');
    expect(runClientUrlEncode('name=John Doe&city=New York', { mode: 'query-values', spaceEncoding: 'plus' })).toBe('name=John+Doe&city=New+York');
  });
});

describe('url-encode lifecycle and event ownership', () => {
  afterEach(() => {
    resetKeyboardEventManagerForTesting();
    resetToolPlatformKernelForTesting();
  });

  test('app factory remains idempotent per root', () => {
    const root = setupDom();
    const appA = createUrlEncoderApp(root);
    const appB = createUrlEncoderApp(root);
    expect(appA).toBe(appB);
  });

  test('kernel-backed create/init/destroy supports deterministic lifecycle', () => {
    const root = setupDom();
    const handle = create(root);

    expect(getToolPlatformKernel().getLifecycleState('url-encode', root)).toBe('created');

    handle.init();
    expect(getToolPlatformKernel().getLifecycleState('url-encode', root)).toBe('initialized');

    destroyTool(handle);
    expect(getToolPlatformKernel().getLifecycleState('url-encode', root)).toBe('missing');
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

  test('shortcut routing stays isolated to focused root', () => {
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

    inputA.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, bubbles: true }));

    expect(inputA.value).toBe('');
    expect(outputA.value).toBe('');
    expect(inputB.value).toBe('right side');
    expect(outputB.value).toBe('right%20side');
  });

  test('remount stress has zero listener leaks after 50 cycles', () => {
    const root = setupDom();

    for (let index = 0; index < 50; index += 1) {
      const handle = mountTool(create, root);
      const input = root.querySelector('#inputEditor');
      const output = root.querySelector('#outputEditor');

      input.focus();
      input.value = `iteration ${index}`;
      input.dispatchEvent(new Event('input', { bubbles: true }));

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
      expect(output.value).toContain('iteration');

      destroyTool(handle);
      expect(getKeyboardEventManager().getRegisteredHandlerCount()).toBe(0);
      expect(getKeyboardEventManager().getActiveGlobalListenerCount()).toBe(0);
    }
  });
});
