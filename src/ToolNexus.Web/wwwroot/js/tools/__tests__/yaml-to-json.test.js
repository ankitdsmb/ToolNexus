import { jest } from '@jest/globals';
import { create, destroy, runTool } from '../yaml-to-json.js';
import { getKeyboardEventManager, resetKeyboardEventManagerForTesting } from '../keyboard-event-manager.js';
import { getToolPlatformKernel, resetToolPlatformKernelForTesting } from '../tool-platform-kernel.js';

function createRoot() {
  const root = document.createElement('article');
  root.className = 'tool-page';
  root.dataset.slug = 'yaml-to-json';
  root.innerHTML = `
    <textarea id="yamlInput"></textarea>
    <textarea id="jsonOutput"></textarea>
    <button id="convertBtn" type="button"></button>
    <button id="clearBtn" type="button"></button>
    <button id="copyBtn" type="button"></button>
    <button id="downloadBtn" type="button"></button>
    <input id="autoConvertToggle" type="checkbox" />
    <input id="prettyToggle" type="checkbox" checked />
    <select id="indentSelect"><option value="2">2</option><option value="4">4</option></select>
    <input id="sortKeysToggle" type="checkbox" />
    <input id="autoTypesToggle" type="checkbox" checked />
    <input id="strictStringsToggle" type="checkbox" />
    <input id="parseDatesToggle" type="checkbox" checked />
    <p id="statusText"></p>
  `;

  document.body.appendChild(root);
  return root;
}

describe('yaml-to-json kernel migration', () => {
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
    const input = 'name: Ada\nage: 34';
    const a = await runTool('convert', input);
    const b = await runTool('convert', input);
    expect(a).toEqual(b);
    expect(a).toContain('"name"');
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
