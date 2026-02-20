import { create, destroy, runTool } from '../xml-formatter.js';
import { getKeyboardEventManager, resetKeyboardEventManagerForTesting } from '../keyboard-event-manager.js';
import { getToolPlatformKernel, resetToolPlatformKernelForTesting } from '../tool-platform-kernel.js';

function createXmlFormatterRoot() {
  const root = document.createElement('article');
  root.className = 'tool-page';
  root.dataset.slug = 'xml-formatter';
  root.innerHTML = `
    <div class="tool-layout">
      <section class="tool-panel">
        <h2><span id="toolInputHeading">Input XML</span></h2>
      </section>
      <div class="tool-page__action-selector"></div>
      <div class="tool-toolbar__actions"></div>
      <p id="editorShortcutHint"></p>
      <textarea id="inputEditor"></textarea>
      <textarea id="outputEditor"></textarea>
      <button id="runBtn" type="button">Run</button>
      <button id="copyBtn" type="button">Copy</button>
      <button id="downloadBtn" type="button">Download</button>
      <select id="actionSelect"><option value="format">Format</option></select>
      <p id="errorMessage" hidden></p>
      <p id="resultStatus"></p>
    </div>
  `;

  document.body.appendChild(root);
  return root;
}

describe('xml-formatter kernel migration', () => {
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

  test('idempotent create for the same root', () => {
    const root = createXmlFormatterRoot();

    const first = create(root);
    const second = create(root);

    expect(first).toBe(second);
    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(1);
  });

  test('lifecycle mount/unmount registers and releases listeners', () => {
    const root = createXmlFormatterRoot();
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

  test('formats xml and supports keyboard shortcut without cross-root side effects', async () => {
    const firstRoot = createXmlFormatterRoot();
    const secondRoot = createXmlFormatterRoot();
    const firstHandle = create(firstRoot);
    const secondHandle = create(secondRoot);

    firstHandle.create();
    firstHandle.init();
    secondHandle.create();
    secondHandle.init();

    firstRoot.querySelector('#inputEditor').value = '<root><child>v</child></root>';
    firstRoot.querySelector('#inputEditor').dispatchEvent(new Event('input', { bubbles: true }));

    firstRoot.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(firstRoot.querySelector('#outputEditor').value).toContain('<root>');
    expect(secondRoot.querySelector('#outputEditor').value).toBe('');
  });

  test('runTool behavior stays correct', async () => {
    await expect(runTool('format', '<root><node attr="v">1</node></root>')).resolves.toContain('<node attr="v">1</node>');
    await expect(runTool('validate', '<root><node/></root>')).resolves.toBe('Valid XML');
    await expect(runTool('format', '<root>')).rejects.toThrow();
  });

  test('remount stress x50 keeps listener cardinality stable', () => {
    const manager = getKeyboardEventManager();

    for (let iteration = 0; iteration < 50; iteration += 1) {
      const root = createXmlFormatterRoot();
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
