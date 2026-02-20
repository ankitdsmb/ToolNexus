import { jest } from '@jest/globals';
import { create, destroy, runTool } from '../html-formatter.js';
import { getKeyboardEventManager, resetKeyboardEventManagerForTesting } from '../keyboard-event-manager.js';
import { getToolPlatformKernel, resetToolPlatformKernelForTesting } from '../tool-platform-kernel.js';

function createRoot() {
  const root = document.createElement('article');
  root.className = 'tool-page';
  root.dataset.slug = 'html-formatter';
  root.innerHTML = `
    <textarea id="inputEditor"></textarea>
    <textarea id="outputEditor"></textarea>
    <button id="runBtn" type="button"></button>
    <button id="copyBtn" type="button"></button>
    <button id="downloadBtn" type="button"></button>
    <select id="actionSelect"><option value="format">Format</option><option value="minify">Minify</option></select>
    <p id="errorMessage" hidden></p>
    <p id="resultStatus"></p>
    <p id="editorShortcutHint"></p>
    <div class="tool-toolbar__actions"></div>
  `;
  document.body.appendChild(root);
  return root;
}

describe('html-formatter kernel migration', () => {
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

  test('lifecycle cleanup releases keyboard handlers', () => {
    const root = createRoot();
    const handle = create(root);
    handle.create();
    handle.init();

    const manager = getKeyboardEventManager();
    expect(manager.getRegisteredHandlerCount()).toBe(1);

    destroy(root);

    expect(manager.getRegisteredHandlerCount()).toBe(0);
    expect(manager.getActiveGlobalListenerCount()).toBe(0);
  });

  test('runTool deterministic output and minify action', async () => {
    const input = '<div> <span>ok</span> </div>';
    const pretty = await runTool('format', input);
    const prettyAgain = await runTool('format', input);
    const minified = await runTool('minify', input);

    expect(pretty).toEqual(prettyAgain);
    expect(minified.length).toBeLessThanOrEqual(pretty.length);
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
    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(0);
  });
});
