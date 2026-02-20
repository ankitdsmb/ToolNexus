import { jest } from '@jest/globals';
import { create, destroy, runTool } from '../csv-viewer.js';
import { getKeyboardEventManager, resetKeyboardEventManagerForTesting } from '../keyboard-event-manager.js';
import { getToolPlatformKernel, resetToolPlatformKernelForTesting } from '../tool-platform-kernel.js';

function createRoot() {
  const root = document.createElement('article');
  root.className = 'tool-page';
  root.dataset.slug = 'csv-viewer';
  root.innerHTML = `
    <div class="tool-layout__panel"></div>
    <section class="tool-panel--output"></section>
    <div id="outputField"></div>
    <textarea id="inputEditor"></textarea>
  `;
  document.body.appendChild(root);
  return root;
}

describe('csv-viewer kernel migration', () => {
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

  test('lifecycle cleanup releases keyboard listeners', async () => {
    const root = createRoot();
    const handle = create(root);
    handle.create();
    handle.init();

    await runTool('preview', 'name,age\nAda,25');

    const manager = getKeyboardEventManager();
    expect(manager.getRegisteredHandlerCount()).toBe(1);

    destroy(root);

    expect(manager.getRegisteredHandlerCount()).toBe(0);
    expect(manager.getActiveGlobalListenerCount()).toBe(0);
  });

  test('runTool deterministic', async () => {
    const root = createRoot();
    create(root).init();

    const input = 'name,city\nAda,Tokyo';
    const a = await runTool('preview', input);
    const b = await runTool('preview', input);
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
    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(0);
  });
});
