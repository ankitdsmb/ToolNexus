import { create, destroy, runTool } from '../uuid-generator.js';
import { getKeyboardEventManager, resetKeyboardEventManagerForTesting } from '../keyboard-event-manager.js';
import { getToolPlatformKernel, resetToolPlatformKernelForTesting } from '../tool-platform-kernel.js';

function createRoot() {
  const root = document.createElement('section');
  root.id = 'uuidGeneratorApp';
  root.innerHTML = `
    <select id="uuidVersion"><option value="v4">v4</option></select>
    <input id="uuidQuantity" value="1" />
    <select id="uuidCase"><option value="lower">lower</option></select>
    <input id="uuidNoHyphen" type="checkbox" />
    <select id="uuidWrapper"><option value="none">none</option></select>
    <input id="uuidTemplate" />
    <input id="uuidUnique" type="checkbox" />
    <input id="uuidAutoGenerate" type="checkbox" />
    <button id="uuidGenerateBtn" type="button"></button>
    <button id="uuidClearBtn" type="button"></button>
    <button id="uuidCopyBtn" type="button"></button>
    <button id="uuidCopyAllBtn" type="button"></button>
    <button id="uuidDownloadBtn" type="button"></button>
    <textarea id="uuidOutput"></textarea>
    <p id="uuidStatus"></p>
    <p id="uuidIndicator"></p>
    <p id="uuidMetrics"></p>
    <div id="uuidErrorPanel" hidden><h3 id="uuidErrorTitle"></h3><p id="uuidErrorText"></p></div>
  `;
  document.body.appendChild(root);
  return root;
}

describe('uuid-generator kernel migration', () => {
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
    expect(manager.getActiveGlobalListenerCount()).toBe(1);

    destroy(root);

    expect(manager.getRegisteredHandlerCount()).toBe(0);
    expect(manager.getActiveGlobalListenerCount()).toBe(0);
    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(0);
  });

  test('runTool deterministic cardinality', async () => {
    const out = await runTool('generate', '3');
    expect(out.split('\n')).toHaveLength(3);
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
