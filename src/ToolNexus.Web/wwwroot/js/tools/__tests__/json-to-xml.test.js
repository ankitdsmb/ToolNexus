import { create, destroy, runTool } from '../json-to-xml.js';
import { getKeyboardEventManager, resetKeyboardEventManagerForTesting } from '../keyboard-event-manager.js';
import { getToolPlatformKernel, resetToolPlatformKernelForTesting } from '../tool-platform-kernel.js';

function createRoot() {
  const root = document.createElement('article');
  root.className = 'tool-page';
  root.dataset.slug = 'json-to-xml';
  root.innerHTML = `
    <div class="tool-page__heading"><div><h1>JSON to XML</h1></div><p></p></div>
    <div class="tool-page__action-selector"></div>
    <div class="tool-toolbar__actions"><button type="button"></button></div>
    <p id="editorShortcutHint"></p>
    <textarea id="inputEditor"></textarea>
    <button id="runBtn" type="button"><span class="tool-btn__label">Run</span></button>
    <p id="resultStatus"></p>
    <p id="errorMessage" hidden></p>
  `;
  document.body.appendChild(root);
  return root;
}

describe('json-to-xml kernel migration', () => {
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

  test('lifecycle mount/unmount releases keyboard handlers', () => {
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

  test('runTool converts deterministic JSON and rejects invalid input', async () => {
    const xml = await runTool('convert', '{"user":{"name":"Ada"}}');
    expect(xml).toContain('<root>');
    expect(xml).toContain('<user>');

    await expect(runTool('convert', '{')).rejects.toThrow();
  });

  test('keyboard isolate and clear only active root', () => {
    const first = createRoot();
    const second = createRoot();
    create(first).init();
    create(second).init();

    first.querySelector('#inputEditor').value = 'clear me';
    second.querySelector('#inputEditor').value = 'keep me';

    first.querySelector('#inputEditor').focus();
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, bubbles: true }));

    expect(first.querySelector('#inputEditor').value).toBe('');
    expect(second.querySelector('#inputEditor').value).toBe('keep me');
  });

  test('remount stress x50 remains stable', () => {
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
