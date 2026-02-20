import { jest } from '@jest/globals';
import { create, destroy, runTool } from '../sql-formatter.js';
import { getKeyboardEventManager, resetKeyboardEventManagerForTesting } from '../keyboard-event-manager.js';
import { getToolPlatformKernel, resetToolPlatformKernelForTesting } from '../tool-platform-kernel.js';

function createRoot() {
  const root = document.createElement('article');
  root.className = 'tool-page';
  root.dataset.slug = 'sql-formatter';
  root.innerHTML = `
    <textarea id="inputEditor"></textarea>
    <textarea id="outputEditor"></textarea>
    <button id="runBtn" type="button"></button>
    <button id="clearBtn" type="button"></button>
    <button id="copyBtn" type="button"></button>
    <button id="downloadBtn" type="button"></button>
    <select id="actionSelect"><option value="format">Format</option><option value="minify">Minify</option></select>
    <p id="resultStatus"></p>
  `;

  document.body.appendChild(root);
  return root;
}

describe('sql-formatter kernel migration', () => {
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
    const input = 'select id, name from users where active = 1';
    const a = await runTool('format', input);
    const b = await runTool('format', input);
    expect(a).toEqual(b);

    const minified = await runTool('minify', input);
    expect(minified).toContain('select id, name from users where active = 1');
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
