import { jest } from '@jest/globals';
import { create, destroy, runTool } from '../js-minifier.js';
import { getKeyboardEventManager, resetKeyboardEventManagerForTesting } from '../keyboard-event-manager.js';
import { getToolPlatformKernel, resetToolPlatformKernelForTesting } from '../tool-platform-kernel.js';

function createRoot() {
  const root = document.createElement('article');
  root.className = 'tool-page';
  root.dataset.slug = 'js-minifier';
  root.innerHTML = `
    <div class="tool-page__heading"><div></div></div>
    <select id="actionSelect"><option value="minify">minify</option></select>
    <h2 id="toolOutputHeading"></h2>
    <button id="runBtn" type="button"><span class="tool-btn__label">Run</span></button>
    <button id="copyBtn" type="button">Copy</button>
    <button id="downloadBtn" type="button">Download</button>
    <button id="shareBtn" type="button">Share</button>
    <p id="editorShortcutHint"></p>
    <textarea id="inputEditor"></textarea>
    <textarea id="outputEditor"></textarea>
    <p id="resultStatus"></p>
    <p id="errorMessage" hidden></p>
    <div id="outputEmptyState"></div>
    <div id="outputField"></div>
    <div class="tool-toolbar__actions"></div>
  `;
  document.body.appendChild(root);
  return root;
}

describe('js-minifier kernel migration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    global.navigator.clipboard = { writeText: jest.fn().mockResolvedValue(undefined) };
    global.window.Terser = {
      minify: jest.fn(async (input) => ({ code: String(input).replace(/\s+/g, ' ').trim() }))
    };
    resetKeyboardEventManagerForTesting();
    resetToolPlatformKernelForTesting();
  });

  afterEach(() => {
    resetKeyboardEventManagerForTesting();
    resetToolPlatformKernelForTesting();
    document.body.innerHTML = '';
    delete global.window.Terser;
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
    const input = 'function x() { return 1; }';
    const a = await runTool('minify', input);
    const b = await runTool('minify', input);
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
