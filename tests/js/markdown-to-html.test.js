import { jest } from '@jest/globals';
import { createMarkdownToHtmlApp } from '../../src/ToolNexus.Web/wwwroot/js/tools/markdown-to-html.app.js';
import { runMarkdownToHtml } from '../../src/ToolNexus.Web/wwwroot/js/tools/markdown-to-html.api.js';
import { create, destroy, init, runTool } from '../../src/ToolNexus.Web/wwwroot/js/tools/markdown-to-html.js';
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
  <textarea id="inputEditor"></textarea>
  <textarea id="outputEditor"></textarea>
  <button id="convertBtn" type="button">Convert</button>
  <button id="clearBtn" type="button">Clear</button>
  <div id="statusText"></div>
`;

function setupDom() {
  return createTestRoot(TOOL_MARKUP, 'markdown-to-html-tool');
}

describe('markdown-to-html run APIs', () => {
  afterEach(() => {
    resetKeyboardEventManagerForTesting();
    resetToolPlatformKernelForTesting();
  });

  test('runTool keeps conversion behavior deterministic', async () => {
    await expect(runTool('convert', '# Title')).resolves.toBe('# Title');
    await expect(runMarkdownToHtml('convert', '# Title')).resolves.toBe('# Title');
    await expect(runTool('invalid', '# Title')).rejects.toThrow('Unsupported action');
  });
});

describe('markdown-to-html lifecycle and ownership', () => {
  afterEach(() => {
    resetKeyboardEventManagerForTesting();
    resetToolPlatformKernelForTesting();
  });

  test('app factory remains idempotent per root', () => {
    const root = setupDom();
    const appA = createMarkdownToHtmlApp(root);
    const appB = createMarkdownToHtmlApp(root);
    expect(appA).toBe(appB);
  });

  test('kernel-backed create/init/destroy supports deterministic lifecycle', () => {
    const root = setupDom();
    const handle = create(root);

    expect(getToolPlatformKernel().getLifecycleState('markdown-to-html', root)).toBe('created');

    handle.init();
    expect(getToolPlatformKernel().getLifecycleState('markdown-to-html', root)).toBe('initialized');

    destroy(root);
    expect(getToolPlatformKernel().getLifecycleState('markdown-to-html', root)).toBe('missing');
  });

  test('listener cardinality remains one global keydown listener across mounted instances', () => {
    const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
    const rootA = setupDom();
    const rootB = setupDom();

    mountTool(create, rootA);
    mountTool(create, rootB);

    const keydownRegistrations = addEventListenerSpy.mock.calls
      .filter(([eventName]) => eventName === 'keydown');

    expect(keydownRegistrations).toHaveLength(1);
    expect(getKeyboardEventManager().getRegisteredHandlerCount()).toBe(2);
    expect(getKeyboardEventManager().getActiveGlobalListenerCount()).toBe(1);

    addEventListenerSpy.mockRestore();
  });

  test('shortcut routing stays isolated to focused root', async () => {
    const rootA = setupDom();
    const rootB = setupDom();
    init(rootA);
    init(rootB);

    const inputA = rootA.querySelector('#inputEditor');
    const inputB = rootB.querySelector('#inputEditor');
    const outputA = rootA.querySelector('#outputEditor');
    const outputB = rootB.querySelector('#outputEditor');

    inputA.value = 'left side';
    inputB.value = 'right side';
    rootA.querySelector('#convertBtn').click();
    rootB.querySelector('#convertBtn').click();
    await Promise.resolve();

    inputA.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, bubbles: true }));

    expect(inputA.value).toBe('');
    expect(outputA.value).toBe('');
    expect(inputB.value).toBe('right side');
    expect(outputB.value).toBe('right side');
  });

  test('remount stress has zero listener leaks after 50 cycles', async () => {
    const root = setupDom();

    for (let index = 0; index < 50; index += 1) {
      const handle = mountTool(create, root);
      const input = root.querySelector('#inputEditor');
      const output = root.querySelector('#outputEditor');

      input.focus();
      input.value = `iteration ${index}`;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
      // conversion runs async through the app API path
      // eslint-disable-next-line no-await-in-loop
      await Promise.resolve();
      expect(output.value).toBe(`iteration ${index}`);

      destroyTool(handle);
      expect(getKeyboardEventManager().getRegisteredHandlerCount()).toBe(0);
      expect(getKeyboardEventManager().getActiveGlobalListenerCount()).toBe(0);
    }
  });
});
