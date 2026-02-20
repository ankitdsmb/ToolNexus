import { jest } from '@jest/globals';
import { create, destroy, runTool } from '../html-entities.js';
import { getKeyboardEventManager, resetKeyboardEventManagerForTesting } from '../keyboard-event-manager.js';
import { getToolPlatformKernel, resetToolPlatformKernelForTesting } from '../tool-platform-kernel.js';

function createRoot() {
  const root = document.createElement('article');
  root.className = 'html-entities-tool';
  root.innerHTML = `
    <textarea id="inputEditor"></textarea>
    <textarea id="outputEditor"></textarea>
    <button id="convertBtn" type="button"></button>
    <button id="clearBtn" type="button"></button>
    <button id="copyBtn" type="button"></button>
    <p id="statusText"></p>
    <p id="inputStats"></p>
    <p id="outputStats"></p>
    <p id="processingIndicator" hidden></p>
    <section id="errorBox" hidden>
      <h3 id="errorTitle"></h3>
      <p id="errorMessage"></p>
      <p id="errorAction"></p>
    </section>
    <input id="autoConvertToggle" type="checkbox" />
    <input id="encodeAllToggle" type="checkbox" />
    <input id="unsafeOnlyToggle" type="checkbox" checked />
    <input id="preferNamedToggle" type="checkbox" checked />
    <input id="numericToggle" type="checkbox" />
    <input id="hexToggle" type="checkbox" />
    <input id="preserveFormattingToggle" type="checkbox" checked />
    <button id="modeEncodeBtn" type="button"></button>
    <button id="modeDecodeBtn" type="button"></button>
  `;

  document.body.appendChild(root);
  return root;
}

describe('html-entities kernel migration', () => {
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

  test('idempotent create', () => {
    const root = createRoot();
    expect(create(root)).toBe(create(root));
    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(1);
  });

  test('lifecycle cleanup releases keyboard listeners', () => {
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

  test('runTool deterministic behavior', async () => {
    const input = '<div>Tom & Jerry</div>';
    const a = await runTool('encode', input);
    const b = await runTool('encode', input);
    expect(a).toEqual(b);
  });

  test('remount stress x50', () => {
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
