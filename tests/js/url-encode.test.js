import { createUrlEncoderApp, runClientUrlEncode } from '../../src/ToolNexus.Web/wwwroot/js/tools/url-encode.app.js';
import { runTool } from '../../src/ToolNexus.Web/wwwroot/js/tools/url-encode.js';
import { jest } from '@jest/globals';
import {
  getKeyboardEventManager,
  resetKeyboardEventManagerForTesting
} from '../../src/ToolNexus.Web/wwwroot/js/tools/keyboard-event-manager.js';

function createToolMarkup() {
  return `<section class="url-encode-tool">
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
  </section>`;
}

function setupDom() {
  document.body.innerHTML = createToolMarkup();
  return document.querySelector('.url-encode-tool');
}

function appendToolRoot() {
  const container = document.createElement('div');
  container.innerHTML = createToolMarkup();
  const root = container.firstElementChild;
  document.body.appendChild(root);
  return root;
}

describe('url-encode run APIs', () => {
  afterEach(() => {
    resetKeyboardEventManagerForTesting();
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

describe('url-encode dom behavior', () => {
  afterEach(() => {
    resetKeyboardEventManagerForTesting();
  });

  test('createUrlEncoderApp is idempotent per root and keyboard shortcut is scoped to tool root', () => {
    const root = setupDom();
    const appA = createUrlEncoderApp(root);
    const appB = createUrlEncoderApp(root);

    expect(appA).toBe(appB);

    const input = root.querySelector('#inputEditor');
    const output = root.querySelector('#outputEditor');

    input.value = 'alpha beta';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    root.querySelector('#encodeBtn').click();
    expect(output.value).toBe('alpha%20beta');

    const outsideInput = document.createElement('input');
    document.body.appendChild(outsideInput);
    outsideInput.focus();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, bubbles: true }));
    expect(input.value).toBe('alpha beta');

    input.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, bubbles: true }));
    expect(input.value).toBe('');
    expect(output.value).toBe('');
  });

  test('listener cardinality remains one global keydown listener across instances', () => {
    const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
    const rootA = appendToolRoot();
    const rootB = appendToolRoot();

    createUrlEncoderApp(rootA);
    createUrlEncoderApp(rootB);

    const keydownRegistrations = addEventListenerSpy.mock.calls
      .filter(([eventName]) => eventName === 'keydown');

    expect(keydownRegistrations).toHaveLength(1);
    expect(getKeyboardEventManager().getRegisteredHandlerCount()).toBe(2);
    expect(getKeyboardEventManager().getActiveGlobalListenerCount()).toBe(1);

    addEventListenerSpy.mockRestore();
  });

  test('multi-instance isolation routes shortcuts only to focused root', () => {
    const rootA = appendToolRoot();
    const rootB = appendToolRoot();
    createUrlEncoderApp(rootA);
    createUrlEncoderApp(rootB);

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

  test('destroy lifecycle unregisters instances without removing shared listener too early', () => {
    const rootA = appendToolRoot();
    const rootB = appendToolRoot();
    const appA = createUrlEncoderApp(rootA);
    const appB = createUrlEncoderApp(rootB);

    expect(getKeyboardEventManager().getRegisteredHandlerCount()).toBe(2);

    appA.dispose();

    expect(getKeyboardEventManager().getRegisteredHandlerCount()).toBe(1);
    expect(getKeyboardEventManager().getActiveGlobalListenerCount()).toBe(1);

    appB.destroy();

    expect(getKeyboardEventManager().getRegisteredHandlerCount()).toBe(0);
    expect(getKeyboardEventManager().getActiveGlobalListenerCount()).toBe(0);
  });

  test('remount stress remains stable across 50 mount/unmount cycles', () => {
    const root = appendToolRoot();

    for (let index = 0; index < 50; index += 1) {
      const app = createUrlEncoderApp(root);
      const input = root.querySelector('#inputEditor');
      const output = root.querySelector('#outputEditor');

      input.focus();
      input.value = `iteration ${index}`;
      input.dispatchEvent(new Event('input', { bubbles: true }));

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
      expect(output.value).toContain('iteration');

      app.dispose();
      expect(getKeyboardEventManager().getRegisteredHandlerCount()).toBe(0);
      expect(getKeyboardEventManager().getActiveGlobalListenerCount()).toBe(0);
    }
  });
});
