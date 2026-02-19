import { jest } from '@jest/globals';
import {
  buildDiffModel,
  initTextDiffApp,
  mountTextDiff,
  myersDiff,
  normalizeInput,
  serializeResult,
  summarize
} from '../../src/ToolNexus.Web/wwwroot/js/tools/text-diff.js';
import { createDiffView, queryTextDiffDom } from '../../src/ToolNexus.Web/wwwroot/js/tools/text-diff.dom.js';
import { getKeyboardEventManager, resetKeyboardEventManagerForTesting } from '../../src/ToolNexus.Web/wwwroot/js/tools/keyboard-event-manager.js';
import { getToolPlatformKernel, resetToolPlatformKernelForTesting } from '../../src/ToolNexus.Web/wwwroot/js/tools/tool-platform-kernel.js';

function createTextDiffRoot() {
  const root = document.createElement('article');
  root.dataset.tool = 'text-diff';
  root.innerHTML = `
    <button id="compareBtn" type="button">Compare</button>
    <button id="swapBtn" type="button">Swap</button>
    <button id="clearBtn" type="button">Clear</button>
    <button id="copyDiffBtn" type="button">Copy Diff</button>
    <button id="downloadDiffBtn" type="button">Download</button>
    <select id="viewModeSelect"><option value="side-by-side">Side by side</option><option value="inline">Unified</option></select>
    <select id="detailModeSelect"><option value="line">Line</option><option value="word">Word</option></select>
    <input type="checkbox" id="autoCompareToggle" />
    <input type="checkbox" id="scrollSyncToggle" checked />
    <input type="checkbox" id="trimTrailingToggle" />
    <input type="checkbox" id="ignoreWhitespaceToggle" />
    <input type="checkbox" id="ignoreCaseToggle" />
    <textarea id="leftInput">alpha\nbeta</textarea>
    <textarea id="rightInput">alpha\ngamma</textarea>
    <p id="diffSummary"></p>
    <p id="processingState" hidden></p>
    <div id="diffError" hidden></div>
    <div id="diffOutput"></div>`;
  document.body.appendChild(root);
  return root;
}

describe('text-diff logic', () => {
  test('normalization and diff model are deterministic', () => {
    expect(normalizeInput('A\r\nB\t', { trimTrailing: false, ignoreWhitespace: false, ignoreCase: false }).normalizedLines)
      .toEqual(['A', 'B    ']);

    const first = buildDiffModel('A\nB', 'A\nC', { detailMode: 'line', trimTrailing: false, ignoreWhitespace: false, ignoreCase: false });
    const second = buildDiffModel('A\nB', 'A\nC', { detailMode: 'line', trimTrailing: false, ignoreWhitespace: false, ignoreCase: false });

    expect(first).toEqual(second);
    expect(summarize(first)).toEqual({ added: 0, removed: 0, changed: 1 });
    expect(serializeResult(first)).toContain('~ B');
    expect(myersDiff(['a', 'b'], ['a', 'c']).some((row) => row.type === 'remove' || row.type === 'add')).toBe(true);
  });

  test('tokenized modified rows render for word and char detail modes', () => {
    const wordRows = buildDiffModel('hello world', 'hello there', {
      detailMode: 'word', trimTrailing: false, ignoreWhitespace: false, ignoreCase: false
    });
    const charRows = buildDiffModel('abc', 'adc', {
      detailMode: 'char', trimTrailing: false, ignoreWhitespace: false, ignoreCase: false
    });

    expect(wordRows.some((row) => row.tokenDiff)).toBe(true);
    expect(charRows.some((row) => row.tokenDiff)).toBe(true);
  });
});

describe('text-diff dom helpers', () => {
  test('creates side-by-side and inline views with cleanup support', () => {
    document.body.innerHTML = '';
    const root = createTextDiffRoot();
    const dom = queryTextDiffDom(root);
    const rows = buildDiffModel('a\nb', 'a\nc', {
      detailMode: 'word', trimTrailing: false, ignoreWhitespace: false, ignoreCase: false
    });

    const side = createDiffView(rows, 'side-by-side', dom.scrollSyncToggle);
    expect(side.node.querySelectorAll('.diff-pane').length).toBe(2);
    side.cleanup();

    const inline = createDiffView(rows, 'inline', dom.scrollSyncToggle);
    expect(inline.node.querySelectorAll('.diff-row').length).toBeGreaterThan(0);
    inline.cleanup();
  });
});

describe('text-diff lifecycle', () => {
  beforeEach(() => {
    resetKeyboardEventManagerForTesting();
    resetToolPlatformKernelForTesting();
    document.body.innerHTML = '';
    global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    global.navigator.clipboard = { writeText: jest.fn().mockResolvedValue(undefined) };
  });

  afterEach(() => {
    resetKeyboardEventManagerForTesting();
    resetToolPlatformKernelForTesting();
  });

  test('idempotent mount and lifecycle cleanup are stable', () => {
    const root = createTextDiffRoot();

    const first = mountTextDiff(root);
    const second = mountTextDiff(root);

    expect(first).toBe(second);
    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(1);
    expect(getToolPlatformKernel().getLifecycleState('text-diff', root)).toBe('initialized');

    first.destroy();
    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(0);
  });

  test('keyboard shortcut is scoped and manager-owned', () => {
    const primary = createTextDiffRoot();
    const secondary = createTextDiffRoot();
    secondary.querySelector('#leftInput').value = 'one';
    secondary.querySelector('#rightInput').value = 'two';

    mountTextDiff(primary);
    mountTextDiff(secondary);

    const keyboard = getKeyboardEventManager();
    expect(keyboard.getActiveGlobalListenerCount()).toBe(1);
    expect(keyboard.getRegisteredHandlerCount()).toBe(2);

    const leftInput = primary.querySelector('#leftInput');
    leftInput.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, bubbles: true }));

    expect(primary.querySelector('#leftInput').value).toBe('');
    expect(secondary.querySelector('#leftInput').value).toBe('one');
  });

  test('compare/copy/download flows execute without errors', async () => {
    const root = createTextDiffRoot();
    root.querySelector('#viewModeSelect').value = 'inline';
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = jest.fn(() => 'blob:test');
    URL.revokeObjectURL = jest.fn();
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    mountTextDiff(root);
    root.querySelector('#compareBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 10));
    root.querySelector('#copyDiffBtn').click();
    root.querySelector('#downloadDiffBtn').click();

    expect(root.querySelector('#diffOutput').children.length).toBeGreaterThan(0);
    expect(global.navigator.clipboard.writeText).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();

    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    clickSpy.mockRestore();
  });

  test('remount stress x50 does not leak kernel or keyboard handlers', () => {
    for (let index = 0; index < 50; index += 1) {
      const root = createTextDiffRoot();
      const handle = mountTextDiff(root);
      handle.destroy();
      root.remove();
    }

    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(0);
    expect(getKeyboardEventManager().getRegisteredHandlerCount()).toBe(0);
    expect(getKeyboardEventManager().getActiveGlobalListenerCount()).toBe(0);
  });

  test('safe no-op init when root is missing', () => {
    document.body.innerHTML = '<div></div>';
    expect(() => initTextDiffApp(document)).not.toThrow();
  });
});
