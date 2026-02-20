import { jest } from '@jest/globals';
import { createXmlFormatterApp } from '../../src/ToolNexus.Web/wwwroot/js/tools/xml-formatter.app.js';
import { runXmlFormatter } from '../../src/ToolNexus.Web/wwwroot/js/tools/xml-formatter.api.js';
import { create, destroy, init, runTool } from '../../src/ToolNexus.Web/wwwroot/js/tools/xml-formatter.js';
import {
  getKeyboardEventManager,
  resetKeyboardEventManagerForTesting
} from '../../src/ToolNexus.Web/wwwroot/js/tools/keyboard-event-manager.js';
import {
  getToolPlatformKernel,
  resetToolPlatformKernelForTesting
} from '../../src/ToolNexus.Web/wwwroot/js/tools/tool-platform-kernel.js';
import { createTestRoot, destroyTool, mountTool } from './tool-platform-test-utils.js';

const TOOL_MARKUP = `
  <div class="tool-page" data-slug="xml-formatter">
    <div class="tool-page__action-selector"></div>
    <div class="tool-toolbar__actions"></div>
    <h3 id="toolInputHeading">Input</h3>
    <textarea id="inputEditor"></textarea>
    <textarea id="outputEditor"></textarea>
    <button id="runBtn" type="button">Run</button>
    <button id="copyBtn" type="button">Copy</button>
    <button id="downloadBtn" type="button">Download</button>
    <select id="actionSelect"><option value="format">format</option></select>
    <p id="errorMessage" hidden></p>
    <p id="resultStatus" class="result-indicator--idle">Ready</p>
    <p id="editorShortcutHint"></p>
  </div>
`;

function setupDom() {
  return createTestRoot(TOOL_MARKUP).firstElementChild;
}

describe('xml-formatter API behavior', () => {
  afterEach(() => {
    resetKeyboardEventManagerForTesting();
    resetToolPlatformKernelForTesting();
  });

  test('runTool and runXmlFormatter preserve formatting logic', async () => {
    await expect(runTool('format', '<root><item>1</item></root>')).resolves.toContain('<root>');
    await expect(runXmlFormatter('validate', '<root/>')).resolves.toBe('Valid XML');
    await expect(runTool('format', '')).rejects.toThrow('Paste XML before formatting.');
  });
});

describe('xml-formatter lifecycle and shortcuts', () => {
  afterEach(() => {
    resetKeyboardEventManagerForTesting();
    resetToolPlatformKernelForTesting();
  });

  test('app factory is idempotent per root', () => {
    const root = setupDom();
    const appA = createXmlFormatterApp(root);
    const appB = createXmlFormatterApp(root);
    expect(appA).toBe(appB);
  });

  test('kernel lifecycle create/init/destroy is deterministic', () => {
    const root = setupDom();
    const handle = create(root);

    expect(getToolPlatformKernel().getLifecycleState('xml-formatter', root)).toBe('created');
    handle.init();
    expect(getToolPlatformKernel().getLifecycleState('xml-formatter', root)).toBe('initialized');

    destroy(root);
    expect(getToolPlatformKernel().getLifecycleState('xml-formatter', root)).toBe('missing');
  });

  test('global keyboard listener remains singleton across roots', () => {
    const addSpy = jest.spyOn(document, 'addEventListener');
    const rootA = setupDom();
    const rootB = setupDom();

    mountTool(create, rootA);
    mountTool(create, rootB);

    const keydownRegistrations = addSpy.mock.calls.filter(([eventName]) => eventName === 'keydown');
    expect(keydownRegistrations).toHaveLength(1);
    expect(getKeyboardEventManager().getRegisteredHandlerCount()).toBe(2);
    expect(getKeyboardEventManager().getActiveGlobalListenerCount()).toBe(1);

    addSpy.mockRestore();
  });

  test('shortcut routing is isolated by focused root', () => {
    const rootA = setupDom();
    const rootB = setupDom();
    init(rootA);
    init(rootB);

    const inputA = rootA.querySelector('#inputEditor');
    const inputB = rootB.querySelector('#inputEditor');

    inputA.value = '<a>1</a>';
    inputB.value = '<b>2</b>';

    inputA.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, bubbles: true }));

    expect(inputA.value).toBe('');
    expect(inputB.value).toBe('<b>2</b>');
  });

  test('remount stress x50 has no listener leaks', async () => {
    const root = setupDom();

    for (let index = 0; index < 50; index += 1) {
      const handle = mountTool(create, root);
      const input = root.querySelector('#inputEditor');
      const runButton = root.querySelector('#runBtn');
      const output = root.querySelector('#outputEditor');

      input.value = `<root><iteration>${index}</iteration></root>`;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      runButton.click();
      // eslint-disable-next-line no-await-in-loop
      await Promise.resolve();
      expect(output.value).toContain(`<iteration>${index}</iteration>`);

      destroyTool(handle);
      expect(getKeyboardEventManager().getRegisteredHandlerCount()).toBe(0);
      expect(getKeyboardEventManager().getActiveGlobalListenerCount()).toBe(0);
    }
  });
});
