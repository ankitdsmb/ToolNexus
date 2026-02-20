import { jest } from '@jest/globals';
import { create, destroy, runTool } from '../json-to-csv.js';
import { getKeyboardEventManager, resetKeyboardEventManagerForTesting } from '../keyboard-event-manager.js';
import { getToolPlatformKernel, resetToolPlatformKernelForTesting } from '../tool-platform-kernel.js';

function createRoot() {
  const root = document.createElement('article');
  root.className = 'tool-page';
  root.dataset.slug = 'json-to-csv';
  root.innerHTML = `
    <textarea id="jsonInput"></textarea>
    <textarea id="csvOutput"></textarea>
    <button id="convertBtn" type="button"></button>
    <button id="clearBtn" type="button"></button>
    <button id="copyBtn" type="button"></button>
    <button id="downloadBtn" type="button"></button>
    <input id="autoConvertToggle" type="checkbox" />
    <input id="flattenToggle" type="checkbox" checked />
    <input id="includeNullToggle" type="checkbox" />
    <input id="sanitizeToggle" type="checkbox" checked />
    <input id="prettyToggle" type="checkbox" />
    <select id="delimiterSelect"><option value="comma">comma</option></select>
    <select id="arrayModeSelect"><option value="stringify">stringify</option></select>
    <input id="arraySeparatorInput" value=", " />
    <p id="statusText"></p>
    <p id="outputStats"></p>
    <section id="errorBox" hidden><h3 id="errorTitle"></h3><p id="errorDetail"></p><p id="errorSuggestion"></p></section>
  `;
  document.body.appendChild(root);
  return root;
}

describe('json-to-csv kernel migration', () => {
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
    const input = '[{"name":"Ada","city":"Tokyo"}]';
    const a = await runTool('convert', input);
    const b = await runTool('convert', input);
    expect(a).toEqual(b);
    expect(a.success).toBe(true);
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
