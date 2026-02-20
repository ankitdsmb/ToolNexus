import { create, destroy, runTool } from '../css-minifier.js';
import { getKeyboardEventManager, resetKeyboardEventManagerForTesting } from '../keyboard-event-manager.js';
import { getToolPlatformKernel, resetToolPlatformKernelForTesting } from '../tool-platform-kernel.js';

function createRoot() {
  const root = document.createElement('article');
  root.className = 'tool-page';
  root.dataset.slug = 'css-minifier';
  root.innerHTML = `
    <select id="actionSelect"><option value="minify">Minify</option></select>
    <textarea id="inputEditor"></textarea>
    <textarea id="outputEditor"></textarea>
    <button id="runBtn" type="button"><span class="tool-btn__label">Run</span></button>
    <button id="copyBtn" type="button">Copy</button>
    <button id="downloadBtn" type="button">Download</button>
    <p id="editorShortcutHint"></p>
    <p id="toolOutputHeading"></p>
    <p id="resultStatus"></p>
    <div class="tool-toolbar__actions"></div>
    <div><div id="outputField"></div></div>
  `;
  document.body.appendChild(root);
  return root;
}

describe('css-minifier kernel migration', () => {
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

    destroy(root);

    expect(manager.getRegisteredHandlerCount()).toBe(0);
    expect(manager.getActiveGlobalListenerCount()).toBe(0);
  });

  test('runTool deterministic and minifies css', async () => {
    const input = 'body { color: red;  margin: 0; }';
    const a = await runTool('minify', input);
    const b = await runTool('minify', input);

    expect(a).toEqual(b);
    expect(a).toContain('body{color:red');
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
