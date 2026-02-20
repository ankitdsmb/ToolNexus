import { create, destroy, runTool } from '../xml-to-json.js';
import { getKeyboardEventManager, resetKeyboardEventManagerForTesting } from '../keyboard-event-manager.js';
import { getToolPlatformKernel, resetToolPlatformKernelForTesting } from '../tool-platform-kernel.js';

function createRoot() {
  const root = document.createElement('article');
  root.className = 'tool-page';
  root.dataset.slug = 'xml-to-json';
  root.innerHTML = `
    <div class="tool-page__heading"><div><h1>XML to JSON</h1></div><p></p></div>
    <div class="tool-page__action-selector"></div>
    <div class="tool-toolbar__actions"><button type="button"></button></div>
    <p id="editorShortcutHint"></p>
    <textarea id="inputEditor"></textarea>
    <textarea id="outputEditor"></textarea>
    <button id="runBtn" type="button"><span class="tool-btn__label">Run</span></button>
  `;
  document.body.appendChild(root);
  return root;
}

describe('xml-to-json kernel migration', () => {
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

  test('lifecycle mount/unmount releases keyboard manager listeners', () => {
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

  test('keyboard shortcut is root isolated', () => {
    const first = createRoot();
    const second = createRoot();
    create(first).init();
    create(second).init();

    first.querySelector('#inputEditor').value = 'abc';
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, bubbles: true }));

    expect(first.querySelector('#inputEditor').value).toBe('');
    expect(second.querySelector('#inputEditor').value).toBe('');

    second.querySelector('#inputEditor').value = 'kept';
    first.querySelector('#inputEditor').value = 'to-clear';
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, bubbles: true }));
    expect(second.querySelector('#inputEditor').value).toBe('kept');
  });

  test('runTool converts deterministic xml and rejects invalid xml', async () => {
    const output = await runTool('convert', '<root><a x="1">2</a></root>');
    expect(output).toContain('"root"');
    expect(output).toContain('"@attributes"');

    await expect(runTool('convert', '<root>')).rejects.toThrow();
  });

  test('remount stress x50 keeps listener cardinality stable', () => {
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
