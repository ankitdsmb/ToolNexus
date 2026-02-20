import { create, destroy, runTool } from '../url-decode.js';
import { getKeyboardEventManager, resetKeyboardEventManagerForTesting } from '../keyboard-event-manager.js';
import { getToolPlatformKernel, resetToolPlatformKernelForTesting } from '../tool-platform-kernel.js';

function createRoot() {
  const root = document.createElement('article');
  root.className = 'url-decode-tool';
  root.innerHTML = `
    <textarea id="urlDecodeInput"></textarea>
    <textarea id="urlDecodeOutput"></textarea>
    <p id="urlDecodeStatus"></p>
    <p id="urlDecodeInputCount"></p>
    <p id="urlDecodeOutputCount"></p>
    <button id="decodeBtn" type="button"></button>
    <button id="clearBtn" type="button"></button>
    <button id="copyBtn" type="button"></button>
    <p id="urlDecodeProcessing" hidden></p>
    <section id="urlDecodeError" hidden>
      <h3 id="urlDecodeErrorTitle"></h3>
      <p id="urlDecodeErrorMessage"></p>
      <p id="urlDecodeErrorGuidance"></p>
    </section>
    <p id="urlDecodeWarning" hidden></p>
    <input id="autoDecodeToggle" type="checkbox" />
    <input id="plusAsSpaceToggle" type="checkbox" />
    <input id="strictModeToggle" type="checkbox" checked />
  `;

  document.body.appendChild(root);
  return root;
}

describe('url-decode kernel migration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
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
    const input = 'https%3A%2F%2Fexample.com%2F%3Fq%3Dhello%2520world';
    const a = await runTool('decode', input);
    const b = await runTool('decode', input);
    expect(a).toEqual(b);
  });

  test('remount stress x50 keeps listener count stable', () => {
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
